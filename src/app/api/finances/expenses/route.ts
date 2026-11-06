import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Expense, CapitalFund, ExpenseCategory } from "@/models";
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
      date,
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

    // Ensure category exists in ExpenseCategory collection
    try {
      const cleanCat = String(category).trim().toUpperCase();
      const existingCat = await ExpenseCategory.findOne({ name: cleanCat });
      if (!existingCat) {
        const pretty = cleanCat
          .split("_")
          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
          .join(" ");
        await ExpenseCategory.create({
          name: cleanCat,
          displayName: pretty,
          fundSource: fundSource === "CAPITAL" ? "CAPITAL" : "DAILY_CASH",
        });
      }
    } catch {
      // Non-fatal if upsert check fails
    }

    const expenseDate = date ? new Date(date) : new Date();

    const expense = await Expense.create({
      title: title.trim(),
      amount: expenseAmount,
      category: String(category).trim().toUpperCase(),
      fundSource,
      paymentMethod,
      notes: notes.trim(),
      date: expenseDate,
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

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    await connectDB();
    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // If it was a capital expense, restore balance
    if (expense.fundSource === "CAPITAL") {
      const capital = await CapitalFund.findOne();
      if (capital) {
        capital.remainingBalance += expense.amount;
        capital.lastUpdated = new Date();
        await capital.save();
      }
    }

    await Expense.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
