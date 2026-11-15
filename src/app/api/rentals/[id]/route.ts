import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession } from "@/models";
import { getSession } from "@/lib/auth";
import { parseEthiopiaTimeString } from "@/lib/dateUtils";

export async function PATCH(
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
      durationMinutes,
      paymentStatus,
      paymentMethod,
      customerName,
      customerPhone,
      notes,
      startTime,
    } = body;

    await connectDB();
    const session = await RentalSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Rental session not found" }, { status: 404 });
    }

    // 1. Duration Update (e.g. reduce from 60 to 30, or increase to 60)
    if (durationMinutes !== undefined && [30, 60].includes(Number(durationMinutes))) {
      const newDuration = Number(durationMinutes);
      session.baseDurationMinutes = newDuration;

      const isWeekend = session.pricingType === "WEEKEND";
      let basePrice = 0;
      if (newDuration === 30) {
        basePrice = isWeekend ? 200 : 150;
      } else {
        basePrice = isWeekend ? 300 : 250;
      }

      session.basePrice = basePrice;
      session.totalRentalFee = basePrice + (session.extensionPrice || 0);

      // Recalculate totalMinutes
      const extensionMinutes = Array.isArray(session.extensions)
        ? session.extensions.reduce((acc: number, ext: { addedMinutes?: number }) => acc + (ext.addedMinutes || 0), 0)
        : 0;
      const gracePeriod = session.gracePeriodMinutes || 5;
      const totalMinutes = newDuration + gracePeriod + extensionMinutes;
      session.totalMinutes = totalMinutes;
    }

    // 2. Start Time Update (Locked to Ethiopia Time EAT UTC+3)
    if (startTime) {
      const parsedStart = parseEthiopiaTimeString(startTime, session.startedAt || new Date());
      if (parsedStart) {
        session.startedAt = parsedStart;
      }
    }

    // Always keep expectedEndTime synchronized with startedAt and totalMinutes
    const startTimeMs = new Date(session.startedAt).getTime();
    session.expectedEndTime = new Date(startTimeMs + (session.totalMinutes || 35) * 60 * 1000);

    // 2. Payment Status & Method Update
    if (paymentStatus) {
      session.paymentStatus = paymentStatus;
      if (paymentStatus === "PAID" && paymentMethod) {
        session.paymentMethod = paymentMethod;
      }
    } else if (paymentMethod) {
      session.paymentMethod = paymentMethod;
    }

    // 3. Customer Info & Notes
    if (customerName !== undefined) {
      session.customerName = customerName.trim() || "Skater";
    }
    if (customerPhone !== undefined) {
      session.customerPhone = customerPhone.trim();
    }
    if (notes !== undefined) {
      session.notes = notes;
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: "Rental session updated successfully",
      session,
    });
  } catch (error) {
    console.error("Update rental error:", error);
    return NextResponse.json({ error: "Failed to update rental session" }, { status: 500 });
  }
}

