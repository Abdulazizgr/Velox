import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Expense, CapitalFund, RentalSession, Sale, DailyRegister } from "@/models";
import { getSession } from "@/lib/auth";
import { getEthiopiaDayBounds, getEthiopiaPastDaysBounds } from "@/lib/dateUtils";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can view full executive financial P&L
    if (sessionUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("preset") || "WEEK"; // TODAY | YESTERDAY | WEEK | MONTH | ALL | CUSTOM
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    const todayBounds = getEthiopiaDayBounds(now);
    let rangeStart: Date;
    let rangeEnd: Date = todayBounds.end;

    if (startDateParam && endDateParam) {
      rangeStart = getEthiopiaDayBounds(new Date(startDateParam)).start;
      rangeEnd = getEthiopiaDayBounds(new Date(endDateParam)).end;
    } else if (startDateParam) {
      const b = getEthiopiaDayBounds(new Date(startDateParam));
      rangeStart = b.start;
      rangeEnd = b.end;
    } else if (preset === "TODAY") {
      rangeStart = todayBounds.start;
      rangeEnd = todayBounds.end;
    } else if (preset === "YESTERDAY") {
      const yb = getEthiopiaPastDaysBounds(1);
      rangeStart = yb.start;
      rangeEnd = yb.end;
    } else if (preset === "MONTH") {
      rangeStart = getEthiopiaPastDaysBounds(29).start;
      rangeEnd = todayBounds.end;
    } else if (preset === "ALL") {
      rangeStart = new Date(0);
      rangeEnd = todayBounds.end;
    } else {
      // Default: WEEK (7 days)
      rangeStart = getEthiopiaPastDaysBounds(6).start;
      rangeEnd = todayBounds.end;
    }

    // 1. Fetch Period Data
    const periodRentals = await RentalSession.find({
      startedAt: { $gte: rangeStart, $lte: rangeEnd },
      status: { $ne: "CANCELLED" },
    }).lean();

    const periodSales = await Sale.find({
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      paymentStatus: "PAID",
    }).lean();

    const periodExpenses = await Expense.find({
      date: { $gte: rangeStart, $lte: rangeEnd },
    }).sort({ date: -1 }).lean();

    // 2. Revenue Calculations
    let rentalCash = 0;
    let rentalTelebirr = 0;
    let rentalCbe = 0;
    let rentalTotal = 0;

    periodRentals.forEach((r) => {
      const fee = r.totalRentalFee || 0;
      rentalTotal += fee;
      if (r.paymentMethod === "TELEBIRR") rentalTelebirr += fee;
      else if (r.paymentMethod === "CBE") rentalCbe += fee;
      else rentalCash += fee;
    });

    let shopCash = 0;
    let shopTelebirr = 0;
    let shopCbe = 0;
    let shopTotal = 0;

    periodSales.forEach((s) => {
      const amt = s.totalAmount || 0;
      shopTotal += amt;
      if (s.paymentMethod === "TELEBIRR") shopTelebirr += amt;
      else if (s.paymentMethod === "CBE") shopCbe += amt;
      else shopCash += amt;
    });

    const grossRevenue = rentalTotal + shopTotal;

    // 3. Operating (Daily Cash) & Capital Expenses
    let dailyOpEx = 0;
    let capitalExp = 0;
    const expenseByReason: Record<string, number> = {};

    periodExpenses.forEach((e) => {
      const amt = e.amount || 0;
      if (e.fundSource === "DAILY_CASH") {
        dailyOpEx += amt;
      } else {
        capitalExp += amt;
      }

      const r = e.category || "OTHER";
      expenseByReason[r] = (expenseByReason[r] || 0) + amt;
    });

    const netOperatingIncome = grossRevenue - dailyOpEx;
    const operatingMarginPct = grossRevenue > 0 ? Math.round((netOperatingIncome / grossRevenue) * 100) : 0;
    const netCashSurplus = netOperatingIncome - capitalExp;

    // 4. All-Time General Capital Calculation:
    // General Capital is accumulated from the sum of ALL daily net incomes minus all capital disbursements
    const allRentals = await RentalSession.find({
      status: { $ne: "CANCELLED" },
    }).lean();

    const allSales = await Sale.find({
      paymentStatus: "PAID",
    }).lean();

    const allExpenses = await Expense.find({}).lean();

    let allTimeGross = 0;
    allRentals.forEach((r) => { allTimeGross += (r.totalRentalFee || 0); });
    allSales.forEach((s) => { allTimeGross += (s.totalAmount || 0); });

    let allTimeDailyOpEx = 0;
    let allTimeCapEx = 0;
    allExpenses.forEach((e) => {
      const amt = e.amount || 0;
      if (e.fundSource === "DAILY_CASH") {
        allTimeDailyOpEx += amt;
      } else {
        allTimeCapEx += amt;
      }
    });

    const allTimeNetIncome = allTimeGross - allTimeDailyOpEx;

    // Retrieve or initialize CapitalFund model for base opening capital
    let capitalDoc = await CapitalFund.findOne();
    if (!capitalDoc) {
      capitalDoc = await CapitalFund.create({
        initialCapital: 0,
        totalInjectedCapital: 0,
        totalCapital: 0,
        remainingBalance: 0,
        deposits: [],
        lastUpdated: new Date(),
      });
    }

    const baseCapital = capitalDoc.totalInjectedCapital || capitalDoc.totalCapital || 0;
    const initialCapital = capitalDoc.initialCapital || 0;
    const otherInjectionsTotal = Math.max(0, baseCapital - initialCapital);
    const currentGeneralCapital = baseCapital + allTimeNetIncome - allTimeCapEx;

    // 5. Daily Ledger (Day-by-Day Breakdown for the period)
    const dayLedgerMap: Record<string, {
      date: string;
      skates: number;
      shop: number;
      gross: number;
      dailyExpenses: number;
      netIncome: number;
      capitalExpenses: number;
    }> = {};

    periodRentals.forEach((r) => {
      const dStr = new Date(r.startedAt).toISOString().slice(0, 10);
      if (!dayLedgerMap[dStr]) {
        dayLedgerMap[dStr] = { date: dStr, skates: 0, shop: 0, gross: 0, dailyExpenses: 0, netIncome: 0, capitalExpenses: 0 };
      }
      dayLedgerMap[dStr].skates += (r.totalRentalFee || 0);
      dayLedgerMap[dStr].gross += (r.totalRentalFee || 0);
    });

    periodSales.forEach((s) => {
      const dStr = new Date(s.createdAt).toISOString().slice(0, 10);
      if (!dayLedgerMap[dStr]) {
        dayLedgerMap[dStr] = { date: dStr, skates: 0, shop: 0, gross: 0, dailyExpenses: 0, netIncome: 0, capitalExpenses: 0 };
      }
      dayLedgerMap[dStr].shop += (s.totalAmount || 0);
      dayLedgerMap[dStr].gross += (s.totalAmount || 0);
    });

    periodExpenses.forEach((e) => {
      const dStr = new Date(e.date).toISOString().slice(0, 10);
      if (!dayLedgerMap[dStr]) {
        dayLedgerMap[dStr] = { date: dStr, skates: 0, shop: 0, gross: 0, dailyExpenses: 0, netIncome: 0, capitalExpenses: 0 };
      }
      if (e.fundSource === "DAILY_CASH") {
        dayLedgerMap[dStr].dailyExpenses += (e.amount || 0);
      } else {
        dayLedgerMap[dStr].capitalExpenses += (e.amount || 0);
      }
    });

    const dailyLedger = Object.values(dayLedgerMap)
      .map((entry) => {
        const net = entry.gross - entry.dailyExpenses;
        const margin = entry.gross > 0 ? Math.round((net / entry.gross) * 100) : 0;
        return {
          ...entry,
          netIncome: net,
          marginPct: margin,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // 6. Expense Breakdown by Reason Array
    const totalExpensesPeriod = dailyOpEx + capitalExp;
    const expenseReasonsArray = Object.entries(expenseByReason)
      .map(([reason, amount]) => ({
        reason,
        amount,
        percentage: totalExpensesPeriod > 0 ? Math.round((amount / totalExpensesPeriod) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      preset,
      dateRange: {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      },
      summary: {
        grossRevenue,
        rentalRevenue: rentalTotal,
        shopRevenue: shopTotal,
        dailyOpEx,
        capitalExp,
        netOperatingIncome,
        operatingMarginPct,
        netCashSurplus,
        totalExpenses: totalExpensesPeriod,
      },
      generalCapital: {
        baseCapital,
        initialCapital,
        otherInjectionsTotal,
        deposits: capitalDoc.deposits || [],
        allTimeGross,
        allTimeDailyOpEx,
        allTimeNetIncome,
        allTimeCapEx,
        currentGeneralCapital,
      },
      channels: {
        total: grossRevenue,
        cash: rentalCash + shopCash,
        telebirr: rentalTelebirr + shopTelebirr,
        cbe: rentalCbe + shopCbe,
      },
      expenseReasons: expenseReasonsArray,
      dailyLedger,
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return NextResponse.json({ error: "Failed to load financial report" }, { status: 500 });
  }
}

