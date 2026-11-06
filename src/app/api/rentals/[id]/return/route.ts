import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Shoe, Sale } from "@/models";
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
    const { paymentMethod = "CASH" } = body;

    await connectDB();
    const session = await RentalSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Rental session not found" }, { status: 404 });
    }

    if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This rental session is already completed and returned." },
        { status: 400 }
      );
    }

    // 1. Release the shoe back to AVAILABLE
    const shoe = await Shoe.findOne({ shoeId: session.shoeId });
    if (shoe) {
      shoe.status = "AVAILABLE";
      await shoe.save();
    }

    // 2. Mark session completed and settled
    session.status = "COMPLETED";
    session.actualReturnTime = new Date();
    session.paymentStatus = "PAID";
    session.paymentMethod = paymentMethod;
    await session.save();

    // 3. Mark any attached Tab snacks as PAID
    await Sale.updateMany(
      { rentalSessionId: session._id, paymentStatus: "UNPAID" },
      { $set: { paymentStatus: "PAID", paymentMethod } }
    );

    return NextResponse.json({
      success: true,
      message: `Shoe ${session.shoeId} successfully returned and marked AVAILABLE. Session completed.`,
      session,
    });
  } catch (error) {
    console.error("Return shoe error:", error);
    return NextResponse.json({ error: "Failed to return shoe" }, { status: 500 });
  }
}

