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

    const body = await req.json().catch(() => ({}));
    const { openingCash = 500 } = body;

    await connectDB();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    let register = await DailyRegister.findOne({ date: todayStr });
    if (!register) {
      register = await DailyRegister.create({
        date: todayStr,
        openingCash: Number(openingCash) || 500,
        status: "OPEN",
        notes: "Shift opened",
      });
    } else {
      register.status = "OPEN";
      register.openingCash = Number(openingCash) || register.openingCash;
      register.actualClosingCash = undefined;
      register.discrepancy = 0;
      register.closedAt = undefined;
      await register.save();
    }

    return NextResponse.json({
      success: true,
      message: `Shift for ${todayStr} is now OPEN with ${register.openingCash} ETB float.`,
      register,
    });
  } catch (error) {
    console.error("Open register error:", error);
    return NextResponse.json({ error: "Failed to open register" }, { status: 500 });
  }
}
