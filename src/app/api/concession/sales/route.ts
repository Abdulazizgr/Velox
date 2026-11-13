import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sale, Product } from "@/models";
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
    const paymentStatus = searchParams.get("paymentStatus");
    const paymentMethod = searchParams.get("paymentMethod");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(Number(searchParams.get("limit") || 150), 300);

    const query: Record<string, unknown> = {};
    if (rentalSessionId) {
      query.rentalSessionId = rentalSessionId;
    }
    if (saleType && saleType !== "ALL") {
      query.saleType = saleType;
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      query.paymentStatus = paymentStatus;
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      query.paymentMethod = paymentMethod;
    }

    // Date range filtering
    if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: s, $lte: e };
    } else if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: s };
    }

    // Search query on item names or shoeId
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { "items.productName": searchRegex },
        { shoeId: searchRegex },
      ];
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    return NextResponse.json({ sales });
  } catch (error) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, paymentMethod, paymentStatus, items } = body;

    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }

    await connectDB();
    const sale = await Sale.findById(id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // 1. Payment Method Update
    if (paymentMethod && ["CASH", "TELEBIRR", "CBE"].includes(paymentMethod)) {
      sale.paymentMethod = paymentMethod;
    }

    // 2. Payment Status Update
    if (paymentStatus && ["PAID", "UNPAID"].includes(paymentStatus)) {
      sale.paymentStatus = paymentStatus;
    }

    // 3. Item Quantities Update with Inventory Sync
    if (Array.isArray(items) && items.length > 0) {
      // Create map of old item quantities
      const oldQtyMap = new Map<string, number>();
      for (const item of sale.items) {
        oldQtyMap.set(item.productId.toString(), item.quantity);
      }

      const updatedItems = [];
      let newTotal = 0;

      for (const newItem of items) {
        const prodId = newItem.productId.toString();
        const oldQty = oldQtyMap.get(prodId) || 0;
        const newQty = Number(newItem.quantity);

        if (newQty < 0) {
          return NextResponse.json({ error: "Quantity cannot be negative" }, { status: 400 });
        }

        const delta = newQty - oldQty;
        if (delta !== 0) {
          if (delta > 0) {
            // Need to deduct more stock
            const product = await Product.findById(newItem.productId);
            if (!product || product.currentStock < delta) {
              return NextResponse.json(
                { error: `Insufficient stock for ${newItem.productName || product?.name || "item"}. Available: ${product?.currentStock || 0}` },
                { status: 400 }
              );
            }
            await Product.findByIdAndUpdate(newItem.productId, {
              $inc: { currentStock: -delta },
            });
          } else {
            // Restore stock (delta is negative)
            await Product.findByIdAndUpdate(newItem.productId, {
              $inc: { currentStock: Math.abs(delta) },
            });
          }
        }

        const existingItem = sale.items.find(
          (i) => i.productId?.toString() === prodId
        );
        let resolvedName = newItem.productName || existingItem?.productName;
        if (!resolvedName) {
          const prodDoc = await Product.findById(newItem.productId);
          resolvedName = prodDoc?.name || "Product";
        }

        if (newQty > 0) {
          const subtotal = newQty * Number(newItem.unitPrice);
          newTotal += subtotal;
          updatedItems.push({
            productId: newItem.productId,
            productName: resolvedName,
            quantity: newQty,
            unitPrice: Number(newItem.unitPrice),
            subtotal,
          });
        }
      }

      sale.items = updatedItems;
      sale.totalAmount = newTotal;
    }

    await sale.save();

    return NextResponse.json({
      success: true,
      message: "Sale updated successfully",
      sale,
    });
  } catch (error) {
    console.error("Update sale error:", error);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
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
