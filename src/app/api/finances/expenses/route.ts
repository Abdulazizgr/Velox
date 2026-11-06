import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Expense, CapitalFund } from "@/models";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      amount,
      category,
      fundSource, // "DAILY_CASH" | "CAPITAL"
      paymentMethod = "CASH", // "CASH" | "TELEBIRR" | "CBE"
      notes = "",
    } = body;

    const expenseAmount = Number(amount);
    if (!title || !expenseAmount || expenseAmount <= 0 || !category || !fundSource) {
      return NextResponse.json(
        { error: "Title, positive amount, category, and fund source are required." },
        { status: 400 }
      );
    }

    await connectDB();

    // If funded from General Capital, verify balance and deduct
    if (fundSource === "CAPITAL") {
      let capital = await CapitalFund.findOne();
      if (!capital) {
        capital = await CapitalFund.create({
          totalCapital: 50000,
          remainingBalance: 50000,
          lastUpdated: new Date(),
        });
      }

      if (capital.remainingBalance < expenseAmount) {
        return NextResponse.json(
          {
            error: `Insufficient Capital Reserve. Available: ${capital.remainingBalance} ETB, Requested: ${expenseAmount} ETB.`,
          },
          { status: 400 }
        );
      }

      capital.remainingBalance -= expenseAmount;
      capital.lastUpdated = new Date();
      await capital.save();
    }

    const expense = await Expense.create({
      title: title.trim(),
      amount: expenseAmount,
      category,
      fundSource,
      paymentMethod,
      notes: notes.trim(),
      date: new Date(),
      recordedByStaffId: sessionUser.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          fundSource === "CAPITAL"
            ? `Capital expense of ${expenseAmount} ETB recorded. Deducted from General Capital.`
            : `Daily operational expense of ${expenseAmount} ETB recorded. Deducted from Daily Cash Register.`,
        expense,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to record expense" }, { status: 500 });
  }
}

