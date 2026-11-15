import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CapitalFund, User } from "@/models";
import { getSession } from "@/lib/auth";

// GET /api/finances/capital - Retrieve current capital reserve & deposit history
export async function GET() {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    await connectDB();
    let capital = await CapitalFund.findOne();
    if (!capital) {
      capital = await CapitalFund.create({
        initialCapital: 0,
        totalInjectedCapital: 0,
        totalCapital: 0,
        remainingBalance: 0,
        deposits: [],
        lastUpdated: new Date(),
      });
    }

    // Ensure backwards compatibility fields
    if (capital.totalInjectedCapital === undefined) {
      capital.totalInjectedCapital = capital.totalCapital || 0;
    }
    if (!Array.isArray(capital.deposits)) {
      capital.deposits = [];
    }

    return NextResponse.json({ capital });
  } catch (error) {
    console.error("Fetch capital error:", error);
    return NextResponse.json({ error: "Failed to fetch capital details" }, { status: 500 });
  }
}

// POST /api/finances/capital - Set initial capital or deposit from other sources (loan, owner, partner, etc.)
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      amount,
      source = "OTHER",
      sourceLabel,
      notes = "",
      date,
      action = "ADD_DEPOSIT", // "SET_INITIAL" | "ADD_DEPOSIT"
    } = body;

    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: "A positive capital deposit amount is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const staffUser = await User.findById(sessionUser.userId).lean();
    const depositedByName = staffUser?.name || sessionUser.name || "Owner";

    let capital = await CapitalFund.findOne();
    if (!capital) {
      capital = await CapitalFund.create({
        initialCapital: 0,
        totalInjectedCapital: 0,
        totalCapital: 0,
        remainingBalance: 0,
        deposits: [],
        lastUpdated: new Date(),
      });
    }

    const depositDate = date ? new Date(date) : new Date();

    const defaultLabels: Record<string, string> = {
      INITIAL: "Initial Business Capital",
      OWNER_EQUITY: "Owner Investment / Equity",
      LOAN: "Bank / External Loan",
      PARTNER: "Partner Contribution",
      OTHER: "Other External Source",
    };

    const label = sourceLabel?.trim() || defaultLabels[source] || "Capital Deposit";

    if (action === "SET_INITIAL" || source === "INITIAL") {
      // Find existing INITIAL deposit if any
      const existingInitialIndex = capital.deposits.findIndex((d) => d.source === "INITIAL");
      if (existingInitialIndex >= 0) {
        const oldInitialAmt = capital.deposits[existingInitialIndex].amount;
        const diff = depositAmount - oldInitialAmt;

        capital.deposits[existingInitialIndex].amount = depositAmount;
        capital.deposits[existingInitialIndex].notes = notes.trim() || capital.deposits[existingInitialIndex].notes;
        capital.deposits[existingInitialIndex].date = depositDate;
        capital.deposits[existingInitialIndex].sourceLabel = label;

        capital.initialCapital = depositAmount;
        capital.totalInjectedCapital = Math.max(0, (capital.totalInjectedCapital || capital.totalCapital || 0) + diff);
        capital.totalCapital = Math.max(0, (capital.totalCapital || 0) + diff);
        capital.remainingBalance = Math.max(0, (capital.remainingBalance || 0) + diff);
      } else {
        if (capital.deposits.length === 0) {
          capital.initialCapital = depositAmount;
          capital.totalInjectedCapital = depositAmount;
          capital.totalCapital = depositAmount;
          capital.remainingBalance = depositAmount;
        } else {
          capital.initialCapital = depositAmount;
          capital.totalInjectedCapital = (capital.totalInjectedCapital || capital.totalCapital || 0) + depositAmount;
          capital.totalCapital = (capital.totalCapital || 0) + depositAmount;
          capital.remainingBalance = (capital.remainingBalance || 0) + depositAmount;
        }

        capital.deposits.unshift({
          amount: depositAmount,
          source: "INITIAL",
          sourceLabel: label,
          notes: notes.trim(),
          date: depositDate,
          depositedByStaffId: sessionUser.userId,
          depositedByName,
        });
      }
    } else {
      // Add deposit from other source (Loan, Owner equity, Partner, etc.)
      capital.totalInjectedCapital = (capital.totalInjectedCapital || capital.totalCapital || 0) + depositAmount;
      capital.totalCapital = (capital.totalCapital || 0) + depositAmount;
      capital.remainingBalance = (capital.remainingBalance || 0) + depositAmount;

      capital.deposits.push({
        amount: depositAmount,
        source: ["OWNER_EQUITY", "LOAN", "PARTNER", "OTHER"].includes(source) ? source : "OTHER",
        sourceLabel: label,
        notes: notes.trim(),
        date: depositDate,
        depositedByStaffId: sessionUser.userId,
        depositedByName,
      });
    }

    capital.lastUpdated = new Date();
    await capital.save();

    return NextResponse.json({
      success: true,
      message: `Successfully recorded ${depositAmount.toLocaleString()} ETB (${label}). New balance: ${capital.remainingBalance.toLocaleString()} ETB.`,
      capital,
    });
  } catch (error) {
    console.error("Capital top-up error:", error);
    return NextResponse.json({ error: "Failed to update capital" }, { status: 500 });
  }
}

// DELETE /api/finances/capital - Remove an injection recorded by mistake
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser || sessionUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const depositId = searchParams.get("depositId");
    if (!depositId) {
      return NextResponse.json({ error: "Deposit ID is required" }, { status: 400 });
    }

    await connectDB();
    const capital = await CapitalFund.findOne();
    if (!capital) {
      return NextResponse.json({ error: "Capital fund not found" }, { status: 404 });
    }

    const depositIndex = capital.deposits.findIndex((d) => d._id?.toString() === depositId);
    if (depositIndex < 0) {
      return NextResponse.json({ error: "Deposit record not found" }, { status: 404 });
    }

    const deposit = capital.deposits[depositIndex];
    if (capital.remainingBalance < deposit.amount) {
      return NextResponse.json(
        { error: "Cannot delete this capital deposit as part of it has already been spent on capital expenses." },
        { status: 400 }
      );
    }

    if (deposit.source === "INITIAL") {
      capital.initialCapital = 0;
    }
    capital.totalInjectedCapital = Math.max(0, (capital.totalInjectedCapital || capital.totalCapital) - deposit.amount);
    capital.totalCapital = Math.max(0, capital.totalCapital - deposit.amount);
    capital.remainingBalance = Math.max(0, capital.remainingBalance - deposit.amount);

    capital.deposits.splice(depositIndex, 1);
    capital.lastUpdated = new Date();
    await capital.save();

    return NextResponse.json({
      success: true,
      message: "Capital deposit removed successfully",
      capital,
    });
  } catch (error) {
    console.error("Delete capital deposit error:", error);
    return NextResponse.json({ error: "Failed to delete capital deposit" }, { status: 500 });
  }
}
