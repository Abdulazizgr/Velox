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
    if (session.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Only owners can update shoes" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { shoeId, size, type, status, notes, forceRelease } = body;

    await connectDB();
    const shoe = await Shoe.findById(id);
    if (!shoe) {
      return NextResponse.json({ error: "Shoe not found" }, { status: 404 });
    }

    if (status === "RENTED") {
      return NextResponse.json(
        { error: "Cannot manually set shoe to RENTED. Rental sessions must be started on the Rental Board." },
        { status: 400 }
      );
    }

    if (shoe.status === "RENTED" && status && status !== "RENTED" && !forceRelease) {
      return NextResponse.json(
        { error: "This shoe is currently out with a skater. Please complete or cancel the rental on the Rental Board, or use Emergency Release." },
        { status: 400 }
      );
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
    if (status && ["AVAILABLE", "MAINTENANCE", "RETIRED"].includes(status)) {
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
    const shoe = await Shoe.findById(id);
    if (!shoe) {
      return NextResponse.json({ error: "Shoe not found" }, { status: 404 });
    }

    if (shoe.status === "RENTED") {
      return NextResponse.json(
        { error: "Cannot delete a shoe that is currently rented. Return or cancel the rental first." },
        { status: 400 }
      );
    }

    await Shoe.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Shoe asset deleted" });
  } catch (error) {
    console.error("Delete shoe error:", error);
    return NextResponse.json({ error: "Failed to delete shoe" }, { status: 500 });
  }
}
