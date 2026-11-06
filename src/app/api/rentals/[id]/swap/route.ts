import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Shoe } from "@/models";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { newShoeId, reason = "Customer uncomfortable / size adjustment" } = body;

    if (!newShoeId) {
      return NextResponse.json({ error: "New Shoe ID is required" }, { status: 400 });
    }

    await connectDB();
    const session = await RentalSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Rental session not found" }, { status: 404 });
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cannot swap shoes for an inactive or completed session" },
        { status: 400 }
      );
    }

    const formattedNewId = newShoeId.trim().toUpperCase();
    if (formattedNewId === session.shoeId) {
      return NextResponse.json(
        { error: "New Shoe ID cannot be the same as currently assigned shoe" },
        { status: 400 }
      );
    }

    // Verify new shoe is AVAILABLE
    const newShoe = await Shoe.findOne({ shoeId: formattedNewId });
    if (!newShoe) {
      return NextResponse.json(
        { error: `New shoe "${formattedNewId}" does not exist in inventory` },
        { status: 404 }
      );
    }

    if (newShoe.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `New shoe "${formattedNewId}" is ${newShoe.status} and cannot be assigned` },
        { status: 400 }
      );
    }

    // Release old shoe
    const oldShoe = await Shoe.findOne({ shoeId: session.shoeId });
    if (oldShoe) {
      oldShoe.status = "AVAILABLE";
      await oldShoe.save();
    }

    // Mark new shoe as RENTED
    newShoe.status = "RENTED";
    await newShoe.save();

    // Log the swap on the session
    session.shoeSwaps.push({
      oldShoeId: session.shoeId,
      newShoeId: formattedNewId,
      swappedAt: new Date(),
      reason,
    });

    session.shoeId = newShoe.shoeId;
    session.shoeSize = newShoe.size;
    await session.save();

    return NextResponse.json({
      success: true,
      message: `Shoe successfully swapped to ${formattedNewId}`,
      session,
    });
  } catch (error) {
    console.error("Swap shoe error:", error);
    return NextResponse.json({ error: "Failed to swap shoe" }, { status: 500 });
  }
}
