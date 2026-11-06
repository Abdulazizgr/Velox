import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ExpenseCategory, Expense, IExpenseCategory } from "@/models";
import { getSession } from "@/lib/auth";

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "LUNCH", displayName: "Staff Lunch", fundSource: "DAILY_CASH" as const },
  { name: "TRANSPORT", displayName: "Transportation", fundSource: "DAILY_CASH" as const },
  { name: "SUPPLIES", displayName: "Cleaning & Daily Supplies", fundSource: "DAILY_CASH" as const },
  { name: "SKATE_SHOES", displayName: "Purchasing Skate Shoes", fundSource: "CAPITAL" as const },
  { name: "SNACK_RESTOCK", displayName: "Bulk Concession Restock", fundSource: "CAPITAL" as const },
  { name: "RENT", displayName: "Facility Rent", fundSource: "CAPITAL" as const },
  { name: "MAINTENANCE", displayName: "Equipment Maintenance", fundSource: "BOTH" as const },
  { name: "UTILITIES", displayName: "Electricity & Utilities", fundSource: "BOTH" as const },
  { name: "MARKETING", displayName: "Marketing & Promo", fundSource: "BOTH" as const },
  { name: "OTHER", displayName: "Other Operational", fundSource: "BOTH" as const },
];

export async function GET() {
  try {
    await connectDB();

    // 1. Fetch stored expense categories
    let stored: any[] = await ExpenseCategory.find({}).sort({ displayName: 1 }).lean();

    // 2. Seed defaults if empty
    if (stored.length === 0) {
      for (const d of DEFAULT_EXPENSE_CATEGORIES) {
        await ExpenseCategory.create(d);
      }
      stored = await ExpenseCategory.find({}).sort({ displayName: 1 }).lean();
    }

    // 3. Discover any pre-existing categories in the Expense collection
    const existingCats: string[] = await Expense.distinct("category");
    const storedNames = new Set(stored.map((c: any) => c.name));

    for (const catName of existingCats) {
      if (catName && !storedNames.has(catName)) {
        const prettyDisplay = catName
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");

        const created: any = await ExpenseCategory.create({
          name: catName,
          displayName: prettyDisplay,
          fundSource: "BOTH",
        });
        stored.push(created.toObject ? created.toObject() : created);
        storedNames.add(catName);
      }
    }

    return NextResponse.json({ categories: stored });
  } catch (error) {
    console.error("Fetch expense categories error:", error);
    return NextResponse.json({ error: "Failed to fetch expense categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, displayName, fundSource = "BOTH" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectDB();

    const raw = name.trim();
    const cleanName = raw.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");
    const cleanDisplay = displayName && typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : raw.charAt(0).toUpperCase() + raw.slice(1);

    const validFundSource = ["DAILY_CASH", "CAPITAL", "BOTH"].includes(fundSource)
      ? fundSource
      : "BOTH";

    const category = await ExpenseCategory.findOneAndUpdate(
      { name: cleanName },
      { $setOnInsert: { name: cleanName, displayName: cleanDisplay, fundSource: validFundSource } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error("Create expense category error:", error);
    return NextResponse.json({ error: "Failed to create expense category" }, { status: 500 });
  }
}
