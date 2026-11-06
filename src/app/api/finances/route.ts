import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Expense, CapitalFund } from "@/models";
import { getSession } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("preset") || "TODAY";
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const fundSourceParam = searchParams.get("fundSource");
    const categoryParam = searchParams.get("category");

    const now = new Date();
    let queryDate: any = null;

    if (preset === "ALL") {
      queryDate = null;
    } else if (preset === "YESTERDAY") {
      const yest = subDays(now, 1);
      queryDate = { $gte: startOfDay(yest), $lte: endOfDay(yest) };
    } else if (preset === "WEEK") {
      queryDate = { $gte: startOfDay(subDays(now, 6)), $lte: endOfDay(now) };
    } else if (preset === "MONTH") {
      queryDate = { $gte: startOfMonth(now), $lte: endOfDay(now) };
    } else if (startDateParam && endDateParam) {
      queryDate = {
        $gte: startOfDay(new Date(startDateParam)),
        $lte: endOfDay(new Date(endDateParam)),
      };
    } else if (dateParam || startDateParam) {
      const d = new Date(dateParam || startDateParam!);
      queryDate = { $gte: startOfDay(d), $lte: endOfDay(d) };
    } else {
      // Default: TODAY
      queryDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
    }

    // 1. Fetch General Capital Status
    let capital = await CapitalFund.findOne();
    if (!capital) {
      capital = await CapitalFund.create({
        totalCapital: 50000,
        remainingBalance: 50000,
        lastUpdated: new Date(),
      });
    }

    // 2. Fetch all expenses in the target date range for accurate period summaries
    const baseDateFilter = queryDate ? { date: queryDate } : {};
    const periodExpenses = await Expense.find(baseDateFilter).sort({ date: -1 }).lean();

    let dailyTotal = 0;
    let capitalTotal = 0;
    let dailyCount = 0;
    let capitalCount = 0;

    periodExpenses.forEach((e) => {
      if (e.fundSource === "DAILY_CASH") {
        dailyTotal += e.amount || 0;
        dailyCount++;
      } else {
        capitalTotal += e.amount || 0;
        capitalCount++;
      }
    });

    const totalBoth = dailyTotal + capitalTotal;
    const totalCount = dailyCount + capitalCount;

    // 3. Filter for specific category / fundSource view if requested
    let filteredList = periodExpenses;
    if (fundSourceParam && fundSourceParam !== "ALL") {
      filteredList = filteredList.filter((e) => e.fundSource === fundSourceParam);
    }
    if (categoryParam && categoryParam !== "ALL") {
      filteredList = filteredList.filter((e) => e.category === categoryParam);
    }

    return NextResponse.json({
      summary: {
        dailyTotal,
        dailyCount,
        capitalTotal,
        capitalCount,
        totalBoth,
        totalCount,
      },
      capital: {
        totalCapital: capital.totalCapital,
        remainingBalance: capital.remainingBalance,
        lastUpdated: capital.lastUpdated,
      },
      expenses: filteredList,
      query: {
        preset,
        date: dateParam,
        startDate: startDateParam,
        endDate: endDateParam,
        fundSource: fundSourceParam,
        category: categoryParam,
      },
    });
  } catch (error) {
    console.error("Finances API error:", error);
    return NextResponse.json({ error: "Failed to fetch expense data" }, { status: 500 });
  }
}
