import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  Shoe,
  Product,
  CapitalFund,
  DailyRegister,
  User,
  RentalSession,
  Sale,
  Expense,
} from "@/models";
import { formatETB, format12HourTime, format12HourDateTime } from "@/lib/utils";
import {
  AnalyticsChart,
  DayData,
  ChannelData,
  HourData,
} from "@/components/dashboard/AnalyticsChart";
import {
  Timer,
  ShoppingBag,
  Footprints,
  Package,
  Wallet,
  Users,
  CheckCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Banknote,
  Smartphone,
  Landmark,
  TrendingDown,
  Activity,
  Layers,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { startOfDay, endOfDay, subDays, format, getHours } from "date-fns";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  await connectDB();
  const now = new Date();

  // 1. Current Inventory & Fleet Stats
  const totalShoes = await Shoe.countDocuments();
  const availableShoes = await Shoe.countDocuments({ status: "AVAILABLE" });
  const rentedShoes = await Shoe.countDocuments({ status: "RENTED" });
  const maintenanceShoes = await Shoe.countDocuments({ status: "MAINTENANCE" });

  const totalProducts = await Product.countDocuments();
  const lowStockCount = await Product.countDocuments({
    $expr: { $lte: ["$currentStock", "$minStockAlert"] },
  });

  const capital = await CapitalFund.findOne();
  const staffCount = await User.countDocuments();

  const isWeekend = [0, 6].includes(now.getDay());

  // 2. Aggregate 7-Day Performance for the Graph
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
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const todayRentals = await RentalSession.find({
    startedAt: { $gte: todayStart, $lte: todayEnd },
    paymentStatus: "PAID",
  }).lean();

  const todaySales = await Sale.find({
    createdAt: { $gte: todayStart, $lte: todayEnd },
    paymentStatus: "PAID",
  }).lean();

  // Payment Channels today
  const channelData: ChannelData = { cash: 0, telebirr: 0, cbe: 0, total: 0 };
  todayRentals.forEach((r) => {
    const fee = r.totalRentalFee || 0;
    channelData.total += fee;
    if (r.paymentMethod === "TELEBIRR") channelData.telebirr += fee;
    else if (r.paymentMethod === "CBE") channelData.cbe += fee;
    else channelData.cash += fee;
  });
  todaySales.forEach((s) => {
    const amt = s.totalAmount || 0;
    channelData.total += amt;
    if (s.paymentMethod === "TELEBIRR") channelData.telebirr += amt;
    else if (s.paymentMethod === "CBE") channelData.cbe += amt;
    else channelData.cash += amt;
  });

  // Hourly Traffic today (10:00 to 21:00)
  const hourlyData: HourData[] = [];
  const hoursMap: Record<number, number> = {};
  for (let h = 10; h <= 21; h++) {
    hoursMap[h] = 0;
  }
  todayRentals.forEach((r) => {
    const h = getHours(r.startedAt);
    if (hoursMap[h] !== undefined) hoursMap[h]++;
  });

  for (let h = 10; h <= 21; h++) {
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
  const openingFloat = dailyRegister?.openingCash || 500;
  const expectedInDrawer = openingFloat + channelData.cash - todayDay.expenses;
  const isShiftOpen = dailyRegister?.status !== "CLOSED";

  // 5. Recent Activity Feed (Latest 5 items)
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

  type ActivityItem = {
    id: string;
    type: "RENTAL" | "CONCESSION" | "EXPENSE";
    title: string;
    detail: string;
    amount: number;
    time: Date;
    method?: string;
  };

  const activities: ActivityItem[] = [
    ...recentRentals.map((r) => ({
      id: r._id.toString(),
      type: "RENTAL" as const,
      title: `Skate Rental #${r.shoeId}`,
      detail: `${r.skateType === "QUAD" ? "Quads" : "Inline"} • ${r.baseDurationMinutes || 30}m session`,
      amount: r.totalRentalFee || 0,
      time: new Date(r.startedAt),
      method: r.paymentMethod,
    })),
    ...recentSales.map((s) => ({
      id: s._id.toString(),
      type: "CONCESSION" as const,
      title: "Snacks & Drinks Sale",
      detail: `${s.items?.length || 1} item(s) purchased`,
      amount: s.totalAmount || 0,
      time: new Date(s.createdAt),
      method: s.paymentMethod,
    })),
    ...recentExpenses.map((e) => ({
      id: e._id.toString(),
      type: "EXPENSE" as const,
      title: `Expense: ${e.title}`,
      detail: `Reason: ${e.category}`,
      amount: -e.amount,
      time: new Date(e.date),
      method: e.paymentMethod,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 6);

  // Floor occupancy percentage
  const totalFleetTracked = availableShoes + rentedShoes;
  const occupancyPct = totalFleetTracked > 0
    ? Math.round((rentedShoes / totalFleetTracked) * 100)
    : 0;

  return (
    <div className="min-h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 text-[#29221E]">
      {/* 1. TOP EXECUTIVE WELCOME BANNER */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="relative h-14 w-14 sm:h-18 sm:w-18 rounded-2xl overflow-hidden border border-[#E9D9C5] shadow-xs shrink-0 bg-black">
            <Image
              src="/logo.jpg"
              alt="Velox Skate"
              fill
              sizes="72px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26845B] animate-pulse" />
                {isShiftOpen ? "Shift Live & Open" : "Shift Closed"}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isWeekend
                    ? "bg-[#FFF4E5] text-[#D96827] border-[#E9D9C5]"
                    : "bg-[#F7F6F3] text-[#29221E] border-[#E9D9C5]"
                }`}
              >
                {isWeekend
                  ? "Weekend Rates (200 / 300 ETB)"
                  : "Weekday Rates (150 / 250 ETB)"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#29221E]">
              Welcome back, {session.name}
            </h1>
            <p className="text-xs text-[#8B8179] mt-0.5">
              Logged in as <strong className="text-[#29221E]">{session.role}</strong> • Float:{" "}
              <strong className="text-[#29221E] font-mono">{formatETB(openingFloat)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <Link
            href="/rentals"
            className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#D96827]/20 transition-all cursor-pointer"
          >
            <Timer className="h-4 w-4" />
            <span>Open Rental Board</span>
            <ArrowRight className="h-4 w-4 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* 2. TOP 4 EXECUTIVE KPI CARDS (Mobile 2x2 grid, Desktop 4-column) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today's Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#26845B]">
                Today&apos;s Revenue
              </span>
              <div className="p-1.5 rounded-lg bg-[#EBF5F0] text-[#26845B]">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#26845B] font-mono tracking-tight">
              {formatETB(todayDay.gross)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-[#8B8179] truncate">
              Rentals: {formatETB(todayDay.rentals)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] sm:text-[11px] text-[#8B8179]">
            <span>Snacks:</span>
            <span className="font-bold text-[#29221E] font-mono">
              {formatETB(todayDay.concessions)}
            </span>
          </div>
        </div>

        {/* Card 2: Net Operating Income */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D96827]">
                Net Cash Flow
              </span>
              <div className="p-1.5 rounded-lg bg-[#FFF4E5] text-[#D96827]">
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#29221E] font-mono tracking-tight">
              {formatETB(todayDay.net)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-[#8B8179] truncate">
              Minus OpEx: -{formatETB(todayDay.expenses)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] sm:text-[11px] text-[#8B8179]">
            <span>Margin:</span>
            <span className="font-bold text-[#26845B] font-mono">
              {todayDay.gross > 0
                ? `${Math.round((todayDay.net / todayDay.gross) * 100)}%`
                : "100%"}
            </span>
          </div>
        </div>

        {/* Card 3: Live Rink Occupancy */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#29221E]">
                Floor Occupancy
              </span>
              <div className="p-1.5 rounded-lg bg-[#F7F6F3] text-[#29221E]">
                <Footprints className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#D96827]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#29221E] font-mono">
                {rentedShoes}
              </span>
              <span className="text-[11px] sm:text-xs text-[#8B8179]">
                / {availableShoes} ready
              </span>
            </div>
            {/* Occupancy bar */}
            <div className="mt-2 h-1.5 w-full bg-[#F7F6F3] rounded-full overflow-hidden border border-[#E9D9C5]/60">
              <div
                style={{ width: `${Math.min(100, Math.max(5, occupancyPct))}%` }}
                className="h-full bg-[#D96827] rounded-full transition-all duration-500"
              />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] sm:text-[11px] text-[#8B8179]">
            <span>Fleet Load:</span>
            <span className="font-bold text-[#D96827] font-mono">{occupancyPct}%</span>
          </div>
        </div>

        {/* Card 4: Drawer Cash Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF4E5]/70 border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D96827]">
                Drawer Expected
              </span>
              <div className="p-1.5 rounded-lg bg-[#D96827] text-white">
                <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#D96827] font-mono tracking-tight">
              {formatETB(expectedInDrawer)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-[#8B8179] truncate">
              Cash intake: {formatETB(channelData.cash)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E9D9C5] flex items-center justify-between text-[10px] sm:text-[11px] text-[#8B8179]">
            <span>Opening Float:</span>
            <span className="font-bold text-[#29221E] font-mono">
              {formatETB(openingFloat)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CENTERPIECE: INTERACTIVE ANALYTICS & REPORTS WITH GRAPH */}
      <AnalyticsChart
        sevenDaysData={sevenDaysData}
        channelData={channelData}
        hourlyData={hourlyData}
        todayGross={todayDay.gross}
      />

      {/* 4. OPERATIONAL MODULES & LIVE ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Operational Modules Quick Hub */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#29221E] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D96827]" />
              Operational Modules
            </h2>
            <span className="text-xs text-[#8B8179]">Quick Counter Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Module 1: Rental Board */}
            <Link
              href="/rentals"
              className="group p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <Timer className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                    {rentedShoes} Active Skaters
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Rental Timer Board
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Start sessions with +5m grace, monitor live countdowns, shoe swaps, extensions, and returns.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>View Rental Board</span> &rarr;
              </div>
            </Link>

            {/* Module 2: Concession POS */}
            <Link
              href="/concession"
              className="group p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                    POS Register
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Snacks & Drinks POS
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Attach refreshments directly to open skater tabs or process instant walk-in concession sales.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>Open Concession POS</span> &rarr;
              </div>
            </Link>

            {/* Module 3: Shoe Inventory */}
            <Link
              href="/inventory/shoes"
              className="group p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <Footprints className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]">
                    {availableShoes} Available
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Skate Shoes Inventory
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Track individual shoes by asset ID (e.g. SK-40-01), manage Inline Skates vs Quads, and log maintenance.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>Inspect Fleet ({totalShoes})</span> &rarr;
              </div>
            </Link>

            {/* Module 4: Expenses */}
            <Link
              href="/finances"
              className="group p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF0EF] text-[#D94B45] border border-[#D94B45]/20">
                    -{formatETB(todayDay.expenses)} Today
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Expenses Management
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Audit daily operating petty expenses (lunch, transport) and track capital expenditures with custom reasons.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>Manage Expenses</span> &rarr;
              </div>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Live Activity Stream & Shift Reconciliation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#29221E] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#D96827]" />
              Live Pulse
            </h2>
            <span className="text-[11px] text-[#26845B] font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#26845B] animate-ping" />
              Real-time
            </span>
          </div>

          {/* Activity Cards List */}
          <div className="bg-white border border-[#E9D9C5] rounded-3xl p-4 shadow-xs space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8B8179] pb-2 border-b border-[#E9D9C5]">
              Recent Terminal Activity
            </div>

            <div className="divide-y divide-[#E9D9C5]/60 space-y-2">
              {activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8B8179]">
                  No transactions recorded yet today.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`p-1.5 rounded-xl shrink-0 ${
                          act.type === "RENTAL"
                            ? "bg-[#FFF4E5] text-[#D96827]"
                            : act.type === "CONCESSION"
                            ? "bg-[#EBF5F0] text-[#26845B]"
                            : "bg-[#FDF0EF] text-[#D94B45]"
                        }`}
                      >
                        {act.type === "RENTAL" ? (
                          <Timer className="h-3.5 w-3.5" />
                        ) : act.type === "CONCESSION" ? (
                          <ShoppingBag className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-[#29221E] truncate">{act.title}</div>
                        <div className="text-[10px] text-[#8B8179]">{format12HourTime(act.time)}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono font-bold ${
                          act.amount < 0 ? "text-[#D94B45]" : "text-[#29221E]"
                        }`}
                      >
                        {act.amount < 0 ? `-${formatETB(Math.abs(act.amount))}` : formatETB(act.amount)}
                      </div>
                      {act.method && (
                        <div className="text-[9px] text-[#8B8179] font-mono uppercase">
                          {act.method}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Shift Close / Reports Quick Trigger */}
            <div className="pt-3 border-t border-[#E9D9C5]">
              <Link
                href="/reports"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] font-bold text-xs transition-colors border border-[#E9D9C5] cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-[#D96827]" />
                <span>Daily Reports & Drawer Closing</span>
              </Link>
            </div>
          </div>

          {/* Quick Fleet Health Card */}
          <div className="p-4 rounded-3xl bg-[#FFF4E5]/50 border border-[#E9D9C5] text-xs space-y-2.5">
            <div className="flex items-center justify-between text-[#8B8179]">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                Stock & Fleet Alerts
              </span>
              <Package className="h-3.5 w-3.5 text-[#D96827]" />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 rounded-xl bg-white border border-[#E9D9C5]">
                <div className="text-[10px] text-[#8B8179] font-sans">Maintenance:</div>
                <div className="text-sm font-black text-[#29221E]">
                  {maintenanceShoes} skates
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#E9D9C5]">
                <div className="text-[10px] text-[#8B8179] font-sans">Low Stock:</div>
                <div
                  className={`text-sm font-black ${
                    lowStockCount > 0 ? "text-[#D94B45]" : "text-[#26845B]"
                  }`}
                >
                  {lowStockCount} items
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
