import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession } from "@/models";
import { getSession } from "@/lib/auth";
import { format12HourTime } from "@/lib/utils";

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
      addedMinutes = 30,
      paymentStatus = "PAID", // "PAID" | "UNPAID"
      paymentMethod = "CASH", // "CASH" | "TELEBIRR" | "CBE"
    } = body;

    const minutesToAdd = Number(addedMinutes);
    if (isNaN(minutesToAdd) || minutesToAdd === 0) {
      return NextResponse.json(
        { error: "A valid positive or negative minute duration is required." },
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

    // Determine extension/reduction fee based on the session's pricing type
    const isWeekend = session.pricingType === "WEEKEND";
    let additionalFee = 0;
    const absMin = Math.abs(minutesToAdd);

    if (absMin === 30) {
      additionalFee = isWeekend ? 200 : 150;
    } else if (absMin === 60) {
      additionalFee = isWeekend ? 300 : 250;
    } else if (absMin === 15) {
      additionalFee = isWeekend ? 100 : 75;
    } else {
      const base30 = isWeekend ? 200 : 150;
      additionalFee = Math.round((absMin / 30) * base30);
    }

    if (minutesToAdd < 0) {
      additionalFee = -additionalFee;
    }

    const now = new Date();
    const nowMs = now.getTime();
    const currentEndMs = new Date(session.expectedEndTime).getTime();
    let newEndTime: Date;

    // Requirement #3: If adding time and skater is currently OVERDUE,
    // start the additional time fresh from NOW so overdue time is NOT deducted!
    if (minutesToAdd > 0) {
      if (nowMs > currentEndMs) {
        // Skater is overdue: grant full minutesToAdd starting from NOW
        newEndTime = new Date(nowMs + minutesToAdd * 60 * 1000);
        const overdueMinutes = Math.max(0, Math.round((nowMs - currentEndMs) / 60000));
        session.totalMinutes = (session.totalMinutes || 35) + minutesToAdd + overdueMinutes;
      } else {
        // Skater still has time left: append to current expectedEndTime
        newEndTime = new Date(currentEndMs + minutesToAdd * 60 * 1000);
        session.totalMinutes = (session.totalMinutes || 35) + minutesToAdd;
      }

      // Update fees
      session.extensionPrice = (session.extensionPrice || 0) + additionalFee;
      session.totalRentalFee = (session.totalRentalFee || session.basePrice) + additionalFee;

      // Requirement #1: Update payment status and payment channel
      if (paymentStatus === "PAID") {
        session.paymentStatus = "PAID";
        session.paymentMethod = ["CASH", "TELEBIRR", "CBE"].includes(paymentMethod)
          ? paymentMethod
          : "CASH";
      } else {
        session.paymentStatus = "UNPAID";
      }

      session.extensions.push({
        addedMinutes: minutesToAdd,
        additionalFee,
        paymentStatus: paymentStatus === "PAID" ? "PAID" : "UNPAID",
        paymentMethod: paymentStatus === "PAID" ? session.paymentMethod : undefined,
        requestedAt: now,
      });
    } else {
      // Requirement #2: Decreasing time (minus)
      const startMs = new Date(session.startedAt).getTime();
      const minEndMs = startMs + 15 * 60 * 1000;
      const targetEndMs = currentEndMs + minutesToAdd * 60 * 1000;
      newEndTime = new Date(Math.max(minEndMs, targetEndMs));

      const newTotalMin = Math.round((newEndTime.getTime() - startMs) / 60000);
      session.totalMinutes = Math.max(15, newTotalMin);

      if (session.extensionPrice > 0) {
        session.extensionPrice = Math.max(0, session.extensionPrice + additionalFee);
      }
      session.totalRentalFee = Math.max(session.basePrice, (session.totalRentalFee || session.basePrice) + additionalFee);

      session.extensions.push({
        addedMinutes: minutesToAdd,
        additionalFee,
        paymentStatus: "PAID",
        requestedAt: now,
      });
    }

    session.expectedEndTime = newEndTime;
    await session.save();

    const formattedFinish = format12HourTime(newEndTime);

    return NextResponse.json({
      success: true,
      message: minutesToAdd > 0
        ? `Added +${minutesToAdd}m. New finish time: ${formattedFinish} (${paymentStatus === "PAID" ? `Paid via ${session.paymentMethod}` : "Pay on Return"})`
        : `Decreased by ${minutesToAdd}m. New finish time: ${formattedFinish}`,
      session,
    });
  } catch (error) {
    console.error("Extend session error:", error);
    return NextResponse.json({ error: "Failed to extend rental session" }, { status: 500 });
  }
}

