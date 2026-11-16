import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Shoe, Sale } from "@/models";
import { getSession } from "@/lib/auth";
import { parseEthiopiaTimeString } from "@/lib/dateUtils";

// GET /api/rentals - List sessions with optional filters (todayOnly, date range, search) and attached tab totals
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIVE";
    const todayOnly = searchParams.get("todayOnly") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const sortBy = searchParams.get("sortBy") || "expectedEndTime";

    const query: Record<string, unknown> = {};

    if (status !== "ALL") {
      query.status = status;
    }

    // Date filtering
    if (todayOnly) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // If active sessions are requested, include currently active and returned-unpaid sessions regardless of start time
      if (status === "ACTIVE") {
        query.$or = [
          { status: "ACTIVE" },
          { status: "RETURNED_UNPAID" },
          { startedAt: { $gte: startOfDay, $lte: endOfDay } },
        ];
      } else if (status !== "ALL") {
        query.status = status;
        query.startedAt = { $gte: startOfDay, $lte: endOfDay };
      } else {
        query.startedAt = { $gte: startOfDay, $lte: endOfDay };
      }
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query.startedAt = { $gte: s, $lte: e };
    } else if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      query.startedAt = { $gte: s };
    }

    // Search query by customer name, phone, or shoe ID
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { shoeId: searchRegex },
      ];
    }

    // Sort order: history defaults to createdAt descending, board to expectedEndTime ascending
    const sortOption: Record<string, 1 | -1> =
      sortBy === "createdAt"
        ? { createdAt: -1 }
        : sortBy === "startedAt"
        ? { startedAt: -1 }
        : { expectedEndTime: 1 };

    const sessions = await RentalSession.find(query).sort(sortOption).lean();

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
      startTime,               // optional custom start time (e.g. "14:30" or ISO string)
      hasOwnSkates = false,
    } = body;

    if ((!shoeId && !hasOwnSkates) || !durationMinutes) {
      return NextResponse.json(
        { error: "Shoe selection and duration are required" },
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

    let shoeDoc: InstanceType<typeof Shoe> | null = null;
    let formattedShoeId = "";
    let shoeSize = 0;
    let skateType: "INLINE" | "QUAD" = "QUAD";
    let isExtended = false;
    let extendedType: "EXTENDED_SMALL" | "EXTENDED_MEDIUM" | "EXTENDED_LARGE" | undefined = undefined;

    if (hasOwnSkates) {
      formattedShoeId = shoeId?.trim() ? shoeId.trim().toUpperCase() : "OWN-SKATES";
      shoeSize = 0;
    } else {
      // 1. Verify Shoe exists and is AVAILABLE
      formattedShoeId = shoeId.trim().toUpperCase();
      shoeDoc = await Shoe.findOne({ shoeId: formattedShoeId });
      if (!shoeDoc) {
        return NextResponse.json({ error: `Shoe "${formattedShoeId}" not found` }, { status: 404 });
      }

      if (shoeDoc.status !== "AVAILABLE") {
        return NextResponse.json(
          { error: `Shoe "${formattedShoeId}" is currently ${shoeDoc.status} and cannot be rented.` },
          { status: 400 }
        );
      }
      shoeSize = shoeDoc.size;
      skateType = shoeDoc.type || "QUAD";
      isExtended = shoeDoc.isExtended || false;
      extendedType = shoeDoc.extendedType;
    }

    // 2. Pricing & Timing Calculations (Locked to Ethiopia Time EAT UTC+3)
    const now = new Date();
    let sessionStart = now;

    if (startTime) {
      const parsedStart = parseEthiopiaTimeString(startTime, now);
      if (parsedStart) {
        sessionStart = parsedStart;
      }
    }

    const isWeekend = [0, 6].includes(sessionStart.getDay()); // 0 = Sunday, 6 = Saturday
    const baseDuration = Number(durationMinutes);
    const gracePeriodMinutes = 5; // Automatic +5 min buffer
    const totalMinutes = baseDuration + gracePeriodMinutes;

    let basePrice = 0;
    if (hasOwnSkates) {
      // Requirement #6: 1 hour (60m) is 100 ETB minus; 30m is 50 ETB minus from standard shoe rate
      if (baseDuration === 30) {
        basePrice = Math.max(0, (isWeekend ? 200 : 150) - 50); // 100 on weekday, 150 on weekend
      } else {
        basePrice = Math.max(0, (isWeekend ? 300 : 250) - 100); // 150 on weekday, 200 on weekend
      }
    } else {
      if (baseDuration === 30) {
        basePrice = isWeekend ? 200 : 150;
      } else {
        basePrice = isWeekend ? 300 : 250;
      }
    }

    const expectedEndTime = new Date(sessionStart.getTime() + totalMinutes * 60 * 1000);

    // 3. Create Rental Session
    const rental = await RentalSession.create({
      shoeId: formattedShoeId,
      shoeSize,
      skateType,
      isExtended,
      extendedType,
      hasOwnSkates: Boolean(hasOwnSkates),
      customerName: customerName.trim() || "Skater",
      customerPhone: customerPhone.trim(),
      baseDurationMinutes: baseDuration,
      gracePeriodMinutes,
      totalMinutes,
      startedAt: sessionStart,
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

    // 4. Update Shoe status to RENTED if it is a rink shoe
    if (shoeDoc) {
      shoeDoc.status = "RENTED";
      await shoeDoc.save();
    }

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
