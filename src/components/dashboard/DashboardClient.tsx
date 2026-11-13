"use client";

import Link from "next/link";
import Image from "next/image";
import { formatETB, format12HourTime } from "@/lib/utils";
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
  ArrowRight,
  TrendingUp,
  Sparkles,
  Banknote,
  TrendingDown,
  Activity,
  FileText,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export interface ActivityItem {
  id: string;
  type: "RENTAL" | "CONCESSION" | "EXPENSE";
  title: string;
  detail: string;
  amount: number;
  time: string; // ISO string from server
  method?: string;
}

export interface DashboardClientProps {
  session: {
    name: string;
    phone: string;
    role: string;
  };
  openingFloat: number;
  isShiftOpen: boolean;
  todayDay: DayData;
  rentedShoes: number;
  availableShoes: number;
  occupancyPct: number;
  expectedInDrawer: number;
  channelData: ChannelData;
  sevenDaysData: DayData[];
  hourlyData: HourData[];
  activities: ActivityItem[];
  maintenanceShoes: number;
  lowStockCount: number;
}

export function DashboardClient({
  session,
  openingFloat,
  isShiftOpen,
  todayDay,
  rentedShoes,
  availableShoes,
  occupancyPct,
  expectedInDrawer,
  channelData,
  sevenDaysData,
  hourlyData,
  activities,
  maintenanceShoes,
  lowStockCount,
}: DashboardClientProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 text-[#29221E] overflow-x-hidden">
      {/* 1. TOP WELCOME BANNER (Mobile-First) */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden border border-[#E9D9C5] shadow-xs shrink-0 bg-black">
            <Image
              src="/icon-192.png"
              alt="Velox Skate"
              fill
              sizes="56px"
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26845B] animate-pulse" />
                {isShiftOpen ? t("nav.shiftOpen", "Shift Open") : t("nav.shiftClosed", "Shift Closed")}
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-[#29221E] truncate">
              {t("dashboard.welcome", "Welcome")}, {session.name}
            </h1>
            <p className="text-xs text-[#8B8179] truncate">
              {t("dashboard.float", "Float")}: <strong className="text-[#29221E] font-mono">{formatETB(openingFloat)}</strong>
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start md:self-center">
          <Link
            href="/rentals"
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Timer className="h-4 w-4" />
            <span>{t("dashboard.rentalBoard", "Rental Board")}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 2. TOP 4 KPI CARDS (Mobile 2x2 grid, Desktop 4-column) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
        {/* Card 1: Revenue */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#26845B] truncate">
                {t("dashboard.revenue", "Revenue")}
              </span>
              <div className="p-1 rounded-lg bg-[#EBF5F0] text-[#26845B] shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-[#26845B] font-mono truncate">
              {formatETB(todayDay.gross)}
            </div>
            <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
              {t("dashboard.skatesShare", "Skates")}: {formatETB(todayDay.rentals)}
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] text-[#8B8179]">
            <span>{t("dashboard.cafeShare", "Snacks")}:</span>
            <span className="font-bold text-[#29221E] font-mono truncate">{formatETB(todayDay.concessions)}</span>
          </div>
        </div>

        {/* Card 2: Net Cash */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D96827] truncate">
                {t("dashboard.netCashFlow", "Net Cash")}
              </span>
              <div className="p-1 rounded-lg bg-[#FFF4E5] text-[#D96827] shrink-0">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-[#29221E] font-mono truncate">
              {formatETB(todayDay.net)}
            </div>
            <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
              {t("dashboard.expensesLabel", "Expenses")}: -{formatETB(todayDay.expenses)}
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] text-[#8B8179]">
            <span>{t("dashboard.margin", "Margin")}:</span>
            <span className="font-bold text-[#26845B] font-mono">
              {todayDay.gross > 0 ? `${Math.round((todayDay.net / todayDay.gross) * 100)}%` : "100%"}
            </span>
          </div>
        </div>

        {/* Card 3: Floor Occupancy */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#29221E] truncate">
                {t("dashboard.occupancy", "Occupancy")}
              </span>
              <div className="p-1 rounded-lg bg-[#F7F6F3] text-[#29221E] shrink-0">
                <Footprints className="h-3.5 w-3.5 text-[#D96827]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 truncate">
              <span className="text-base sm:text-2xl font-black text-[#29221E] font-mono">
                {rentedShoes}
              </span>
              <span className="text-[10px] text-[#8B8179] truncate">
                / {availableShoes} {t("dashboard.ready", "ready")}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-[#F7F6F3] rounded-full overflow-hidden border border-[#E9D9C5]/60">
              <div
                style={{ width: `${Math.min(100, Math.max(5, occupancyPct))}%` }}
                className="h-full bg-[#D96827] rounded-full"
              />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] text-[#8B8179]">
            <span>{t("dashboard.load", "Load")}:</span>
            <span className="font-bold text-[#D96827] font-mono">{occupancyPct}%</span>
          </div>
        </div>

        {/* Card 4: Drawer Expected */}
        <div className="p-3 sm:p-4 rounded-2xl bg-[#FFF4E5]/70 border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <div className="flex items-center justify-between text-[#8B8179] mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D96827] truncate">
                {t("dashboard.inDrawer", "In Drawer")}
              </span>
              <div className="p-1 rounded-lg bg-[#D96827] text-white shrink-0">
                <Banknote className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-[#D96827] font-mono truncate">
              {formatETB(expectedInDrawer)}
            </div>
            <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
              {t("dashboard.cashIntake", "Cash In")}: {formatETB(channelData.cash)}
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#E9D9C5] flex items-center justify-between text-[10px] text-[#8B8179]">
            <span>{t("dashboard.float", "Float")}:</span>
            <span className="font-bold text-[#29221E] font-mono truncate">
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
        <div className="lg:col-span-2 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black tracking-tight text-[#29221E] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#D96827]" />
              {t("dashboard.quickActions", "Quick Actions")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            {/* Module 1: Rental Board */}
            <Link
              href="/rentals"
              className="group p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Timer className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B]">
                    {rentedShoes} {t("common.active", "Active")}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  {t("dashboard.rentalBoardCard", "Rental Timer Board")}
                </h3>
                <p className="mt-0.5 text-xs text-[#8B8179]">
                  {t("dashboard.rentalBoardCardSub", "Live countdowns, swaps, and returns.")}
                </p>
              </div>
              <div className="mt-2.5 flex items-center text-xs font-bold text-[#D96827]">
                <span>{t("dashboard.openRentals", "Open Rentals")}</span> &rarr;
              </div>
            </Link>

            {/* Module 2: Concession POS */}
            <Link
              href="/concession"
              className="group p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                    POS
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  {t("dashboard.shopPosCard", "Snacks & Drinks POS")}
                </h3>
                <p className="mt-0.5 text-xs text-[#8B8179]">
                  {t("dashboard.shopPosCardSub", "Direct sales or charge to skater tabs.")}
                </p>
              </div>
              <div className="mt-2.5 flex items-center text-xs font-bold text-[#D96827]">
                <span>{t("dashboard.openPos", "Open POS")}</span> &rarr;
              </div>
            </Link>

            {/* Module 3: Shoe Inventory */}
            <Link
              href="/inventory/shoes"
              className="group p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Footprints className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]">
                    {availableShoes} {t("common.available", "Available")}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  {t("dashboard.shoeCard", "Skate Shoes")}
                </h3>
                <p className="mt-0.5 text-xs text-[#8B8179]">
                  {t("dashboard.shoeCardSub", "Shoe asset IDs, Inlines vs Quads.")}
                </p>
              </div>
              <div className="mt-2.5 flex items-center text-xs font-bold text-[#D96827]">
                <span>{t("dashboard.manageShoes", "Manage Shoes")}</span> &rarr;
              </div>
            </Link>

            {/* Module 4: Expenses */}
            <Link
              href="/finances"
              className="group p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF0EF] text-[#D94B45]">
                    -{formatETB(todayDay.expenses)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  {t("dashboard.expensesCard", "Expenses")}
                </h3>
                <p className="mt-0.5 text-xs text-[#8B8179]">
                  {t("dashboard.expensesCardSub", "Daily petty cash & operating costs.")}
                </p>
              </div>
              <div className="mt-2.5 flex items-center text-xs font-bold text-[#D96827]">
                <span>{t("dashboard.viewExpenses", "View Expenses")}</span> &rarr;
              </div>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Live Activity Stream & Shift Reconciliation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#29221E] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#D96827]" />
              {t("dashboard.livePulse", "Live Pulse")}
            </h2>
            <span className="text-[11px] text-[#26845B] font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#26845B] animate-ping" />
              {t("dashboard.realtime", "Real-time")}
            </span>
          </div>

          {/* Activity Cards List */}
          <div className="bg-white border border-[#E9D9C5] rounded-3xl p-4 shadow-xs space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8B8179] pb-2 border-b border-[#E9D9C5]">
              {t("dashboard.recentTerminalActivity", "Recent Terminal Activity")}
            </div>

            <div className="divide-y divide-[#E9D9C5]/60 space-y-2">
              {activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8B8179]">
                  {t("dashboard.noTransactions", "No transactions recorded yet today.")}
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
                        <div className="text-[10px] text-[#8B8179]">{format12HourTime(new Date(act.time))}</div>
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
                <span>{t("dashboard.reportsAndDrawerClosing", "Daily Reports & Drawer Closing")}</span>
              </Link>
            </div>
          </div>

          {/* Quick Fleet Health Card */}
          <div className="p-4 rounded-3xl bg-[#FFF4E5]/50 border border-[#E9D9C5] text-xs space-y-2.5">
            <div className="flex items-center justify-between text-[#8B8179]">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {t("dashboard.alertsTitle", "Stock & Fleet Alerts")}
              </span>
              <Package className="h-3.5 w-3.5 text-[#D96827]" />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 rounded-xl bg-white border border-[#E9D9C5]">
                <div className="text-[10px] text-[#8B8179] font-sans">{t("common.maintenance", "Maintenance")}:</div>
                <div className="text-sm font-black text-[#29221E]">
                  {maintenanceShoes} {t("common.pairs", "pairs")}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#E9D9C5]">
                <div className="text-[10px] text-[#8B8179] font-sans">{t("stock.lowStockAlert", "Low Stock")}:</div>
                <div
                  className={`text-sm font-black ${
                    lowStockCount > 0 ? "text-[#D94B45]" : "text-[#26845B]"
                  }`}
                >
                  {lowStockCount} {t("common.units", "units")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
