import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyRegister } from "@/models";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const registers = await DailyRegister.find({}).sort({ date: -1 }).limit(30);

    return NextResponse.json({ registers });
  } catch (error) {
    console.error("Register history error:", error);
    return NextResponse.json({ error: "Failed to fetch register history" }, { status: 500 });
  }
}
