import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Shoe, Sale } from "@/models";
import { getSession } from "@/lib/auth";

// GET /api/rentals - List active sessions (sorted by expected finish time) with attached tab totals
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIVE";

    const query: Record<string, unknown> = {};
    if (status !== "ALL") {
      query.status = status;
    }

    // Default sort: earliest expectedEndTime first
    const sessions = await RentalSession.find(query).sort({ expectedEndTime: 1 }).lean();

    // Fetch attached unpaid tab snack sales for these sessions
    const sessionIds = sessions.map((s) => s._id);
    const tabSales = await Sale.find({
      rentalSessionId: { $in: sessionIds },
      paymentStatus: "UNPAID",
    }).lean();

    // Map tab sales to their respective sessions
    const sessionsWithTabs = sessions.map((session) => {
      const attachedSales = tabSales.filter(
        (sale) => sale.rentalSessionId?.toString() === session._id.toString()
      );
      const tabTotal = attachedSales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
      const tabItemsCount = attachedSales.reduce(
        (acc, sale) => acc + (sale.items?.reduce((iAcc, item) => iAcc + item.quantity, 0) || 0),
        0
      );

      return {
        ...session,
        tabTotal,
        tabItemsCount,
        attachedSales,
      };
    });

    return NextResponse.json({ sessions: sessionsWithTabs });
  } catch (error) {
    console.error("Fetch rentals error:", error);
    return NextResponse.json({ error: "Failed to fetch rental sessions" }, { status: 500 });
  }
}

// POST /api/rentals - Start a new rental session
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      shoeId,
      customerName = "Skater",
      customerPhone = "",
      durationMinutes, // 30 or 60
      paymentStatus = "UNPAID", // "PAID" | "UNPAID"
      paymentMethod,           // "CASH" | "TELEBIRR" | "CBE"
      notes = "",
    } = body;

    if (!shoeId || !durationMinutes) {
      return NextResponse.json(
        { error: "Shoe ID and duration are required" },
        { status: 400 }
      );
    }

    if (![30, 60].includes(Number(durationMinutes))) {
      return NextResponse.json(
        { error: "Duration must be either 30 or 60 minutes" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Verify Shoe exists and is AVAILABLE
    const formattedShoeId = shoeId.trim().toUpperCase();
    const shoe = await Shoe.findOne({ shoeId: formattedShoeId });
    if (!shoe) {
      return NextResponse.json({ error: `Shoe "${formattedShoeId}" not found` }, { status: 404 });
    }

    if (shoe.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `Shoe "${formattedShoeId}" is currently ${shoe.status} and cannot be rented.` },
        { status: 400 }
      );
    }

    // 2. Pricing & Timing Calculations
    const now = new Date();
    const isWeekend = [0, 6].includes(now.getDay()); // 0 = Sunday, 6 = Saturday
    const baseDuration = Number(durationMinutes);
    const gracePeriodMinutes = 5; // Automatic +5 min buffer
    const totalMinutes = baseDuration + gracePeriodMinutes;

    let basePrice = 0;
    if (baseDuration === 30) {
      basePrice = isWeekend ? 200 : 150;
    } else {
      basePrice = isWeekend ? 300 : 250;
    }

    const expectedEndTime = new Date(now.getTime() + totalMinutes * 60 * 1000);

    // 3. Create Rental Session
    const rental = await RentalSession.create({
      shoeId: shoe.shoeId,
      shoeSize: shoe.size,
      skateType: shoe.type || "INLINE",
      shoeColor: shoe.color || "",
      customerName: customerName.trim() || "Skater",
      customerPhone: customerPhone.trim(),
      baseDurationMinutes: baseDuration,
      gracePeriodMinutes,
      totalMinutes,
      startedAt: now,
      expectedEndTime,
      basePrice,
      extensionPrice: 0,
      totalRentalFee: basePrice,
      pricingType: isWeekend ? "WEEKEND" : "WEEKDAY",
      status: "ACTIVE",
      paymentStatus: paymentStatus === "PAID" ? "PAID" : "UNPAID",
      paymentMethod: paymentStatus === "PAID" ? paymentMethod || "CASH" : undefined,
      registeredByStaffId: sessionUser.userId,
      notes,
    });

    // 4. Update Shoe status to RENTED
    shoe.status = "RENTED";
    await shoe.save();

    return NextResponse.json(
      {
        success: true,
        message: "Rental session started successfully",
        rental,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Start rental error:", error);
    return NextResponse.json({ error: "Failed to start rental session" }, { status: 500 });
  }
}
