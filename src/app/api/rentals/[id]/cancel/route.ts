import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Shoe, Sale, Product } from "@/models";
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
    const body = await req.json().catch(() => ({}));
    const { cancelReason = "Cancelled by staff", voidAttachedTab = true } = body;

    await connectDB();
    const session = await RentalSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Rental session not found" }, { status: 404 });
    }

    if (session.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This rental session is already cancelled." },
        { status: 400 }
      );
    }

    // 1. Release assigned shoe back to AVAILABLE
    const shoe = await Shoe.findOne({ shoeId: session.shoeId });
    if (shoe) {
      shoe.status = "AVAILABLE";
      await shoe.save();
    }

    // 2. Void or restore unpaid snack tab items attached to this session
    if (voidAttachedTab) {
      const tabSales = await Sale.find({
        rentalSessionId: session._id,
        paymentStatus: "UNPAID",
      });

      for (const sale of tabSales) {
        // Restore inventory for each item
        if (Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.productId && item.quantity) {
              await Product.findByIdAndUpdate(item.productId, {
                $inc: { currentStock: item.quantity },
              });
            }
          }
        }
        await Sale.findByIdAndDelete(sale._id);
      }
    }

    // 3. Mark session as CANCELLED
    session.status = "CANCELLED";
    session.actualReturnTime = new Date();
    session.notes = session.notes
      ? `${session.notes} | Cancelled: ${cancelReason}`
      : `Cancelled: ${cancelReason}`;

    // If unpaid, keep 0 fee so register doesn't expect payment for cancelled session
    if (session.paymentStatus === "UNPAID") {
      session.totalRentalFee = 0;
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: `Rental session cancelled. Shoe ${session.shoeId} is now AVAILABLE.`,
      session,
    });
  } catch (error) {
    console.error("Cancel rental error:", error);
    return NextResponse.json({ error: "Failed to cancel rental session" }, { status: 500 });
  }
}

