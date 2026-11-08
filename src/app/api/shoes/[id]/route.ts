import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Shoe } from "@/models/Shoe";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { shoeId, size, type, status, notes } = body;

    await connectDB();
    const shoe = await Shoe.findById(id);
    if (!shoe) {
      return NextResponse.json({ error: "Shoe not found" }, { status: 404 });
    }

    if (shoeId && typeof shoeId === "string") {
      shoe.shoeId = shoeId.trim();
    }
    if (size != null && !isNaN(Number(size))) {
      shoe.size = Number(size);
    }
    if (type === "INLINE" || type === "QUAD") {
      shoe.type = type;
    }
    if (status) {
      shoe.status = status;
    }
    if (typeof notes === "string") {
      shoe.notes = notes.trim();
    }

    await shoe.save();

    return NextResponse.json({ success: true, shoe });
  } catch (error) {
    console.error("Update shoe error:", error);
    return NextResponse.json({ error: "Failed to update shoe" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized: Owner only" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    const shoe = await Shoe.findByIdAndDelete(id);
    if (!shoe) {
      return NextResponse.json({ error: "Shoe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Shoe asset deleted" });
  } catch (error) {
    console.error("Delete shoe error:", error);
    return NextResponse.json({ error: "Failed to delete shoe" }, { status: 500 });
  }
}
