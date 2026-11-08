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



export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }

    await connectDB();
    const { Product } = await import("@/models");
    const sale = await Sale.findById(id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Restore stock for all items
    if (Array.isArray(sale.items)) {
      for (const item of sale.items) {
        if (item.productId && item.quantity) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { currentStock: item.quantity },
          });
        }
      }
    }

    await Sale.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Order voided and stock restored successfully",
    });
  } catch (error) {
    console.error("Delete sale error:", error);
    return NextResponse.json({ error: "Failed to void sale" }, { status: 500 });
  }
}
