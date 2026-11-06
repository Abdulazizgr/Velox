import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession, hashPassword, normalizePhoneNumber } from "@/lib/auth";

// GET /api/staff - List all staff (Owner only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized: Only the owner can view staff" },
        { status: 403 }
      );
    }

    await connectDB();
    const staffMembers = await User.find({})
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return NextResponse.json({ staff: staffMembers });
  } catch (error) {
    console.error("Fetch staff error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

// POST /api/staff - Register new staff (Owner only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized: Only the owner can register staff" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, password, role = "STAFF" } = body;

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: "Name, phone number, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    await connectDB();
    const normalizedPhone = normalizePhoneNumber(phone);

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this phone number already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      phone: normalizedPhone,
      passwordHash,
      role: role === "OWNER" ? "OWNER" : "STAFF",
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staff member registered successfully",
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register staff error:", error);
    return NextResponse.json({ error: "Failed to register staff" }, { status: 500 });
  }
}

