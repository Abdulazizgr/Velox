import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { RentalSession } from "@/models";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { payerSessionId, action = "LINK" } = body;

    await connectDB();
    const currentSession = await RentalSession.findById(id);
    if (!currentSession) {
      return NextResponse.json({ error: "Current session not found" }, { status: 404 });
    }

    if (action === "UNLINK") {
      if (currentSession.billedToSessionId) {
        const oldPayer = await RentalSession.findById(currentSession.billedToSessionId);
        if (oldPayer) {
          oldPayer.payingForSessionIds = (oldPayer.payingForSessionIds || []).filter(
            (sId) => sId !== currentSession._id.toString()
          );
          await oldPayer.save();
        }
      }
      currentSession.billedToSessionId = undefined;
      currentSession.billedToShoeId = undefined;
      currentSession.billedToCustomerName = undefined;
      await currentSession.save();

      return NextResponse.json({
        success: true,
        message: "Bill unlinked successfully",
        session: currentSession,
      });
    }

    if (!payerSessionId) {
      return NextResponse.json({ error: "Payer session ID is required" }, { status: 400 });
    }

    if (payerSessionId === id) {
      return NextResponse.json({ error: "A session cannot be billed to itself" }, { status: 400 });
    }

    const payerSession = await RentalSession.findById(payerSessionId);
    if (!payerSession) {
      return NextResponse.json({ error: "Payer session not found" }, { status: 404 });
    }

    // Set mapping on current session (Customer B)
    currentSession.billedToSessionId = payerSession._id.toString();
    currentSession.billedToShoeId = payerSession.shoeId;
    currentSession.billedToCustomerName = payerSession.customerName;
    await currentSession.save();

    // Add to payer's payingForSessionIds (Customer A)
    payerSession.payingForSessionIds = Array.from(
      new Set([...(payerSession.payingForSessionIds || []), currentSession._id.toString()])
    );
    await payerSession.save();

    return NextResponse.json({
      success: true,
      message: `Bill mapped to ${payerSession.customerName || "Skater"} (${payerSession.shoeId})`,
      currentSession,
      payerSession,
    });
  } catch (error) {
    console.error("Link payer error:", error);
    return NextResponse.json({ error: "Failed to map payer" }, { status: 500 });
  }
}

