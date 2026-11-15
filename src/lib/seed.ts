import mongoose from "mongoose";
import { connectDB } from "./mongodb";
import {
  User,
  Shoe,
  Product,
  Category,
  CapitalFund,
  DailyRegister,
  RentalSession,
  Sale,
  Expense,
  ExpenseCategory,
  MissedDemand,
  StockAdjustment,
} from "@/models";
import { hashPassword } from "./auth";
import { format } from "date-fns";

export async function clearAllData() {
  console.log("🧹 Clearing all existing database collections...");
  await connectDB();
  await Promise.all([
    RentalSession.deleteMany({}),
    Sale.deleteMany({}),
    Expense.deleteMany({}),
    ExpenseCategory.deleteMany({}),
    MissedDemand.deleteMany({}),
    StockAdjustment.deleteMany({}),
    DailyRegister.deleteMany({}),
    CapitalFund.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Shoe.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log("✅ All collections completely cleared.");
}

export async function seedDatabase(clearFirst = true) {
  console.log("🌱 Connecting to MongoDB for seeding...");
  await connectDB();

  if (clearFirst) {
    await clearAllData();
  }

  // 1. Seed Owner Account
  const ownerPhone = "0938087847";
  const ownerPassword = "1234";
  const ownerHash = await hashPassword(ownerPassword);
  const owner = await User.create({
    name: "Admin Owner",
    phone: ownerPhone,
    passwordHash: ownerHash,
    role: "OWNER",
    isActive: true,
  });
  console.log(`✅ Created Owner account: Phone: ${ownerPhone} / Password: ${ownerPassword} (${owner.name})`);

  // 2. Seed Skate Shoes Fleet (Quads prioritized + Inlines + Extended Multi-Size)
  const sampleShoes = [
    // Extended Multi-Size Skates (Quads)
    {
      shoeId: "SK-EXT-S-01",
      size: 31,
      isExtended: true,
      extendedType: "EXTENDED_SMALL",
      coveredSizes: [31, 32, 33, 34],
      type: "QUAD",
      status: "AVAILABLE",
      notes: "Adjustable Small Quads (31-34)",
    },
    {
      shoeId: "SK-EXT-M-01",
      size: 35,
      isExtended: true,
      extendedType: "EXTENDED_MEDIUM",
      coveredSizes: [35, 36, 37, 38],
      type: "QUAD",
      status: "AVAILABLE",
      notes: "Adjustable Medium Quads (35-38)",
    },
    {
      shoeId: "SK-EXT-L-01",
      size: 39,
      isExtended: true,
      extendedType: "EXTENDED_LARGE",
      coveredSizes: [39, 40, 41, 42],
      type: "QUAD",
      status: "AVAILABLE",
      notes: "Adjustable Large Quads (39-42)",
    },

    // Standard Single-Size Quads & Inlines
    { shoeId: "SK-36-01", size: 36, type: "QUAD", status: "AVAILABLE", notes: "Roller Quads" },
    { shoeId: "SK-36-02", size: 36, type: "QUAD", status: "AVAILABLE", notes: "Roller Quads" },
    { shoeId: "SK-37-01", size: 37, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-37-02", size: 37, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-38-01", size: 38, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-38-02", size: 38, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-38-03", size: 38, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-39-01", size: 39, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-39-02", size: 39, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-40-01", size: 40, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-40-02", size: 40, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-40-03", size: 40, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-40-04", size: 40, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-41-01", size: 41, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-41-02", size: 41, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-41-03", size: 41, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-42-01", size: 42, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-42-02", size: 42, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-43-01", size: 43, type: "QUAD", status: "AVAILABLE" },
    { shoeId: "SK-43-02", size: 43, type: "INLINE", status: "AVAILABLE" },
    { shoeId: "SK-44-01", size: 44, type: "INLINE", status: "AVAILABLE" },
  ];

  await Shoe.insertMany(sampleShoes);
  console.log(`✅ Seeded ${sampleShoes.length} skate shoes fleet (Quads & Inlines + Extended).`);

  // 3. Seed Products (Concessions: Beverages & Snacks)
  const sampleProducts = [
    { name: "Coca-Cola 500ml", category: "BEVERAGE", costPrice: 30, sellingPrice: 45, currentStock: 48, minStockAlert: 10 },
    { name: "Sprite 500ml", category: "BEVERAGE", costPrice: 30, sellingPrice: 45, currentStock: 36, minStockAlert: 10 },
    { name: "Fanta Orange 500ml", category: "BEVERAGE", costPrice: 30, sellingPrice: 45, currentStock: 24, minStockAlert: 10 },
    { name: "Ambo Mineral Water 500ml", category: "BEVERAGE", costPrice: 20, sellingPrice: 35, currentStock: 50, minStockAlert: 15 },
    { name: "Still Natural Water 1L", category: "BEVERAGE", costPrice: 25, sellingPrice: 40, currentStock: 30, minStockAlert: 10 },
    { name: "Potato Crisps (Chips)", category: "SNACK", costPrice: 35, sellingPrice: 50, currentStock: 40, minStockAlert: 8 },
    { name: "Cream Biscuits Pack", category: "SNACK", costPrice: 20, sellingPrice: 30, currentStock: 50, minStockAlert: 10 },
    { name: "Energy Drink", category: "BEVERAGE", costPrice: 70, sellingPrice: 100, currentStock: 20, minStockAlert: 5 },
  ];
  await Product.insertMany(sampleProducts);
  console.log(`✅ Seeded ${sampleProducts.length} snack & beverage items.`);

  // 4. Seed General Capital Fund
  await CapitalFund.create({
    initialCapital: 50000,
    totalInjectedCapital: 50000,
    totalCapital: 50000,
    remainingBalance: 50000,
    deposits: [
      {
        amount: 50000,
        source: "INITIAL",
        sourceLabel: "Initial Business Capital",
        notes: "Opening seed capital",
        date: new Date(),
        depositedByName: "System Seed",
      },
    ],
    lastUpdated: new Date(),
  });
  console.log("✅ Initialized General Capital Fund: 50,000 ETB");

  // 5. Seed Daily Shift Register for Today
  const todayStr = format(new Date(), "yyyy-MM-dd");
  await DailyRegister.create({
    date: todayStr,
    openingCash: 500,
    cashInTotal: 0,
    telebirrTotal: 0,
    cbeTotal: 0,
    dailyExpensesTotal: 0,
    expectedClosingCash: 500,
    status: "OPEN",
    notes: "Auto-opened for today's shift with 500 ETB float",
  });
  console.log(`✅ Opened Daily Shift Register for ${todayStr} with 500 ETB float`);

  console.log("🎉 Seeding complete!");
}

// Run directly if executed via tsx
if (require.main === module) {
  seedDatabase(true)
    .then(() => {
      console.log("Seeding script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
