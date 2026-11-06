import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product, Sale, RentalSession } from "@/models";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      saleType, // "TAB" | "WALK_IN"
      rentalSessionId,
      shoeId,
      items, // Array of { productId, quantity }
      paymentMethod = "CASH", // If WALK_IN
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty. Please add items." },
        { status: 400 }
      );
    }

    if (saleType === "TAB" && !rentalSessionId) {
      return NextResponse.json(
        { error: "Active rental session must be specified to add to a skater's tab." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. If tab sale, verify rental session exists and is ACTIVE
    let activeRental = null;
    if (saleType === "TAB") {
      activeRental = await RentalSession.findById(rentalSessionId);
      if (!activeRental || activeRental.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "The selected rental session is no longer active." },
          { status: 400 }
        );
      }
    }

    // 2. Validate and reserve stock for all items
    const saleItems = [];
    let calculatedTotal = 0;

    for (const cartItem of items) {
      const product = await Product.findById(cartItem.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ID ${cartItem.productId} not found.` },
          { status: 404 }
        );
      }

      const qty = Number(cartItem.quantity);
      if (qty <= 0) continue;

      if (product.currentStock < qty) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Requested: ${qty}.`,
          },
          { status: 400 }
        );
      }

      // Deduct stock in real-time
      product.currentStock -= qty;
      await product.save();

      const subtotal = product.sellingPrice * qty;
      calculatedTotal += subtotal;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.sellingPrice,
        subtotal,
      });
    }

    // 3. Create Sale record
    const sale = await Sale.create({
      rentalSessionId: saleType === "TAB" ? activeRental?._id : undefined,
      shoeId: saleType === "TAB" ? activeRental?.shoeId || shoeId : undefined,
      saleType: saleType === "TAB" ? "TAB" : "WALK_IN",
      items: saleItems,
      totalAmount: calculatedTotal,
      paymentStatus: saleType === "TAB" ? "UNPAID" : "PAID",
      paymentMethod: saleType === "WALK_IN" ? paymentMethod : undefined,
      registeredByStaffId: sessionUser.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          saleType === "TAB"
            ? `Items charged to Shoe ${activeRental?.shoeId}'s tab (+${calculatedTotal} ETB)`
            : `Walk-in sale settled for ${calculatedTotal} ETB via ${paymentMethod}`,
        sale,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Concession checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

