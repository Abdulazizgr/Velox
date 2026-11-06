import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MissedDemand } from "@/models";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const records = await MissedDemand.find({}).sort({ date: -1 }).lean();

    // Group by size
    const countsBySize: Record<number, number> = {};
    records.forEach((r) => {
      countsBySize[r.shoeSize] = (countsBySize[r.shoeSize] || 0) + 1;
    });

    return NextResponse.json({ records, countsBySize });
  } catch (error) {
    console.error("Fetch missed demand error:", error);
    return NextResponse.json({ error: "Failed to fetch demand logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { shoeSize, skateType = "INLINE", notes = "" } = body;

    const sizeNum = Number(shoeSize);
    if (!sizeNum || isNaN(sizeNum)) {
      return NextResponse.json({ error: "Valid shoe size is required" }, { status: 400 });
    }

    await connectDB();

    const demand = await MissedDemand.create({
      shoeSize: sizeNum,
      skateType: ["INLINE", "QUAD"].includes(skateType) ? skateType : "INLINE",
      recordedByStaffId: session.userId,
      notes: notes.trim(),
      date: new Date(),
    });

    // Total count for this size
    const countForSize = await MissedDemand.countDocuments({ shoeSize: sizeNum });

    return NextResponse.json(
      {
        success: true,
        message: `Logged 1 missed customer for Size #${sizeNum}. Total turned away: ${countForSize}.`,
        demand,
        totalForSize: countForSize,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Record missed demand error:", error);
    return NextResponse.json({ error: "Failed to log missed demand" }, { status: 500 });
  }
}
