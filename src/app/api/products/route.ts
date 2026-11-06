import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({}).sort({ category: 1, name: 1 });
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, costPrice, sellingPrice, currentStock, minStockAlert } = body;

    if (!name || costPrice == null || sellingPrice == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const product = await Product.create({
      name: name.trim(),
      category: category || "SNACK",
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      currentStock: Number(currentStock || 0),
      minStockAlert: Number(minStockAlert || 5),
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
