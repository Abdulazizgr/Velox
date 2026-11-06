import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Shoe } from "@/models/Shoe";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const shoes = await Shoe.find({}).sort({ size: 1, shoeId: 1 }).lean();
    return NextResponse.json({ shoes });
  } catch (error) {
    console.error("Fetch shoes error:", error);
    return NextResponse.json({ error: "Failed to fetch shoes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { shoeId, size, type, color, notes } = body;

    if (!shoeId || !size) {
      return NextResponse.json(
        { error: "Shoe ID and size are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const formattedShoeId = shoeId.trim().toUpperCase();

    const existing = await Shoe.findOne({ shoeId: formattedShoeId });
    if (existing) {
      return NextResponse.json(
        { error: `Shoe with ID "${formattedShoeId}" already exists.` },
        { status: 409 }
      );
    }

    const skateType = type === "QUAD" ? "QUAD" : "INLINE";
    const shoeColor = typeof color === "string" ? color.trim() : "";

    const newShoe = await Shoe.create({
      shoeId: formattedShoeId,
      size: Number(size),
      type: skateType,
      color: shoeColor,
      status: "AVAILABLE",
      notes: notes || "",
    });

    return NextResponse.json({ success: true, shoe: newShoe }, { status: 201 });
  } catch (error) {
    console.error("Create shoe error:", error);
    return NextResponse.json({ error: "Failed to create shoe" }, { status: 500 });
  }
}

