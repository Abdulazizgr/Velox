import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product, StockAdjustment } from "@/models";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      addStock,
      currentStock,
      sellingPrice,
      costPrice,
      minStockAlert,
      name,
      category,
      adjustReason = "INVENTORY_COUNT",
      adjustReasonLabel = "Physical Count",
      notes = "",
    } = body;

    await connectDB();
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (sellingPrice != null) product.sellingPrice = Number(sellingPrice);
    if (costPrice != null) product.costPrice = Number(costPrice);
    if (minStockAlert != null) product.minStockAlert = Number(minStockAlert);

    // Track stock adjustments / shrinkage
    const prevStock = product.currentStock;
    if (currentStock != null) {
      const newStockVal = Math.max(0, Number(currentStock));
      const delta = newStockVal - prevStock;
      if (delta !== 0) {
        try {
          await StockAdjustment.create({
            productId: product._id.toString(),
            productName: product.name,
            category: product.category,
            previousStock: prevStock,
            newStock: newStockVal,
            delta,
            reason: adjustReason,
            reasonLabel: adjustReasonLabel,
            costValueLost: delta < 0 ? Math.abs(delta) * (product.costPrice || 0) : 0,
            date: new Date(),
            recordedByStaffId: session.userId,
            notes,
          });
        } catch (e) {
          console.error("Failed to log stock adjustment:", e);
        }
      }
      product.currentStock = newStockVal;
    }

    if (addStock != null) {
      product.currentStock = Math.max(0, product.currentStock + Number(addStock));
    }

    await product.save();

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized - Owner only" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
