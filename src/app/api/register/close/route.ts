import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyRegister } from "@/models";
import { getSession } from "@/lib/auth";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { actualClosingCash, notes = "" } = body;

    const countedCash = Number(actualClosingCash);
    if (countedCash < 0 || isNaN(countedCash)) {
      return NextResponse.json(
        { error: "A valid counted physical cash amount is required to close the shift." },
        { status: 400 }
      );
    }

    await connectDB();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const register = await DailyRegister.findOne({ date: todayStr });
    if (!register) {
      return NextResponse.json({ error: "No register found for today." }, { status: 404 });
    }

    if (register.status === "CLOSED") {
      return NextResponse.json(
        { error: "This register has already been closed and locked." },
        { status: 400 }
      );
    }

    const discrepancy = countedCash - register.expectedClosingCash;

    register.actualClosingCash = countedCash;
    register.discrepancy = discrepancy;
    register.status = "CLOSED";
    register.closedByStaffId = sessionUser.userId;
    register.closedAt = new Date();
    if (notes) register.notes = notes.trim();

    await register.save();

    return NextResponse.json({
      success: true,
      message: `Shift closed successfully. Discrepancy: ${discrepancy > 0 ? `+${discrepancy} ETB (Surplus)` : discrepancy < 0 ? `${discrepancy} ETB (Shortage)` : "0 ETB (Balanced)"}`,
      register,
    });
  } catch (error) {
    console.error("Close register error:", error);
    return NextResponse.json({ error: "Failed to close register" }, { status: 500 });
  }
}
