import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CapitalFund } from "@/models";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, description = "Capital Deposit / Top-up" } = body;

    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      return NextResponse.json(
        { error: "A positive capital deposit amount is required." },
        { status: 400 }
      );
    }

    await connectDB();

    let capital = await CapitalFund.findOne();
    if (!capital) {
      capital = await CapitalFund.create({
        totalCapital: depositAmount,
        remainingBalance: depositAmount,
        lastUpdated: new Date(),
      });
    } else {
      capital.totalCapital += depositAmount;
      capital.remainingBalance += depositAmount;
      capital.lastUpdated = new Date();
      await capital.save();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ${depositAmount} ETB into General Capital. New balance: ${capital.remainingBalance} ETB.`,
      capital,
    });
  } catch (error) {
    console.error("Capital top-up error:", error);
    return NextResponse.json({ error: "Failed to update capital" }, { status: 500 });
  }
}

