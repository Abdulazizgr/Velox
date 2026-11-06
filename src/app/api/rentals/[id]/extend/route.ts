import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession } from "@/models";
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
    const { addedMinutes = 30 } = body;

    const minutesToAdd = Number(addedMinutes);
    if (![30, 60].includes(minutesToAdd)) {
      return NextResponse.json(
        { error: "Can only extend by 30 or 60 minutes" },
        { status: 400 }
      );
    }

    await connectDB();
    const session = await RentalSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Rental session not found" }, { status: 404 });
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "This session has already ended or been returned. You must start a new session.",
        },
        { status: 400 }
      );
    }

    // Determine extension fee based on the session's pricing type
    const isWeekend = session.pricingType === "WEEKEND";
    let additionalFee = 0;
    if (minutesToAdd === 30) {
      additionalFee = isWeekend ? 200 : 150;
    } else {
      additionalFee = isWeekend ? 300 : 250;
    }

    // Extend expectedEndTime from current expectedEndTime
    const newEndTime = new Date(
      new Date(session.expectedEndTime).getTime() + minutesToAdd * 60 * 1000
    );

    session.expectedEndTime = newEndTime;
    session.totalMinutes += minutesToAdd;
    session.extensionPrice += additionalFee;
    session.totalRentalFee += additionalFee;

    // If session was previously paid, mark as UNPAID for the extension delta unless prepaid
    if (session.paymentStatus === "PAID") {
      // Mark unpaid for the extension balance
      session.paymentStatus = "UNPAID";
    }

    session.extensions.push({
      addedMinutes: minutesToAdd,
      additionalFee,
      requestedAt: new Date(),
    });

    await session.save();

    return NextResponse.json({
      success: true,
      message: `Session extended by +${minutesToAdd} minutes. New finish time: ${newEndTime.toLocaleTimeString()}`,
      session,
    });
  } catch (error) {
    console.error("Extend session error:", error);
    return NextResponse.json({ error: "Failed to extend rental session" }, { status: 500 });
  }
}

