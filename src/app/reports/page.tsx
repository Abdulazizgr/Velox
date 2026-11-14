"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatETB, exportToCSV, format12HourTime, format12HourDateTime } from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import { useLanguage } from "@/lib/i18n";
import {
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Smartphone,
  Landmark,
  Lock,
  Unlock,
  TrendingUp,
  History,
  Calendar,
  Footprints,
  ShoppingBag,
  Download,
  Flame,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import SkateLoading from "@/components/SkateLoading";

interface HistoryItem {
  _id: string;
  date: string;
  openingCash: number;
  cashInTotal: number;
  telebirrTotal: number;
  cbeTotal: number;
  dailyExpensesTotal: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  discrepancy?: number;
  status: "OPEN" | "CLOSED";
  closedAt?: string;
}

interface AnalyticsData {
  range: string;
  dateRange: { start: string; end: string };
  shoeSizeReport: {
    sizes: Array<{
      size: number;
      rentalsCount: number;
      revenue: number;
      inlineCount: number;
      quadCount: number;
      fleetCount: number;
      missedDemandCount: number;
      estimatedLostRevenue: number;
      recommendation: string;
    }>;
    totalMissedCount: number;
    totalLostRevenue: number;
  };
  durationReport: {
    duration30: { count: number; revenue: number; percentage: number };
    duration60: { count: number; revenue: number; percentage: number };
    extensions: { count: number; revenue: number; percentage: number };
    totalRentals: number;
  };
  topSellingProducts: Array<{
    productName: string;
    category: string;
    unitsSold: number;
    sellingPrice: number;
    costPrice: number;
    grossRevenue: number;
    totalCost: number;
    grossProfit: number;
    marginPct: number;
  }>;
  tabVsWalkin: {
    tabSalesCount: number;
    tabRevenue: number;
    tabPercentage: number;
    walkinSalesCount: number;
    walkinRevenue: number;
    walkinPercentage: number;
    attachmentRatePct: number;
  };
  shrinkageReport: {
    totalUnitsShrinkage: number;
    totalCostShrinkage: number;
    byReason: Array<{
      key: string;
      label: string;
      units: number;
      cost: number;
    }>;
    recentAdjustments: Array<{
      _id: string;
      productName: string;
      previousStock: number;
      newStock: number;
      delta: number;
      reason: string;
      reasonLabel?: string;
      costValueLost?: number;
      date: string;
    }>;
  };
  restockOutlay: {
    totalOutlay: number;
    recentRestocks: Array<unknown>;
  };
  financialSummary: {
    grossRentalRev: number;
    grossConcessionRev: number;
    grossTotalRevenue: number;
    dailyCashOpEx: number;
    netOperatingCashFlow: number;
    operatingMarginPct: number;
    channels: {
      amounts: { cash: number; telebirr: number; cbe: number; total: number };
      percentages: { cash: number; telebirr: number; cbe: number };
    };
  };
  hourlyTraffic: Array<{
    hour: number;
    hourLabel: string;
    skaters: number;
    revenue: number;
    trafficLevel: "PEAK" | "STEADY" | "SLOW";
    intensityPct: number;
  }>;
}

type MainTab = "FLEET" | "CONCESSION" | "TRAFFIC" | "DRAWER";
type DateRangeOption = "today" | "yesterday" | "7days" | "30days" | "custom" | "all";
type ProductSortOption = "MARGIN_HIGH" | "MARGIN_LOW" | "UNITS" | "REVENUE";

export default function ReportsPage() {
  const { showAlert, showConfirm } = useAlertModal();
  const { t, lang } = useLanguage();

  const [activeTab, setActiveTab] = useState<MainTab>("FLEET");
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>("7days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Filters within Shoe Demand Tab
  const [shoeFilterSize, setShoeFilterSize] = useState<number | "ALL">("ALL");
  const [shoeFilterType, setShoeFilterType] = useState<"ALL" | "INLINE" | "QUAD">("ALL");

  // Filters within Product Profits Tab
  const [productFilterCat, setProductFilterCat] = useState<string>("ALL");
  const [productSortBy, setProductSortBy] = useState<ProductSortOption>("MARGIN_HIGH");

  // Filter within Past Shifts Archive Tab
  const [historyFilterStatus, setHistoryFilterStatus] = useState<"ALL" | "BALANCED" | "DISCREPANCY">("ALL");

  // Check access: redirect non-owner (staff) to /rentals
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated || data.user?.role !== "OWNER") {
          window.location.href = "/rentals";
        }
      })
      .catch(() => {});
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/register/history");
      if (res.ok) {
        const json = await res.json();
        setHistory(json.registers || []);
      }
    } catch (e) {
      console.error("History fetch error:", e);
    }
  };

  const fetchAnalytics = async (rangeKey = selectedRange, start?: string, end?: string) => {
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (rangeKey === "custom") {
        if (start || customStart) params.set("startDate", start || customStart);
        if (end || customEnd) params.set("endDate", end || customEnd);
      } else {
        params.set("range", rangeKey);
      }

      const res = await fetch(`/api/reports/analytics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (e) {
      console.error("Analytics fetch error:", e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAnalytics("7days"), fetchHistory()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleRangeSelect = (range: DateRangeOption) => {
    setSelectedRange(range);
    if (range !== "custom") {
      fetchAnalytics(range);
    }
  };

  const handleApplyCustomDate = () => {
    if (customStart) {
      fetchAnalytics("custom", customStart, customEnd || customStart);
    }
  };

  const maxShoeRentals = Math.max(
    ...(analyticsData?.shoeSizeReport.sizes.map((s) => s.rentalsCount) || [1]),
    1
  );

  const maxProductRevenue = Math.max(
    ...(analyticsData?.topSellingProducts.map((p) => p.grossRevenue) || [1]),
    1
  );

  // Filtered shoe sizes
  const filteredShoeSizes = useMemo(() => {
    if (!analyticsData?.shoeSizeReport.sizes) return [];
    return analyticsData.shoeSizeReport.sizes.filter((s) => {
      if (shoeFilterSize !== "ALL" && s.size !== shoeFilterSize) return false;
      if (shoeFilterType === "INLINE" && s.inlineCount === 0) return false;
      if (shoeFilterType === "QUAD" && s.quadCount === 0) return false;
      return true;
    });
  }, [analyticsData, shoeFilterSize, shoeFilterType]);

  // Product categories for filter
  const productCategories = useMemo(() => {
    if (!analyticsData?.topSellingProducts) return ["ALL"];
    const cats = Array.from(new Set(analyticsData.topSellingProducts.map((p) => p.category))).filter(Boolean);
    return ["ALL", ...cats];
  }, [analyticsData]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    if (!analyticsData?.topSellingProducts) return [];
    let list = [...analyticsData.topSellingProducts];

    if (productFilterCat !== "ALL") {
      list = list.filter((p) => p.category === productFilterCat);
    }

    if (productSortBy === "MARGIN_HIGH") {
      list.sort((a, b) => b.marginPct - a.marginPct);
    } else if (productSortBy === "MARGIN_LOW") {
      list.sort((a, b) => a.marginPct - b.marginPct);
    } else if (productSortBy === "UNITS") {
      list.sort((a, b) => b.unitsSold - a.unitsSold);
    } else if (productSortBy === "REVENUE") {
      list.sort((a, b) => b.grossRevenue - a.grossRevenue);
    }

    return list;
  }, [analyticsData, productFilterCat, productSortBy]);

  // Filtered shifts history
  const filteredHistory = useMemo(() => {
    if (historyFilterStatus === "BALANCED") {
      return history.filter((h) => (h.discrepancy || 0) === 0);
    }
    if (historyFilterStatus === "DISCREPANCY") {
      return history.filter((h) => (h.discrepancy || 0) !== 0);
    }
    return history;
  }, [history, historyFilterStatus]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <SkateLoading label={t("common.loading", "Loading...")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] pb-16 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ================= TOP HEADER & DAILY DRAWER SHORTCUT ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#29221E]">
                {t("reports.analyticsTitle", "Reports & Analytics Center")}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#29221E] text-white">
                {t("staff.roleOwner", "Owner")}
              </span>
            </div>
            <p className="text-xs text-[#8B8179]">
              {t("reports.analyticsSub", "Fleet demand, product profit margins, peak hours, and shift history")}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/reports/daily"
              className="px-3.5 py-2 bg-[#D96827] hover:bg-[#C2571A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{t("reports.openDailyDrawer", "Today's Drawer Closing")}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => fetchAnalytics(selectedRange)}
              className="p-2 rounded-xl border border-[#E9D9C5] bg-white text-[#8B8179] hover:text-[#D96827] cursor-pointer shadow-xs"
              title={t("common.refresh", "Refresh")}
            >
              <RefreshCw className={`h-4 w-4 ${loadingAnalytics ? "animate-spin text-[#D96827]" : ""}`} />
            </button>
          </div>
        </div>

        {/* ================= 4 MAIN REPORT TABS ================= */}
        <div className="overflow-x-auto scrollbar-none max-w-full pb-0.5">
          <div className="flex items-center gap-1.5 w-max">
            <button
              onClick={() => setActiveTab("FLEET")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "FLEET"
                  ? "bg-[#29221E] text-white shadow-xs"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <Footprints className="h-3.5 w-3.5 text-[#D96827]" />
              <span>{t("reports.shoeDemandTab", "Shoe Demand")}</span>
            </button>

            <button
              onClick={() => setActiveTab("CONCESSION")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "CONCESSION"
                  ? "bg-[#29221E] text-white shadow-xs"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 text-[#D96827]" />
              <span>{t("reports.productProfitsTab", "Product Profits")}</span>
            </button>

            <button
              onClick={() => setActiveTab("TRAFFIC")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "TRAFFIC"
                  ? "bg-[#29221E] text-white shadow-xs"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-[#D96827]" />
              <span>{t("reports.hoursTrafficTab", "Peak Hours")}</span>
            </button>

            <button
              onClick={() => setActiveTab("DRAWER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "DRAWER"
                  ? "bg-[#29221E] text-white shadow-xs"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <History className="h-3.5 w-3.5 text-[#D96827]" />
              <span>{t("reports.shiftHistory", "Past Shifts Archive")}</span>
            </button>
          </div>
        </div>

        {/* ================= DATE RANGE SELECTOR BAR ================= */}
        {activeTab !== "DRAWER" && (
          <div className="p-3 bg-white rounded-2xl border border-[#E9D9C5] shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-[11px] font-bold uppercase text-[#8B8179]">
                {t("concession.dateRange", "Report Date Range")}:
              </span>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
                {(
                  [
                    { id: "today", label: lang === "am" ? "ዛሬ" : "Today" },
                    { id: "yesterday", label: lang === "am" ? "ትናንት" : "Yesterday" },
                    { id: "7days", label: lang === "am" ? "7 ቀናት" : "7 Days" },
                    { id: "30days", label: lang === "am" ? "30 ቀናት" : "30 Days" },
                    { id: "custom", label: t("reports.customRange", "Custom Range") },
                    { id: "all", label: t("reports.allTime", "All Time") },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleRangeSelect(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedRange === item.id
                        ? "bg-[#D96827] text-white shadow-xs"
                        : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            {selectedRange === "custom" && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E9D9C5]/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#8B8179]">{t("concession.startDate", "Start")}:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] text-xs focus:outline-none focus:border-[#D96827]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#8B8179]">{t("concession.endDate", "End")}:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] text-xs focus:outline-none focus:border-[#D96827]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustomDate}
                  disabled={loadingAnalytics}
                  className="px-3.5 py-1.5 rounded-lg bg-[#D96827] text-white font-bold text-xs cursor-pointer hover:bg-[#C2571A] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loadingAnalytics && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{t("reports.apply", "Apply")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading State during tab switches and date filter updates */}
        {loadingAnalytics && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <SkateLoading size="lg" text={t("reports.loadingMetrics", "Loading metrics...")} />
          </div>
        )}

        {/* ================= TAB 1: SHOE FLEET & DEMAND ================= */}
        {!loadingAnalytics && activeTab === "FLEET" && analyticsData && (
          <div className="space-y-4 min-w-0">
            {/* Out of Stock Turnaways Summary Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827] shrink-0 border border-[#E9D9C5]">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-black text-[#29221E]">
                        {t("reports.mostRentedSizes", "Shoe Size Demand & Bottlenecks")}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF0EF] text-[#D94B45]">
                        {analyticsData.shoeSizeReport.totalMissedCount} {t("reports.turnawaysCount", "Turnaways")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8B8179]">
                      {t("reports.turnawaysNote", "Customers turned away when sizes were out of stock.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#F7F6F3] p-2.5 rounded-xl border border-[#E9D9C5] font-mono text-xs shrink-0">
                  <div>
                    <span className="text-[9px] text-[#8B8179] block font-sans font-semibold">
                      {t("reports.lostRevenue", "Lost Revenue")}
                    </span>
                    <strong className="text-[#D94B45]">
                      {formatETB(analyticsData.shoeSizeReport.totalLostRevenue)}
                    </strong>
                  </div>
                  <div className="border-l border-[#E9D9C5] pl-3">
                    <span className="text-[9px] text-[#8B8179] block font-sans font-semibold">
                      {t("reports.fleetSize", "Fleet Size")}
                    </span>
                    <strong className="text-[#29221E]">
                      {analyticsData.shoeSizeReport.sizes.reduce((acc, s) => acc + s.fleetCount, 0)} {t("reports.pairs", "pairs")}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar for Shoes */}
            <div className="p-3 bg-white rounded-2xl border border-[#E9D9C5] shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-[#8B8179]">{t("common.size", "Size")}:</span>
                <select
                  value={shoeFilterSize}
                  onChange={(e) => setShoeFilterSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  className="px-2.5 py-1 rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] font-bold"
                >
                  <option value="ALL">{t("common.all", "All Sizes")}</option>
                  {analyticsData.shoeSizeReport.sizes.map((s) => (
                    <option key={s.size} value={s.size}>
                      #{s.size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase text-[#8B8179]">{t("shoes.type", "Type")}:</span>
                <div className="flex items-center gap-1 bg-[#F7F6F3] p-1 rounded-xl border border-[#E9D9C5]">
                  {(["ALL", "INLINE", "QUAD"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setShoeFilterType(type)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shoeFilterType === type
                          ? "bg-[#D96827] text-white shadow-xs"
                          : "text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      {type === "ALL" ? t("common.all", "All") : type === "INLINE" ? t("common.inline", "Inline") : t("common.quads", "Quads")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shoe Size Demand List */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
                <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                  <Footprints className="h-3.5 w-3.5 text-[#D96827]" />
                  {t("reports.mostRentedSizes", "Demand by Shoe Size")}
                </h3>
                <span className="text-[11px] font-mono text-[#8B8179]">
                  {filteredShoeSizes.reduce((acc, s) => acc + s.rentalsCount, 0)} {t("reports.sessions", "sessions")}
                </span>
              </div>

              <div className="space-y-2.5 min-w-0">
                {filteredShoeSizes.map((s) => {
                  const relativePct = Math.round((s.rentalsCount / maxShoeRentals) * 100);
                  const isHighDemand = relativePct >= 70;
                  const hasBottleneck = s.missedDemandCount > 0;
                  const recLabel = lang === "am"
                    ? s.recommendation.replace("CONSIDER ADDING", "ቢጨመር ይመከራል").replace("FLEET SUFFICIENT", "በቂ ክምችት")
                    : s.recommendation;

                  return (
                    <div
                      key={s.size}
                      className="p-3 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 space-y-2 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <span className="text-xs sm:text-sm font-black text-[#29221E] font-mono bg-white px-2 py-0.5 rounded-lg border border-[#E9D9C5] shrink-0">
                            #{s.size}
                          </span>
                          <span className="text-[11px] text-[#8B8179] truncate">
                            {s.fleetCount} {t("reports.inFleet", "in fleet")} ({s.inlineCount} In / {s.quadCount} Quad)
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            hasBottleneck
                              ? "bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]"
                              : "bg-white text-[#8B8179] border border-[#E9D9C5]"
                          }`}
                        >
                          {recLabel}
                        </span>
                      </div>

                      {hasBottleneck && (
                        <div className="text-[10px] font-bold text-[#D94B45] bg-[#FDF0EF] px-2 py-1 rounded-lg border border-[#D94B45]/20 flex items-center justify-between">
                          <span>⚠️ {s.missedDemandCount} {t("reports.turnawayCustomers", "Turnaway customers")}</span>
                          <span>-{formatETB(s.estimatedLostRevenue)} {t("reports.lost", "lost")}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#8B8179] text-[11px]">
                          {t("reports.rentalsCount", "Rentals")}: <strong className="text-[#29221E]">{s.rentalsCount}</strong>
                        </span>
                        <span className="text-[#8B8179] text-[11px]">
                          {t("reports.revenueGenerated", "Revenue")}: <strong className="text-[#D96827]">{formatETB(s.revenue)}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isHighDemand ? "bg-[#D96827]" : "bg-[#29221E]"}`}
                          style={{ width: `${Math.max(relativePct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session Duration */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#D96827]" />
                {t("reports.sessionRatios", "Session Duration Ratios")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#29221E]">{t("reports.duration30", "30-Min")}</span>
                    <span className="font-mono font-bold text-[#D96827]">
                      {analyticsData.durationReport.duration30.percentage}%
                    </span>
                  </div>
                  <div className="text-lg font-black text-[#29221E] font-mono">
                    {analyticsData.durationReport.duration30.count} {t("reports.sessions", "sessions")}
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D96827] h-full"
                      style={{ width: `${analyticsData.durationReport.duration30.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#8B8179] font-mono block">
                    {formatETB(analyticsData.durationReport.duration30.revenue)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#29221E]">{t("reports.duration60", "60-Min")}</span>
                    <span className="font-mono font-bold text-[#29221E]">
                      {analyticsData.durationReport.duration60.percentage}%
                    </span>
                  </div>
                  <div className="text-lg font-black text-[#29221E] font-mono">
                    {analyticsData.durationReport.duration60.count} {t("reports.sessions", "sessions")}
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#29221E] h-full"
                      style={{ width: `${analyticsData.durationReport.duration60.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#8B8179] font-mono block">
                    {formatETB(analyticsData.durationReport.duration60.revenue)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#26845B]">{t("reports.extensions", "+30m Extension")}</span>
                    <span className="font-mono font-bold text-[#26845B]">
                      {analyticsData.durationReport.extensions.percentage}%
                    </span>
                  </div>
                  <div className="text-lg font-black text-[#26845B] font-mono">
                    {analyticsData.durationReport.extensions.count} {t("reports.sessions", "sessions")}
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#26845B] h-full"
                      style={{ width: `${analyticsData.durationReport.extensions.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#8B8179] font-mono block">
                    {formatETB(analyticsData.durationReport.extensions.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CONCESSION & PRODUCT PROFIT MARGINS ================= */}
        {!loadingAnalytics && activeTab === "CONCESSION" && analyticsData && (
          <div className="space-y-4 min-w-0">
            {/* Filter and Sort Bar for Products */}
            <div className="p-3.5 bg-white rounded-2xl border border-[#E9D9C5] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[11px] font-bold uppercase text-[#8B8179]">{t("stock.category", "Category")}:</span>
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProductFilterCat(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      productFilterCat === cat
                        ? "bg-[#D96827] text-white shadow-xs"
                        : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                    }`}
                  >
                    {cat === "ALL" ? t("common.all", "All") : cat}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#8B8179]" />
                <select
                  value={productSortBy}
                  onChange={(e) => setProductSortBy(e.target.value as ProductSortOption)}
                  className="px-2.5 py-1 rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] font-bold text-xs"
                >
                  <option value="MARGIN_HIGH">{t("reports.sortMarginHigh", "Highest Margin %")}</option>
                  <option value="MARGIN_LOW">{t("reports.sortMarginLow", "Lowest Margin %")}</option>
                  <option value="UNITS">{t("reports.sortUnitsSold", "Most Units Sold")}</option>
                  <option value="REVENUE">{t("reports.grossRevenue", "Highest Revenue")}</option>
                </select>
              </div>
            </div>

            {/* Product Profit Items */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
                <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#D96827]" />
                  {t("reports.topSellingProducts", "Top Selling Items & Margins")}
                </h3>
                <span className="text-[11px] text-[#8B8179] font-mono">
                  {filteredProducts.length} {t("nav.stock", "Items")}
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8B8179]">
                  {t("reports.noConcessionSales", "No concession sales in this period.")}
                </div>
              ) : (
                <div className="space-y-2.5 min-w-0">
                  {filteredProducts.map((p) => {
                    const relativePct = Math.round((p.grossRevenue / maxProductRevenue) * 100);

                    return (
                      <div
                        key={p.productName}
                        className="p-3 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 space-y-2 min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span className="text-xs sm:text-sm font-bold text-[#29221E] truncate">
                              {p.productName}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-[#8B8179] border border-[#E9D9C5] shrink-0">
                              {p.category}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                            p.marginPct >= 50
                              ? "bg-[#EBF5F0] text-[#26845B]"
                              : p.marginPct >= 30
                              ? "bg-[#FFF4E5] text-[#D96827]"
                              : "bg-[#FDF0EF] text-[#D94B45]"
                          }`}>
                            {p.marginPct}% {t("reports.margin", "Margin")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                          <div>{t("reports.sold", "Sold")}: <strong>{p.unitsSold}</strong></div>
                          <div>{t("reports.price", "Price")}: {formatETB(p.sellingPrice)}</div>
                          <div>{t("reports.revenueGenerated", "Revenue")}: <strong className="text-[#D96827]">{formatETB(p.grossRevenue)}</strong></div>
                          <div>{t("reports.profit", "Profit")}: <strong className="text-[#26845B]">+{formatETB(p.grossProfit)}</strong></div>
                        </div>

                        <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              p.marginPct >= 50
                                ? "bg-[#26845B]"
                                : p.marginPct >= 25
                                ? "bg-[#D96827]"
                                : "bg-[#D94B45]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, p.marginPct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tab vs Walk-in split */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-2.5 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#29221E] uppercase">{t("reports.tabVsWalkin", "Skater Tab vs Walk-in")}</span>
                <span className="text-[10px] font-bold text-[#26845B] bg-[#EBF5F0] px-2 py-0.5 rounded-full font-mono">
                  {analyticsData.tabVsWalkin.attachmentRatePct}% {t("reports.attachmentRate", "Skater Attachment")}
                </span>
              </div>

              {/* Combined Progress Bar for Revenue Split */}
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#E9D9C5]/40 border border-[#E9D9C5]">
                <div style={{ width: `${analyticsData.tabVsWalkin.tabPercentage}%` }} className="bg-[#D96827] h-full" />
                <div style={{ width: `${analyticsData.tabVsWalkin.walkinPercentage}%` }} className="bg-[#29221E] h-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#29221E]">{t("reports.skaterTab", "Skater Tab")}</span>
                    <span className="font-mono text-[#D96827] font-bold">{analyticsData.tabVsWalkin.tabPercentage}%</span>
                  </div>
                  <div className="text-base font-black font-mono">{formatETB(analyticsData.tabVsWalkin.tabRevenue)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#29221E]">{t("reports.walkinCounter", "Walk-in Counter")}</span>
                    <span className="font-mono text-[#29221E] font-bold">{analyticsData.tabVsWalkin.walkinPercentage}%</span>
                  </div>
                  <div className="text-base font-black font-mono">{formatETB(analyticsData.tabVsWalkin.walkinRevenue)}</div>
                </div>
              </div>
            </div>

            {/* Shrinkage */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-2.5 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#29221E] uppercase">{t("reports.stockShrinkage", "Stock Shrinkage & Loss")}</span>
                <span className="text-xs font-black text-[#D94B45] font-mono">
                  -{formatETB(analyticsData.shrinkageReport.totalCostShrinkage)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {analyticsData.shrinkageReport.byReason.map((r) => (
                  <div key={r.key} className="p-2 bg-[#F7F6F3] rounded-xl border border-[#E9D9C5] text-xs">
                    <span className="text-[10px] text-[#8B8179] block truncate">{r.label}</span>
                    <div className="font-bold font-mono">{r.units} {t("stock.units", "units")}</div>
                    <span className="text-[10px] text-[#D94B45] font-mono">-{formatETB(r.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PEAK HOURS & TRAFFIC FLOW ================= */}
        {!loadingAnalytics && activeTab === "TRAFFIC" && analyticsData && (
          <div className="space-y-4 min-w-0">
            {/* Peak Hours Flow */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
                <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#D96827]" />
                  {t("reports.hourlyFlow", "Hourly Traffic Flow (7 AM – 10 PM)")}
                </h3>
              </div>

              {analyticsData.hourlyTraffic.every((slot) => slot.skaters === 0) ? (
                <div className="p-8 text-center text-xs text-[#8B8179] bg-[#F7F6F3]/50 rounded-xl border border-dashed border-[#E9D9C5]">
                  {t("reports.noTrafficPeriod", "No skater traffic recorded for this period.")}
                </div>
              ) : (
                <div className="space-y-2 min-w-0">
                  {analyticsData.hourlyTraffic.map((slot) => {
                    const isPeak = slot.trafficLevel === "PEAK";

                  return (
                    <div
                      key={slot.hour}
                      className="p-2.5 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 space-y-1.5 min-w-0"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#29221E] font-mono">{slot.hourLabel}</span>
                        <div className="flex items-center gap-2 font-mono">
                          {isPeak && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827]">
                              {t("dashboard.peak", "PEAK")}
                            </span>
                          )}
                          <strong>{slot.skaters} {t("reports.skaters", "skaters")}</strong>
                        </div>
                      </div>

                      <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPeak ? "bg-[#D96827]" : "bg-[#29221E]"}`}
                          style={{ width: `${Math.max(slot.intensityPct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

            {/* Financial Summary */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-3 min-w-0">
              <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider">
                {t("dashboard.netRevenue", "Financial Summary")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-0.5">
                  <span className="text-[10px] text-[#8B8179] font-bold uppercase">{t("reports.grossRevenue", "Gross Revenue")}</span>
                  <div className="text-lg font-black font-mono">{formatETB(analyticsData.financialSummary.grossTotalRevenue)}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-0.5">
                  <span className="text-[10px] text-[#8B8179] font-bold uppercase">{t("reports.dailyOpEx", "Daily OpEx")}</span>
                  <div className="text-lg font-black text-[#D94B45] font-mono">-{formatETB(analyticsData.financialSummary.dailyCashOpEx)}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#26845B]/30 space-y-0.5">
                  <span className="text-[10px] text-[#26845B] font-bold uppercase">{t("reports.netOperatingCash", "Net Operating Cash")}</span>
                  <div className="text-lg font-black text-[#26845B] font-mono">+{formatETB(analyticsData.financialSummary.netOperatingCashFlow)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: PAST SHIFTS ARCHIVE ================= */}
        {activeTab === "DRAWER" && (
          <div className="space-y-4 min-w-0">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-xs">
              <div className="p-3.5 border-b border-[#E9D9C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#29221E]">{t("reports.pastRegisters", "Past Shifts Archive")}</h3>
                  <p className="text-[11px] text-[#8B8179]">{lang === "am" ? "ያለፉ የሳጥን ቆጠራዎች መዝገብ" : "Historical cash drawer logs"}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1 bg-[#F7F6F3] p-1 rounded-xl border border-[#E9D9C5] text-xs">
                    {(["ALL", "BALANCED", "DISCREPANCY"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setHistoryFilterStatus(st)}
                        className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                          historyFilterStatus === st
                            ? "bg-white text-[#29221E] shadow-2xs"
                            : "text-[#8B8179] hover:text-[#29221E]"
                        }`}
                      >
                        {st === "ALL" ? t("common.all", "All") : st === "BALANCED" ? t("reports.reconciled", "Balanced") : t("reports.difference", "Discrepancy")}
                      </button>
                    ))}
                  </div>

                  {filteredHistory.length > 0 && (
                    <button
                      onClick={() =>
                        exportToCSV(
                          "Velox_Shift_Reports",
                          [
                            "Date",
                            "Cash In",
                            "Telebirr",
                            "CBE",
                            "Total Revenue",
                            "Expenses (OpEx)",
                            "Net Income",
                            "Expected In Drawer",
                            "Counted Cash",
                            "Discrepancy",
                            "Status",
                          ],
                          filteredHistory.map((h) => {
                            const totalRev = (h.cashInTotal || 0) + (h.telebirrTotal || 0) + (h.cbeTotal || 0);
                            const shiftNetIncome = totalRev - (h.dailyExpensesTotal || 0);
                            return [
                              h.date,
                              h.cashInTotal,
                              h.telebirrTotal,
                              h.cbeTotal,
                              totalRev,
                              h.dailyExpensesTotal,
                              shiftNetIncome,
                              h.expectedClosingCash,
                              h.actualClosingCash || 0,
                              h.discrepancy || 0,
                              h.status,
                            ];
                          })
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#E9D9C5] text-xs font-semibold text-[#29221E] hover:text-[#D96827] transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-[#D96827]" />
                      <span>{t("common.downloadCsv", "CSV")}</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-[#8B8179] text-xs">
                  {lang === "am" ? "ምንም ያለፈ ፈረቃ አልተገኘም።" : "No past shifts found."}
                </div>
              ) : (
                <div className="divide-y divide-[#E9D9C5]">
                  {filteredHistory.map((h) => {
                    const totalRev = (h.cashInTotal || 0) + (h.telebirrTotal || 0) + (h.cbeTotal || 0);
                    const shiftNetIncome = totalRev - (h.dailyExpensesTotal || 0);
                    return (
                      <div key={h._id} className="p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#29221E]">{h.date}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              h.status === "CLOSED"
                                ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                                : "bg-[#EBF5F0] text-[#26845B]"
                            }`}
                          >
                            {h.status === "CLOSED" ? t("nav.shiftClosed", "Closed") : t("nav.shiftOpen", "Open")}
                          </span>
                        </div>

                        {/* Revenue Channels Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-xl bg-[#F7F6F3] font-mono text-[11px]">
                          <div>{t("common.cash", "Cash")}: {formatETB(h.cashInTotal)}</div>
                          <div>Telebirr: {formatETB(h.telebirrTotal)}</div>
                          <div>CBE: {formatETB(h.cbeTotal)}</div>
                          <div>OpEx: -{formatETB(h.dailyExpensesTotal)}</div>
                        </div>

                        {/* Shift Net Income Highlight */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#EBF5F0] border border-[#26845B]/30">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TrendingUp className="h-3.5 w-3.5 text-[#26845B] shrink-0" />
                            <span className="text-[11px] font-bold text-[#26845B] uppercase tracking-wide">
                              {t("finances.netIncome", "Net Income")}
                            </span>
                          </div>
                          <span className="font-mono font-black text-xs sm:text-sm text-[#26845B]">
                            {shiftNetIncome >= 0 ? `+${formatETB(shiftNetIncome)}` : `-${formatETB(Math.abs(shiftNetIncome))}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span>
                            {t("reports.actualCounted", "Counted")}: <strong>{formatETB(h.actualClosingCash || 0)}</strong>
                          </span>
                          <span>
                            {(h.discrepancy || 0) === 0 ? (
                              <span className="text-[#26845B] font-bold">✓ {t("reports.balanced", "Balanced")}</span>
                            ) : (h.discrepancy || 0) > 0 ? (
                              <span className="text-[#D96827] font-bold">+{formatETB(h.discrepancy || 0)} {t("reports.surplus", "Surplus")}</span>
                            ) : (
                              <span className="text-[#D94B45] font-bold">{formatETB(h.discrepancy || 0)} {t("reports.shortage", "Shortage")}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
