import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Category, Product } from "@/models";
import { getSession } from "@/lib/auth";

const DEFAULT_CATEGORIES = [
  { name: "BEVERAGE", displayName: "Drinks & Water" },
  { name: "SNACK", displayName: "Snacks & Food" },
  { name: "OTHER", displayName: "Other Items" },
];

export async function GET() {
  try {
    await connectDB();

    // 1. Get stored categories
    let stored = await Category.find({}).sort({ displayName: 1 }).lean();

    // 2. Ensure defaults exist if empty
    if (stored.length === 0) {
      for (const d of DEFAULT_CATEGORIES) {
        await Category.create(d);
      }
      stored = await Category.find({}).sort({ displayName: 1 }).lean();
    }

    // 3. Check for any categories present on products that aren't stored yet
    const productCategories = await Product.distinct("category");
    const storedNames = new Set(stored.map((c) => c.name));

    for (const catName of productCategories) {
      if (catName && !storedNames.has(catName)) {
        const prettyDisplay = catName
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");

        const created = await Category.create({
          name: catName,
          displayName: prettyDisplay,
        });
        stored.push(created.toObject ? created.toObject() : created);
        storedNames.add(catName);
      }
    }

    return NextResponse.json({ categories: stored });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, displayName } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectDB();

    const raw = name.trim();
    const cleanName = raw.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");
    const cleanDisplay = displayName && typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : raw.charAt(0).toUpperCase() + raw.slice(1);

    const category = await Category.findOneAndUpdate(
      { name: cleanName },
      { $setOnInsert: { name: cleanName, displayName: cleanDisplay } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
