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
    const { status, notes } = body;

    await connectDB();
    const shoe = await Shoe.findById(id);
    if (!shoe) {
      return NextResponse.json({ error: "Shoe not found" }, { status: 404 });
    }

    if (status) {
      shoe.status = status;
    }
    if (typeof notes === "string") {
      shoe.notes = notes;
    }

    await shoe.save();

    return NextResponse.json({ success: true, shoe });
  } catch (error) {
    console.error("Update shoe error:", error);
    return NextResponse.json({ error: "Failed to update shoe" }, { status: 500 });
  }
}

