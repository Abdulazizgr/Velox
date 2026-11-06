import mongoose from "mongoose";
import { connectDB } from "./mongodb";
import { User, Shoe, Product, CapitalFund, DailyRegister } from "@/models";
import { hashPassword } from "./auth";
import { format } from "date-fns";

export async function seedDatabase() {
  console.log("🌱 Connecting to MongoDB for seeding...");
  await connectDB();

  // 1. Seed Owner Account if not exists
  const existingOwner = await User.findOne({ role: "OWNER" });
  if (!existingOwner) {
    const ownerHash = await hashPassword("1234");
    const owner = await User.create({
      name: "Admin Owner",
      phone: "0911000000",
      passwordHash: ownerHash,
      role: "OWNER",
      isActive: true,
    });
    console.log(`✅ Created default Owner account: Phone: 0911000000 / Password: 1234 (${owner.name})`);
  } else {
    console.log(`ℹ️ Owner already exists: ${existingOwner.name} (${existingOwner.phone})`);
  }

  // 2. Seed Default Staff Member
  const existingStaff = await User.findOne({ phone: "0922000000" });
  if (!existingStaff) {
    const staffHash = await hashPassword("1234");
    await User.create({
      name: "Staff Operator",
      phone: "0922000000",
      passwordHash: staffHash,
      role: "STAFF",
      isActive: true,
    });
    console.log(`✅ Created default Staff account: Phone: 0922000000 / Password: 1234`);
  }

  // 3. Seed Skate Shoes
  const shoeCount = await Shoe.countDocuments();
  if (shoeCount === 0) {
    const sampleShoes = [
      // Size 36 (Quads only)
      { shoeId: "SK-36-01", size: 36, type: "QUAD", status: "AVAILABLE", notes: "Roller Quads" },
      { shoeId: "SK-36-02", size: 36, type: "QUAD", status: "AVAILABLE", notes: "Roller Quads" },
      // Size 37 (Both)
      { shoeId: "SK-37-01", size: 37, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-37-02", size: 37, type: "QUAD", status: "AVAILABLE" },
      // Size 38 (Both)
      { shoeId: "SK-38-01", size: 38, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-38-02", size: 38, type: "QUAD", status: "AVAILABLE" },
      { shoeId: "SK-38-03", size: 38, type: "INLINE", status: "AVAILABLE" },
      // Size 39 (Both)
      { shoeId: "SK-39-01", size: 39, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-39-02", size: 39, type: "QUAD", status: "AVAILABLE" },
      // Size 40 (popular size - Both)
      { shoeId: "SK-40-01", size: 40, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-40-02", size: 40, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-40-03", size: 40, type: "QUAD", status: "AVAILABLE" },
      { shoeId: "SK-40-04", size: 40, type: "QUAD", status: "AVAILABLE" },
      // Size 41 (Both)
      { shoeId: "SK-41-01", size: 41, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-41-02", size: 41, type: "QUAD", status: "AVAILABLE" },
      { shoeId: "SK-41-03", size: 41, type: "INLINE", status: "AVAILABLE" },
      // Size 42 (Both)
      { shoeId: "SK-42-01", size: 42, type: "INLINE", status: "AVAILABLE" },
      { shoeId: "SK-42-02", size: 42, type: "QUAD", status: "AVAILABLE" },
      // Size 43 (Inline only)
      { shoeId: "SK-43-01", size: 43, type: "INLINE", status: "AVAILABLE" },
      // Size 44 (Inline only)
      { shoeId: "SK-44-01", size: 44, type: "INLINE", status: "AVAILABLE" },
    ];

    await Shoe.insertMany(sampleShoes);
    console.log(`✅ Seeded ${sampleShoes.length} skate shoes with unique Shoe IDs.`);
  } else {
    console.log(`ℹ️ Shoes already present in database (${shoeCount} units).`);
  }

  // 4. Seed Products (Snacks & Drinks)
  const productCount = await Product.countDocuments();
  if (productCount === 0) {
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
    console.log(`✅ Seeded ${sampleProducts.length} snack & beverage concession items.`);
  } else {
    console.log(`ℹ️ Products already present in database (${productCount} items).`);
  }

  // 5. Seed Capital Fund
  const fund = await CapitalFund.findOne();
  if (!fund) {
    await CapitalFund.create({
      totalCapital: 50000,
      remainingBalance: 50000,
      lastUpdated: new Date(),
    });
    console.log("✅ Initialized General Capital Fund: 50,000 ETB");
  }

  // 6. Seed Daily Register for Today
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const register = await DailyRegister.findOne({ date: todayStr });
  if (!register) {
    await DailyRegister.create({
      date: todayStr,
      openingCash: 500, // 500 ETB float cash
      cashInTotal: 0,
      telebirrTotal: 0,
      cbeTotal: 0,
      dailyExpensesTotal: 0,
      expectedClosingCash: 500,
      status: "OPEN",
      notes: "Auto-opened for today's shift with 500 ETB float",
    });
    console.log(`✅ Opened Daily Register for ${todayStr} with 500 ETB float`);
  }

  console.log("🎉 Seeding complete!");
}

// Run directly if executed via tsx
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seeding script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}

