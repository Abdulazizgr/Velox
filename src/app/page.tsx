import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  Shoe,
  Product,
  CapitalFund,
  DailyRegister,
  RentalSession,
  Sale,
  Expense,
} from "@/models";
import {
  DayData,
  ChannelData,
  HourData,
} from "@/components/dashboard/AnalyticsChart";
import { DashboardClient, ActivityItem } from "@/components/dashboard/DashboardClient";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { getEthiopiaDayBounds, getEthiopiaHour } from "@/lib/dateUtils";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Hide dashboard from staff
  if (session.role !== "OWNER") {
    redirect("/rentals");
  }

  await connectDB();
  const now = new Date();

  // 1. Current Inventory & Fleet Stats
  const availableShoes = await Shoe.countDocuments({ status: "AVAILABLE" });
  const rentedShoes = await Shoe.countDocuments({ status: "RENTED" });
  const maintenanceShoes = await Shoe.countDocuments({ status: "MAINTENANCE" });

  const lowStockCount = await Product.countDocuments({
    $expr: { $lte: ["$currentStock", "$minStockAlert"] },
  });

  // 2. Aggregate 7-Day Performance
  const sevenDaysData: DayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);

    const rentals = await RentalSession.find({
      startedAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: "PAID",
    }).lean();

    const sales = await Sale.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: "PAID",
    }).lean();

    const expenses = await Expense.find({
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    const rentRev = rentals.reduce((acc, r) => acc + (r.totalRentalFee || 0), 0);
    const saleRev = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const expTotal = expenses.reduce((acc, x) => acc + (x.amount || 0), 0);
    const gross = rentRev + saleRev;

    sevenDaysData.push({
      dateStr: format(d, "yyyy-MM-dd"),
      dayLabel: format(d, "EEE"),
      isToday: i === 0,
      rentals: rentRev,
      rentalsCount: rentals.length,
      concessions: saleRev,
      concessionsCount: sales.length,
      expenses: expTotal,
      gross,
      net: gross - expTotal,
    });
  }

  // 3. Today's Specific Calculations
  const todayDay = sevenDaysData[sevenDaysData.length - 1];
  const { start: todayStart, end: todayEnd } = getEthiopiaDayBounds(now);

  const todayRentals = await RentalSession.find({
    startedAt: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: "CANCELLED" },
  }).lean();

  const todaySales = await Sale.find({
    createdAt: { $gte: todayStart, $lte: todayEnd },
    paymentStatus: "PAID",
  }).lean();

  // Payment Channels today
  const channelData: ChannelData = { cash: 0, telebirr: 0, cbe: 0, total: 0 };
  todayRentals.forEach((r) => {
    if (r.paymentStatus === "PAID") {
      const fee = r.totalRentalFee || 0;
      channelData.total += fee;
      if (r.paymentMethod === "TELEBIRR") channelData.telebirr += fee;
      else if (r.paymentMethod === "CBE") channelData.cbe += fee;
      else channelData.cash += fee;
    }
  });
  todaySales.forEach((s) => {
    const amt = s.totalAmount || 0;
    channelData.total += amt;
    if (s.paymentMethod === "TELEBIRR") channelData.telebirr += amt;
    else if (s.paymentMethod === "CBE") channelData.cbe += amt;
    else channelData.cash += amt;
  });

  // Hourly Traffic today in East Africa Time (9:00 to 22:00)
  const hourlyData: HourData[] = [];
  const hoursMap: Record<number, number> = {};
  for (let h = 9; h <= 22; h++) {
    hoursMap[h] = 0;
  }
  todayRentals.forEach((r) => {
    const h = getEthiopiaHour(r.startedAt);
    if (hoursMap[h] !== undefined) hoursMap[h]++;
  });

  for (let h = 9; h <= 22; h++) {
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    hourlyData.push({
      hourLabel: `${hour12}${period}`,
      skaters: hoursMap[h] || 0,
    });
  }

  // 4. Daily Register & Expected Drawer Cash
  const todayStr = format(now, "yyyy-MM-dd");
  const dailyRegister = await DailyRegister.findOne({ date: todayStr });
  const openingFloat = dailyRegister?.openingCash ?? 0;
  const expectedInDrawer = openingFloat + channelData.cash - todayDay.expenses;
  const isShiftOpen = dailyRegister?.status !== "CLOSED";

  // 5. Recent Activity Feed (Latest 6 items)
  const recentRentals = await RentalSession.find()
    .sort({ startedAt: -1 })
    .limit(4)
    .lean();
  const recentSales = await Sale.find()
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();
  const recentExpenses = await Expense.find()
    .sort({ date: -1 })
    .limit(3)
    .lean();

  const activities: ActivityItem[] = [
    ...recentRentals.map((r) => ({
      id: r._id.toString(),
      type: "RENTAL" as const,
      title: `Skate Rental #${r.shoeId}`,
      detail: `${r.skateType === "QUAD" ? "Quads" : "Inline"} • ${r.baseDurationMinutes || 30}m session`,
      amount: r.totalRentalFee || 0,
      time: new Date(r.startedAt).toISOString(),
      method: r.paymentMethod,
    })),
    ...recentSales.map((s) => ({
      id: s._id.toString(),
      type: "CONCESSION" as const,
      title: "Snacks & Drinks Sale",
      detail: `${s.items?.length || 1} item(s) purchased`,
      amount: s.totalAmount || 0,
      time: new Date(s.createdAt).toISOString(),
      method: s.paymentMethod,
    })),
    ...recentExpenses.map((e) => ({
      id: e._id.toString(),
      type: "EXPENSE" as const,
      title: `Expense: ${e.title}`,
      detail: `Reason: ${e.category}`,
      amount: -e.amount,
      time: new Date(e.date).toISOString(),
      method: e.paymentMethod,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  // Floor occupancy percentage
  const totalFleetTracked = availableShoes + rentedShoes;
  const occupancyPct = totalFleetTracked > 0
    ? Math.round((rentedShoes / totalFleetTracked) * 100)
    : 0;

  // 6. Weekly Comparison: This Week (last 7 days) vs Prior Week (days 7 to 13)
  const thisWeekStart = startOfDay(subDays(now, 6));
  const thisWeekEnd = endOfDay(now);
  const priorWeekStart = startOfDay(subDays(now, 13));
  const priorWeekEnd = endOfDay(subDays(now, 7));

  const [thisWeekRentals, priorWeekRentals, thisWeekSales, priorWeekSales] = await Promise.all([
    RentalSession.find({ startedAt: { $gte: thisWeekStart, $lte: thisWeekEnd }, paymentStatus: "PAID" }).lean(),
    RentalSession.find({ startedAt: { $gte: priorWeekStart, $lte: priorWeekEnd }, paymentStatus: "PAID" }).lean(),
    Sale.find({ createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }, paymentStatus: "PAID" }).lean(),
    Sale.find({ createdAt: { $gte: priorWeekStart, $lte: priorWeekEnd }, paymentStatus: "PAID" }).lean(),
  ]);

  const thisWeekRentRev = thisWeekRentals.reduce((acc, r) => acc + (r.totalRentalFee || 0), 0);
  const thisWeekSaleRev = thisWeekSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const priorWeekRentRev = priorWeekRentals.reduce((acc, r) => acc + (r.totalRentalFee || 0), 0);
  const priorWeekSaleRev = priorWeekSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const weeklyComparison = {
    thisWeek: {
      revenue: thisWeekRentRev + thisWeekSaleRev,
      skaters: thisWeekRentals.length,
      concessions: thisWeekSaleRev,
    },
    priorWeek: {
      revenue: priorWeekRentRev + priorWeekSaleRev,
      skaters: priorWeekRentals.length,
      concessions: priorWeekSaleRev,
    },
  };

  return (
    <DashboardClient
      session={{
        name: session.name,
        phone: session.phone,
        role: session.role,
      }}
      openingFloat={openingFloat}
      isShiftOpen={isShiftOpen}
      todayDay={todayDay}
      rentedShoes={rentedShoes}
      availableShoes={availableShoes}
      occupancyPct={occupancyPct}
      expectedInDrawer={expectedInDrawer}
      channelData={channelData}
      sevenDaysData={sevenDaysData}
      hourlyData={hourlyData}
      activities={activities}
      maintenanceShoes={maintenanceShoes}
      lowStockCount={lowStockCount}
      weeklyComparison={weeklyComparison}
    />
  );
}
