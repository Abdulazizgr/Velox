import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sale } from "@/models";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const rentalSessionId = searchParams.get("rentalSessionId");
    const saleType = searchParams.get("saleType");

    const query: Record<string, unknown> = {};
    if (rentalSessionId) {
      query.rentalSessionId = rentalSessionId;
    }
    if (saleType) {
      query.saleType = saleType;
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({ sales });
  } catch (error) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

