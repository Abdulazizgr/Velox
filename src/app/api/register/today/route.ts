import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyRegister, RentalSession, Sale, Expense } from "@/models";
import { getSession } from "@/lib/auth";
import { format, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // "YYYY-MM-DD" or today
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dateStr = format(targetDate, "yyyy-MM-dd");

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // 1. Find or create register record for this date
    let register = await DailyRegister.findOne({ date: dateStr });
    if (!register) {
      register = await DailyRegister.create({
        date: dateStr,
        openingCash: 500, // 500 ETB standard float
        cashInTotal: 0,
        telebirrTotal: 0,
        cbeTotal: 0,
        dailyExpensesTotal: 0,
        expectedClosingCash: 500,
        status: "OPEN",
        notes: "Auto-opened for today's shift",
      });
    }

    // 2. Compute live revenue from rentals
    const rentals = await RentalSession.find({
      startedAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: "PAID",
    });

    let rentalCash = 0;
    let rentalTelebirr = 0;
    let rentalCbe = 0;
    rentals.forEach((r) => {
      const fee = r.totalRentalFee || 0;
      if (r.paymentMethod === "TELEBIRR") rentalTelebirr += fee;
      else if (r.paymentMethod === "CBE") rentalCbe += fee;
      else rentalCash += fee;
    });

    // 3. Compute live revenue from concession sales
    const sales = await Sale.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: "PAID",
    });

    let concessionCash = 0;
    let concessionTelebirr = 0;
    let concessionCbe = 0;
    sales.forEach((s) => {
      const amt = s.totalAmount || 0;
      if (s.paymentMethod === "TELEBIRR") concessionTelebirr += amt;
      else if (s.paymentMethod === "CBE") concessionCbe += amt;
      else concessionCash += amt;
    });

    // 4. Compute daily petty cash expenses
    const dailyExpenses = await Expense.find({
      date: { $gte: dayStart, $lte: dayEnd },
      fundSource: "DAILY_CASH",
    });

    const dailyExpensesTotal = dailyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Inflows by channel
    const cashInTotal = rentalCash + concessionCash;
    const telebirrTotal = rentalTelebirr + concessionTelebirr;
    const cbeTotal = rentalCbe + concessionCbe;
    const grossRevenue = cashInTotal + telebirrTotal + cbeTotal;

    // Expected cash in drawer = Opening Float + Cash in - Daily petty cash expenses
    const expectedClosingCash = register.openingCash + cashInTotal - dailyExpensesTotal;

    // Update live fields if still OPEN
    if (register.status === "OPEN") {
      register.cashInTotal = cashInTotal;
      register.telebirrTotal = telebirrTotal;
      register.cbeTotal = cbeTotal;
      register.dailyExpensesTotal = dailyExpensesTotal;
      register.expectedClosingCash = expectedClosingCash;
      await register.save();
    }

    return NextResponse.json({
      register,
      summary: {
        date: dateStr,
        rentalsCount: rentals.length,
        rentalsTotal: rentalCash + rentalTelebirr + rentalCbe,
        concessionsCount: sales.length,
        concessionsTotal: concessionCash + concessionTelebirr + concessionCbe,
        grossRevenue,
        dailyExpensesTotal,
        netOperatingIncome: grossRevenue - dailyExpensesTotal,
        channels: {
          cash: {
            openingFloat: register.openingCash,
            inflow: cashInTotal,
            outflow: dailyExpensesTotal,
            expectedInDrawer: expectedClosingCash,
          },
          telebirr: {
            inflow: telebirrTotal,
          },
          cbe: {
            inflow: cbeTotal,
          },
        },
      },
    });
  } catch (error) {
    console.error("Today register error:", error);
    return NextResponse.json({ error: "Failed to fetch register" }, { status: 500 });
  }
}
