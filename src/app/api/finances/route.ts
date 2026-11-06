import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession, Sale, Expense, CapitalFund } from "@/models";
import { getSession } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // Optional "YYYY-MM-DD"
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // 1. Fetch General Capital Status
    let capital = await CapitalFund.findOne();
    if (!capital) {
      capital = await CapitalFund.create({
        totalCapital: 50000,
        remainingBalance: 50000,
        lastUpdated: new Date(),
      });
    }

    // 2. Fetch Completed/Paid Rentals for the target day
    const rentals = await RentalSession.find({
      startedAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: "PAID",
    });

    let rentalRevenue = { cash: 0, telebirr: 0, cbe: 0, total: 0 };
    rentals.forEach((r) => {
      const fee = r.totalRentalFee || 0;
      rentalRevenue.total += fee;
      if (r.paymentMethod === "TELEBIRR") rentalRevenue.telebirr += fee;
      else if (r.paymentMethod === "CBE") rentalRevenue.cbe += fee;
      else rentalRevenue.cash += fee; // Default CASH
    });

    // 3. Fetch Concession Sales for the target day
    const sales = await Sale.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: "PAID",
    });

    let concessionRevenue = { cash: 0, telebirr: 0, cbe: 0, total: 0 };
    sales.forEach((s) => {
      const amt = s.totalAmount || 0;
      concessionRevenue.total += amt;
      if (s.paymentMethod === "TELEBIRR") concessionRevenue.telebirr += amt;
      else if (s.paymentMethod === "CBE") concessionRevenue.cbe += amt;
      else concessionRevenue.cash += amt;
    });

    // Total gross inflows by channel
    const grossTotal = {
      cash: rentalRevenue.cash + concessionRevenue.cash,
      telebirr: rentalRevenue.telebirr + concessionRevenue.telebirr,
      cbe: rentalRevenue.cbe + concessionRevenue.cbe,
      total: rentalRevenue.total + concessionRevenue.total,
    };

    // 4. Fetch Expenses for the target day
    const expenses = await Expense.find({
      date: { $gte: dayStart, $lte: dayEnd },
    }).sort({ date: -1 });

    let dailyPettyCashExpenses = 0; // OpEx: staff lunch, transport, supplies
    let capitalExpenses = 0;        // CapEx: skate shoes, bulk restock, rent

    expenses.forEach((e) => {
      if (e.fundSource === "DAILY_CASH") {
        dailyPettyCashExpenses += e.amount;
      } else {
        capitalExpenses += e.amount;
      }
    });

    // Net daily operating cash in drawer = (Cash collected from sales) - (Petty expenses paid from cash)
    const netDailyCashInDrawer = grossTotal.cash - dailyPettyCashExpenses;

    return NextResponse.json({
      capital: {
        totalCapital: capital.totalCapital,
        remainingBalance: capital.remainingBalance,
        lastUpdated: capital.lastUpdated,
      },
      today: {
        date: targetDate.toISOString(),
        rentalRevenue,
        concessionRevenue,
        grossTotal,
        dailyPettyCashExpenses,
        capitalExpenses,
        netDailyCashInDrawer,
      },
      expenses,
    });
  } catch (error) {
    console.error("Finances API error:", error);
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
  }
}
