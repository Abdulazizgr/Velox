import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession, hashPassword } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized: Only the rink owner can update staff" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { isActive, newPassword } = body;

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Prevent owner from disabling themselves
    if (targetUser._id.toString() === session.userId && isActive === false) {
      return NextResponse.json(
        { error: "Owner cannot deactivate their own account" },
        { status: 400 }
      );
    }

    if (typeof isActive === "boolean") {
      targetUser.isActive = isActive;
    }

    if (newPassword && newPassword.length >= 4) {
      targetUser.passwordHash = await hashPassword(newPassword);
    }

    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: "Staff member updated successfully",
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        phone: targetUser.phone,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

