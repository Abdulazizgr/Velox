import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Shoe, Sale } from "@/models";
import { getSession } from "@/lib/auth";
import { getEthiopiaDayBounds } from "@/lib/dateUtils";

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
    const {
      paymentMethod = "CASH",
      unpaidInHouse = false,
      customSettledAmount,
    } = body;

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

    // Role check: Only the owner can return or settle overnight / past-day rentals
    const { start: startOfToday } = getEthiopiaDayBounds();
    const isPastDay = new Date(session.startedAt) < startOfToday;
    if (isPastDay && sessionUser.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the owner can settle or return rentals from previous days." },
        { status: 403 }
      );
    }

    const now = new Date();

    // 1. Release the shoe back to AVAILABLE if not already released and not own skates
    if (!session.hasOwnSkates) {
      const shoe = await Shoe.findOne({ shoeId: session.shoeId });
      if (shoe) {
        shoe.status = "AVAILABLE";
        await shoe.save();
      }
    }

    // 2. Custom price on return (Requirement #3)
    if (customSettledAmount !== undefined && customSettledAmount !== null && customSettledAmount !== "" && !isNaN(Number(customSettledAmount))) {
      session.totalRentalFee = Math.max(0, Number(customSettledAmount));
    }

    // 3. Option B: Skater returns shoe only but hasn't paid yet (waiting / resting in house) (Requirement #4)
    if (unpaidInHouse) {
      session.isShoeReturned = true;
      session.shoeReturnedAt = now;
      session.status = "RETURNED_UNPAID";
      session.paymentStatus = "UNPAID";
      await session.save();

      return NextResponse.json({
        success: true,
        message: `Shoe ${session.shoeId} returned to shelf & marked AVAILABLE. Customer kept in 'Unpaid Returns' tab until settled.`,
        session,
      });
    }

    // 4. Option A: Full return & settlement
    session.isShoeReturned = true;
    if (!session.shoeReturnedAt) {
      session.shoeReturnedAt = now;
    }
    session.actualReturnTime = now;
    session.status = "COMPLETED";
    session.paymentStatus = "PAID";
    if (!session.paymentMethod || session.paymentStatus !== "PAID") {
      session.paymentMethod = paymentMethod;
    }
    await session.save();

    // 5. Mark any attached unpaid Tab snacks as PAID
    await Sale.updateMany(
      { rentalSessionId: session._id, paymentStatus: "UNPAID" },
      { $set: { paymentStatus: "PAID", paymentMethod } }
    );

    // 6. Settle payment for any linked sessions this skater was paying for (Requirement #5)
    // IMPORTANT: When Person A pays for Person B:
    // - Person B's bill is marked PAID.
    // - If Person B already returned their shoe (e.g. resting in house, status RETURNED_UNPAID),
    //   then Person B's session is now fully COMPLETED.
    // - If Person B is STILL skating on the floor (isShoeReturned is false),
    //   Person B remains ACTIVE with their shoe RENTED, but marked PAID so staff knows they are covered!
    if (Array.isArray(session.payingForSessionIds) && session.payingForSessionIds.length > 0) {
      for (const linkedId of session.payingForSessionIds) {
        const linkedSession = await RentalSession.findById(linkedId);
        if (linkedSession && linkedSession.status !== "COMPLETED") {
          linkedSession.paymentStatus = "PAID";
          linkedSession.paymentMethod = paymentMethod;

          if (linkedSession.isShoeReturned) {
            // Shoe was already returned previously: session is now completely finished
            linkedSession.status = "COMPLETED";
            if (!linkedSession.actualReturnTime) {
              linkedSession.actualReturnTime = now;
            }
          } else {
            // Skater is still on the floor skating!
            // Keep them ACTIVE, keep shoe RENTED
            linkedSession.status = "ACTIVE";
          }
          await linkedSession.save();

          await Sale.updateMany(
            { rentalSessionId: linkedSession._id, paymentStatus: "UNPAID" },
            { $set: { paymentStatus: "PAID", paymentMethod } }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Shoe ${session.shoeId} successfully returned and marked AVAILABLE. Session settled.`,
      session,
    });
  } catch (error) {
    console.error("Return shoe error:", error);
    return NextResponse.json({ error: "Failed to return shoe" }, { status: 500 });
  }
}

