"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { formatETB, exportToCSV, format12HourTime, format12HourDateTime } from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import {
  FileText,
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
  DollarSign,
  Footprints,
  ShoppingBag,
  X,
  Download,
  Flame,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Package,
  AlertCircle,
  Tag,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

interface RegisterData {
  register: {
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
    notes?: string;
    closedAt?: string;
  };
  summary: {
    date: string;
    rentalsCount: number;
    rentalsTotal: number;
    concessionsCount: number;
    concessionsTotal: number;
    grossRevenue: number;
    dailyExpensesTotal: number;
    netOperatingIncome: number;
    channels: {
      cash: {
        openingFloat: number;
        inflow: number;
        outflow: number;
        expectedInDrawer: number;
      };
      telebirr: {
        inflow: number;
      };
      cbe: {
        inflow: number;
      };
    };
  };
}

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
    recentRestocks: Array<any>;
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

type MainTab = "DRAWER" | "FLEET" | "CONCESSION" | "TRAFFIC";

export default function ReportsPage() {
  const { showAlert, showConfirm } = useAlertModal();
  const [activeTab, setActiveTab] = useState<MainTab>("DRAWER");
  const [drawerSubTab, setDrawerSubTab] = useState<"TODAY" | "HISTORY">("TODAY");
  const [selectedRange, setSelectedRange] = useState<string>("7days");

  const [registerData, setRegisterData] = useState<RegisterData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Close shift modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);

  // Fetch register (Today)
  const fetchTodayRegister = async () => {
    try {
      const res = await fetch("/api/register/today");
      if (res.ok) {
        const json = await res.json();
        setRegisterData(json);
        if (json.register?.expectedClosingCash !== undefined) {
          setCountedCash(json.register.expectedClosingCash.toString());
        }
      }
    } catch (e) {
      console.error("Register fetch error:", e);
    }
  };

  // Fetch historical registers
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

  // Fetch analytics data
  const fetchAnalytics = async (rangeKey = selectedRange) => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/reports/analytics?range=${rangeKey}`);
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

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTodayRegister(), fetchAnalytics(selectedRange)]).finally(() => {
      setLoading(false);
    });
  }, []);

  // When switching drawer subtab
  useEffect(() => {
    if (activeTab === "DRAWER" && drawerSubTab === "HISTORY") {
      fetchHistory();
    }
  }, [activeTab, drawerSubTab]);

  // Handle range change
  const handleRangeSelect = (range: string) => {
    setSelectedRange(range);
    fetchAnalytics(range);
  };

  // Close shift handler
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosing(true);

    try {
      const res = await fetch("/api/register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualClosingCash: Number(countedCash),
          notes: closeNotes,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setShowCloseModal(false);
        fetchTodayRegister();
        showAlert({
          title: "Shift Closed",
          message: "The register has been safely closed and locked for today.",
          type: "success",
        });
      } else {
        showAlert({
          title: "Closure Failed",
          message: resJson.error || "Failed to close shift register.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Network Error",
        message: "Network error occurred while closing shift.",
        type: "error",
      });
    } finally {
      setClosing(false);
    }
  };

  // Reopen shift handler
  const handleReopenShift = () => {
    showConfirm({
      title: "Re-Open Shift Register",
      message:
        "Are you sure you want to re-open today's shift register?\n\nStaff will be able to record new rentals, concession transactions, and operating expenses again.",
      confirmText: "Yes, Re-Open Shift",
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/register/open", { method: "POST" });
          if (res.ok) {
            fetchTodayRegister();
            showAlert({
              title: "Shift Re-Opened",
              message: "Today's shift register is now active.",
              type: "success",
            });
          } else {
            showAlert({
              title: "Failed to Re-Open",
              message: "Could not re-open the shift register.",
              type: "error",
            });
          }
        } catch {
          showAlert({
            title: "Network Error",
            message: "Network error communicating with server.",
            type: "error",
          });
        }
      },
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const liveDiscrepancy =
    Number(countedCash || 0) - (registerData?.register.expectedClosingCash || 0);

  // Highest demand size calculation for relative progress bar scaling
  const maxShoeRentals = Math.max(
    ...(analyticsData?.shoeSizeReport.sizes.map((s) => s.rentalsCount) || [1]),
    1
  );

  // Max product revenue for relative progress bar scaling
  const maxProductRevenue = Math.max(
    ...(analyticsData?.topSellingProducts.map((p) => p.grossRevenue) || [1]),
    1
  );

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* ================= PRINT-ONLY OFFICIAL AUDIT SLIP ================= */}
        <div className="hidden print:flex items-center justify-between pb-4 mb-4 border-b-2 border-[#29221E] text-[#29221E]">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-[#E9D9C5] bg-black shrink-0">
              <Image
                src="/logo.jpg"
                alt="Velox Skate Logo"
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#29221E]">VELOX SKATE</h1>
              <p className="text-xs text-[#8B8179]">Daily Shift Closing & Financial Audit Receipt</p>
            </div>
          </div>
          <div className="text-right text-xs text-[#29221E] font-mono">
            <p className="font-bold">Shift Date: {registerData?.summary.date}</p>
            <p className="text-[#8B8179] font-sans text-[11px]">
              Printed: {format12HourDateTime(new Date())}
            </p>
          </div>
        </div>

        {/* ================= TOP HEADER (MOBILE-FIRST) ================= */}
        <div className="flex flex-col gap-3 pb-3 border-b border-[#E9D9C5] print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-[#E9D9C5] shadow-xs shrink-0 bg-black">
                <Image
                  src="/logo.jpg"
                  alt="Velox Skate"
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#29221E]">
                    Business Intelligence & Reports
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5] hidden sm:inline">
                    PRO AUDIT
                  </span>
                </div>
                <p className="text-xs text-[#8B8179]">
                  Performance metrics, fleet bottlenecks, profit margins & cash audit.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-2 text-xs font-bold text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#29221E] hover:text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Print Shift Receipt"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print Receipt</span>
              </button>

              <button
                onClick={() => {
                  fetchTodayRegister();
                  fetchAnalytics(selectedRange);
                }}
                disabled={loading || loadingAnalytics}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading || loadingAnalytics ? "animate-spin text-[#D96827]" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* ================= 4 MAIN REPORT TABS (SCROLLABLE ON MOBILE) ================= */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab("DRAWER")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "DRAWER"
                  ? "bg-[#29221E] text-white shadow-sm"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <Banknote className="h-4 w-4 text-[#D96827]" />
              <span>💵 Cash Drawer & Closing</span>
            </button>

            <button
              onClick={() => setActiveTab("FLEET")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "FLEET"
                  ? "bg-[#29221E] text-white shadow-sm"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <Footprints className="h-4 w-4 text-[#D96827]" />
              <span>⛸️ Skate Fleet & Demand</span>
            </button>

            <button
              onClick={() => setActiveTab("CONCESSION")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "CONCESSION"
                  ? "bg-[#29221E] text-white shadow-sm"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <ShoppingBag className="h-4 w-4 text-[#D96827]" />
              <span>🍿 Concession & Margins</span>
            </button>

            <button
              onClick={() => setActiveTab("TRAFFIC")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "TRAFFIC"
                  ? "bg-[#29221E] text-white shadow-sm"
                  : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              <Clock className="h-4 w-4 text-[#D96827]" />
              <span>⏰ Traffic & Financials</span>
            </button>
          </div>

          {/* ================= DATE RANGE SELECTOR BAR (For Analytics Tabs) ================= */}
          {activeTab !== "DRAWER" && (
            <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-[#E9D9C5] shadow-xs">
              <span className="text-[11px] font-bold text-[#8B8179] uppercase tracking-wider pl-1 hidden sm:inline">
                Timeframe:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
                {[
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "7days", label: "Last 7 Days" },
                  { key: "30days", label: "Last 30 Days" },
                  { key: "all", label: "All Time" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleRangeSelect(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedRange === item.key
                        ? "bg-[#D96827] text-white shadow-xs"
                        : "text-[#8B8179] hover:text-[#29221E] hover:bg-[#FFF4E5]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= TAB 1: CASH DRAWER & SHIFT CLOSING ================= */}
        {activeTab === "DRAWER" && (
          <div className="space-y-6">
            {/* View Switcher: Today's Shift vs Shift History */}
            <div className="flex bg-white border border-[#E9D9C5] rounded-xl p-1 text-xs font-bold shadow-xs w-fit">
              <button
                onClick={() => setDrawerSubTab("TODAY")}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  drawerSubTab === "TODAY"
                    ? "bg-[#D96827] text-white shadow-xs"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                Today&apos;s Shift
              </button>
              <button
                onClick={() => setDrawerSubTab("HISTORY")}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  drawerSubTab === "HISTORY"
                    ? "bg-[#D96827] text-white shadow-xs"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                Shift History & Logs
              </button>
            </div>

            {drawerSubTab === "TODAY" ? (
              <div className="space-y-6">
                {/* 1. Shift Status Banner */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs bg-white ${
                    registerData?.register.status === "CLOSED"
                      ? "border-[#E9D9C5]"
                      : "border-2 border-[#26845B]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl ${
                        registerData?.register.status === "CLOSED"
                          ? "bg-[#F7F6F3] text-[#8B8179]"
                          : "bg-[#EBF5F0] text-[#26845B]"
                      }`}
                    >
                      {registerData?.register.status === "CLOSED" ? (
                        <Lock className="h-6 w-6" />
                      ) : (
                        <Unlock className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-[#29221E]">
                          Shift Date: {registerData?.summary.date}
                        </h2>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            registerData?.register.status === "CLOSED"
                              ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                              : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                          }`}
                        >
                          {registerData?.register.status === "CLOSED"
                            ? "Shift Closed & Locked"
                            : "Shift Open"}
                        </span>
                      </div>
                      <p className="text-xs text-[#8B8179] mt-0.5">
                        {registerData?.register.status === "CLOSED"
                          ? `Closed at ${format12HourTime(registerData?.register.closedAt)}`
                          : "Register is actively recording rentals, concession sales, and petty expenses."}
                      </p>
                    </div>
                  </div>

                  {registerData?.register.status === "OPEN" ? (
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm shadow-[#D94B45]/20 cursor-pointer flex items-center justify-center gap-2 print:hidden"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Count Drawer & Close Shift</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-[#26845B] font-bold bg-[#EBF5F0] px-3 py-1.5 rounded-xl border border-[#26845B]/30 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Reconciled & Finalized</span>
                      </div>
                      <button
                        onClick={handleReopenShift}
                        className="text-xs text-[#8B8179] hover:text-[#29221E] px-2 py-1 underline cursor-pointer print:hidden"
                      >
                        Re-open
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Revenue & Operations Recap Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[10px]">Skate Rentals</span>
                      <Footprints className="h-4 w-4 text-[#D96827]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
                      {formatETB(registerData?.summary.rentalsTotal || 0)}
                    </div>
                    <div className="text-[11px] text-[#8B8179] mt-1">
                      {registerData?.summary.rentalsCount || 0} completed sessions
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[10px]">Snacks & Drinks</span>
                      <ShoppingBag className="h-4 w-4 text-[#D96827]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
                      {formatETB(registerData?.summary.concessionsTotal || 0)}
                    </div>
                    <div className="text-[11px] text-[#8B8179] mt-1">
                      {registerData?.summary.concessionsCount || 0} concession orders
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[10px]">Petty Expenses</span>
                      <span className="text-[#D94B45] font-bold text-[10px]">OpEx</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#D94B45] font-mono">
                      -{formatETB(registerData?.summary.dailyExpensesTotal || 0)}
                    </div>
                    <div className="text-[11px] text-[#8B8179] mt-1">Staff lunch & daily operations</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#26845B]/40 shadow-xs">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[#26845B] text-[10px]">
                        Net Operating Cash
                      </span>
                      <TrendingUp className="h-4 w-4 text-[#26845B]" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#26845B] font-mono">
                      {formatETB(registerData?.summary.netOperatingIncome || 0)}
                    </div>
                    <div className="text-[11px] text-[#8B8179] mt-1">
                      Gross revenue minus petty expenses
                    </div>
                  </div>
                </div>

                {/* 3. Physical Cash Drawer Reconciliation (Formula breakdown) */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-4">
                  <h3 className="text-xs sm:text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-[#D96827]" />
                    Physical Cash Drawer Balancing Formula
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs font-mono">
                    <div>
                      <span className="text-[#8B8179] block uppercase font-sans text-[10px] font-semibold">
                        1. Opening Float
                      </span>
                      <span className="text-base font-bold text-[#29221E]">
                        {formatETB(registerData?.summary.channels.cash.openingFloat || 0)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#8B8179] block uppercase font-sans text-[10px] font-semibold">
                        2. (+) Cash Inflow
                      </span>
                      <span className="text-base font-bold text-[#26845B]">
                        +{formatETB(registerData?.summary.channels.cash.inflow || 0)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#8B8179] block uppercase font-sans text-[10px] font-semibold">
                        3. (-) Daily Outflow
                      </span>
                      <span className="text-base font-bold text-[#D94B45]">
                        -{formatETB(registerData?.summary.channels.cash.outflow || 0)}
                      </span>
                    </div>

                    <div className="pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#E9D9C5] sm:pl-4">
                      <span className="text-[#D96827] block uppercase font-sans text-[10px] font-bold">
                        4. (=) Expected in Drawer
                      </span>
                      <span className="text-lg font-black text-[#29221E]">
                        {formatETB(registerData?.summary.channels.cash.expectedInDrawer || 0)}
                      </span>
                    </div>
                  </div>

                  {registerData?.register.status === "CLOSED" && (
                    <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#8B8179]">Actual Counted Cash: </span>
                        <strong className="text-[#29221E] font-mono text-sm ml-1">
                          {formatETB(registerData.register.actualClosingCash || 0)}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[#8B8179]">Closing Discrepancy: </span>
                        <span
                          className={`font-mono font-bold text-sm ml-1 ${
                            (registerData.register.discrepancy || 0) === 0
                              ? "text-[#26845B]"
                              : (registerData.register.discrepancy || 0) > 0
                              ? "text-[#D96827]"
                              : "text-[#D94B45]"
                          }`}
                        >
                          {(registerData.register.discrepancy || 0) === 0
                            ? "0 ETB (Balanced ✓)"
                            : (registerData.register.discrepancy || 0) > 0
                            ? `+${formatETB(registerData.register.discrepancy || 0)} (Surplus)`
                            : `${formatETB(registerData.register.discrepancy || 0)} (Deficit / Shortage)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Digital Reconciliation Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase font-bold text-[#D96827] flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4" />
                        Telebirr Inflows
                      </span>
                      <span className="text-[10px] text-[#8B8179]">Cross-check with SMS</span>
                    </div>
                    <div className="text-2xl font-black text-[#D96827] font-mono">
                      {formatETB(registerData?.summary.channels.telebirr.inflow || 0)}
                    </div>
                    <p className="text-[11px] text-[#8B8179] mt-2">
                      Confirm against your Telebirr merchant incoming transfer statements.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase font-bold text-[#29221E] flex items-center gap-1.5">
                        <Landmark className="h-4 w-4 text-[#D96827]" />
                        Commercial Bank (CBE) Inflows
                      </span>
                      <span className="text-[10px] text-[#8B8179]">Cross-check with App</span>
                    </div>
                    <div className="text-2xl font-black text-[#29221E] font-mono">
                      {formatETB(registerData?.summary.channels.cbe.inflow || 0)}
                    </div>
                    <p className="text-[11px] text-[#8B8179] mt-2">
                      Confirm against your CBE mobile banking direct deposit notifications.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 1 SUBTAB: HISTORICAL SHIFT ARCHIVE */
              <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#E9D9C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">Closed Shift Registers</h3>
                    <p className="text-xs text-[#8B8179]">Past daily audit logs and cash balancing records</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#8B8179]">Total: {history.length} days</span>
                    {history.length > 0 && (
                      <button
                        onClick={() =>
                          exportToCSV(
                            "Velox_Shift_Reports",
                            [
                              "Date",
                              "Cash Inflow",
                              "Telebirr",
                              "CBE",
                              "Petty Expenses",
                              "Expected Cash",
                              "Counted Cash",
                              "Discrepancy",
                              "Status",
                            ],
                            history.map((h) => [
                              h.date,
                              h.cashInTotal,
                              h.telebirrTotal,
                              h.cbeTotal,
                              h.dailyExpensesTotal,
                              h.expectedClosingCash,
                              h.actualClosingCash || 0,
                              h.discrepancy || 0,
                              h.status,
                            ])
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E9D9C5] text-xs font-semibold text-[#29221E] hover:text-[#D96827] hover:bg-[#FFF4E5] transition-colors shadow-xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-[#D96827]" />
                        <span>Export CSV</span>
                      </button>
                    )}
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="p-12 text-center text-[#8B8179]">
                    <History className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#D96827]" />
                    <p className="text-xs">No historical closed registers found.</p>
                  </div>
                ) : (
                  <div>
                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-[#E9D9C5]">
                      {history.map((h) => (
                        <div key={h._id} className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#29221E]">{h.date}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.status === "CLOSED"
                                  ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                                  : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                              }`}
                            >
                              {h.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F6F3] p-2.5 rounded-xl border border-[#E9D9C5]/60 font-mono">
                            <div>
                              <span className="text-[10px] text-[#8B8179] block font-sans">Cash Inflow:</span>
                              <span className="font-bold text-[#29221E]">{formatETB(h.cashInTotal)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8B8179] block font-sans">Telebirr:</span>
                              <span className="font-bold text-[#D96827]">{formatETB(h.telebirrTotal)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8B8179] block font-sans">CBE Bank:</span>
                              <span className="font-bold text-[#29221E]">{formatETB(h.cbeTotal)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8B8179] block font-sans">Petty Expenses:</span>
                              <span className="font-bold text-[#D94B45]">-{formatETB(h.dailyExpensesTotal)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div>
                              <span className="text-[10px] text-[#8B8179]">Counted Cash: </span>
                              <strong className="font-mono text-[#29221E]">
                                {formatETB(h.actualClosingCash || 0)}
                              </strong>
                            </div>
                            <div>
                              {(h.discrepancy || 0) === 0 ? (
                                <span className="text-xs font-bold text-[#26845B]">✓ Balanced</span>
                              ) : (h.discrepancy || 0) > 0 ? (
                                <span className="text-xs font-bold text-[#D96827]">
                                  +{formatETB(h.discrepancy || 0)} Over
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-[#D94B45]">
                                  {formatETB(h.discrepancy || 0)} Short
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F6F3] uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                          <tr>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3">Cash Inflow</th>
                            <th className="px-5 py-3">Telebirr</th>
                            <th className="px-5 py-3">CBE</th>
                            <th className="px-5 py-3">Petty Expenses</th>
                            <th className="px-5 py-3">Expected Cash</th>
                            <th className="px-5 py-3">Counted Cash</th>
                            <th className="px-5 py-3">Discrepancy</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9D9C5] font-mono">
                          {history.map((h) => (
                            <tr key={h._id} className="hover:bg-[#FFF4E5]/20 transition-colors">
                              <td className="px-5 py-3 font-sans font-bold text-[#29221E]">{h.date}</td>
                              <td className="px-5 py-3 text-[#29221E]">{formatETB(h.cashInTotal)}</td>
                              <td className="px-5 py-3 text-[#D96827]">{formatETB(h.telebirrTotal)}</td>
                              <td className="px-5 py-3 text-[#29221E]">{formatETB(h.cbeTotal)}</td>
                              <td className="px-5 py-3 text-[#D94B45]">-{formatETB(h.dailyExpensesTotal)}</td>
                              <td className="px-5 py-3 text-[#29221E] font-bold">{formatETB(h.expectedClosingCash)}</td>
                              <td className="px-5 py-3 text-[#29221E]">{formatETB(h.actualClosingCash || 0)}</td>
                              <td className="px-5 py-3 font-bold">
                                {(h.discrepancy || 0) === 0 ? (
                                  <span className="text-[#26845B] font-sans">✓ Balanced</span>
                                ) : (h.discrepancy || 0) > 0 ? (
                                  <span className="text-[#D96827] font-sans">+{formatETB(h.discrepancy || 0)}</span>
                                ) : (
                                  <span className="text-[#D94B45] font-sans">{formatETB(h.discrepancy || 0)}</span>
                                )}
                              </td>
                              <td className="px-5 py-3 font-sans">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    h.status === "CLOSED"
                                      ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                                      : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                                  }`}
                                >
                                  {h.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SKATE FLEET & BOTTLENECK REPORT ================= */}
        {activeTab === "FLEET" && analyticsData && (
          <div className="space-y-6">
            {/* Top Insight: Missed Customer Demand Alert Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#FFF4E5] text-[#D96827] shrink-0 mt-0.5 border border-[#E9D9C5]">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#29221E]">
                        Shoe Size Bottleneck & Turnaway Intelligence
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF0EF] text-[#D94B45] border border-[#D94B45]/30">
                        {analyticsData.shoeSizeReport.totalMissedCount} Missed Customers
                      </span>
                    </div>
                    <p className="text-xs text-[#8B8179] mt-0.5">
                      Log of customers turned away when their size was 100% out of stock. Tells you exactly what sizes to buy next.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#F7F6F3] p-3 rounded-xl border border-[#E9D9C5] shrink-0 font-mono">
                  <div>
                    <span className="text-[10px] text-[#8B8179] uppercase block font-sans font-semibold">
                      Estimated Lost Revenue
                    </span>
                    <span className="text-lg font-black text-[#D94B45]">
                      {formatETB(analyticsData.shoeSizeReport.totalLostRevenue)}
                    </span>
                  </div>
                  <div className="border-l border-[#E9D9C5] pl-3">
                    <span className="text-[10px] text-[#8B8179] uppercase block font-sans font-semibold">
                      Fleet Size
                    </span>
                    <span className="text-lg font-black text-[#29221E]">
                      {analyticsData.shoeSizeReport.sizes.reduce((acc, s) => acc + s.fleetCount, 0)} pairs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shoe Size Demand Cards with Number-Based Progress Bars */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                    <Footprints className="h-4 w-4 text-[#D96827]" />
                    Demand & Fleet Utilization by Shoe Size
                  </h3>
                  <p className="text-xs text-[#8B8179]">
                    Sorted by rental volume with purchase recommendations.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#8B8179]">
                  Total: {analyticsData.durationReport.totalRentals} sessions
                </span>
              </div>

              <div className="space-y-4">
                {analyticsData.shoeSizeReport.sizes.map((s) => {
                  const relativePct = Math.round((s.rentalsCount / maxShoeRentals) * 100);
                  const isHighDemand = relativePct >= 70;
                  const hasBottleneck = s.missedDemandCount > 0;

                  return (
                    <div
                      key={s.size}
                      className="p-3.5 sm:p-4 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 hover:bg-[#FFF4E5]/30 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base sm:text-lg font-black text-[#29221E] font-mono bg-white px-2.5 py-1 rounded-lg border border-[#E9D9C5]">
                            Size #{s.size}
                          </span>
                          <span className="text-xs font-semibold text-[#8B8179]">
                            {s.fleetCount} in fleet ({s.inlineCount} Inline / {s.quadCount} Quads)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasBottleneck && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF0EF] text-[#D94B45] border border-[#D94B45]/30">
                              ⚠️ {s.missedDemandCount} Turnaways (-{formatETB(s.estimatedLostRevenue)})
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              hasBottleneck
                                ? "bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]"
                                : "bg-white text-[#8B8179] border border-[#E9D9C5]"
                            }`}
                          >
                            {s.recommendation}
                          </span>
                        </div>
                      </div>

                      {/* Number stats row */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-[#8B8179] font-sans">Rentals: </span>
                          <strong className="text-[#29221E] text-sm">{s.rentalsCount} times</strong>
                        </div>
                        <div>
                          <span className="text-[#8B8179] font-sans">Revenue Generated: </span>
                          <strong className="text-[#D96827] text-sm">{formatETB(s.revenue)}</strong>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-[#E9D9C5]/50 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isHighDemand ? "bg-[#D96827]" : "bg-[#29221E]"
                          }`}
                          style={{ width: `${Math.max(relativePct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session Duration & Extension Breakdown */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#D96827]" />
                    Session Duration & In-Flight Extension Breakdown
                  </h3>
                  <p className="text-xs text-[#8B8179]">
                    Ratio of 30-min standard vs 60-min sessions vs +30m overtime extensions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 30 Minutes */}
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#29221E]">
                      30-Min Sessions
                    </span>
                    <span className="text-xs font-bold text-[#D96827] font-mono">
                      {analyticsData.durationReport.duration30.percentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#29221E] font-mono">
                    {analyticsData.durationReport.duration30.count} sessions
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D96827] h-full rounded-full"
                      style={{ width: `${analyticsData.durationReport.duration30.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    Total: {formatETB(analyticsData.durationReport.duration30.revenue)}
                  </span>
                </div>

                {/* 60 Minutes */}
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#29221E]">
                      60-Min Sessions
                    </span>
                    <span className="text-xs font-bold text-[#29221E] font-mono">
                      {analyticsData.durationReport.duration60.percentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#29221E] font-mono">
                    {analyticsData.durationReport.duration60.count} sessions
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#29221E] h-full rounded-full"
                      style={{ width: `${analyticsData.durationReport.duration60.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    Total: {formatETB(analyticsData.durationReport.duration60.revenue)}
                  </span>
                </div>

                {/* In-Flight Extensions */}
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#26845B]">
                      +30m Extensions
                    </span>
                    <span className="text-xs font-bold text-[#26845B] font-mono">
                      {analyticsData.durationReport.extensions.percentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#26845B] font-mono">
                    {analyticsData.durationReport.extensions.count} extensions
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#26845B] h-full rounded-full"
                      style={{ width: `${analyticsData.durationReport.extensions.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    Total: {formatETB(analyticsData.durationReport.extensions.revenue)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#FFF4E5] rounded-xl border border-[#E9D9C5] text-xs text-[#8B8179]">
                💡 <strong>Fleet Optimization Insight:</strong> Extensions generate pure profit without any equipment turnaround or customer queue friction. Staff should encourage extensions when queue capacity allows.
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CONCESSION & PROFIT MARGINS ================= */}
        {activeTab === "CONCESSION" && analyticsData && (
          <div className="space-y-6">
            {/* Top-Selling Items & Product Profit Margins */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[#D96827]" />
                    Top-Selling Concession Products & Gross Margins
                  </h3>
                  <p className="text-xs text-[#8B8179]">
                    Exact units sold, retail selling price, cost of goods (COGS), and calculated net margin.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#8B8179]">
                  {analyticsData.topSellingProducts.length} active menu items
                </span>
              </div>

              {analyticsData.topSellingProducts.length === 0 ? (
                <div className="p-8 text-center text-[#8B8179] text-xs">
                  No concession sales recorded in this timeframe.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {analyticsData.topSellingProducts.map((p) => {
                    const relativePct = Math.round((p.grossRevenue / maxProductRevenue) * 100);

                    return (
                      <div
                        key={p.productName}
                        className="p-3.5 sm:p-4 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 hover:bg-[#FFF4E5]/30 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-[#29221E]">
                              {p.productName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#8B8179] border border-[#E9D9C5]">
                              {p.category}
                            </span>
                          </div>

                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30 font-mono">
                            {p.marginPct}% Margin
                          </span>
                        </div>

                        {/* Financial metrics breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-[#8B8179] text-[10px] block font-sans">Units Sold:</span>
                            <strong className="text-[#29221E]">{p.unitsSold} units</strong>
                          </div>
                          <div>
                            <span className="text-[#8B8179] text-[10px] block font-sans">Sell / Cost Price:</span>
                            <span className="text-[#29221E]">
                              {formatETB(p.sellingPrice)} / <span className="text-[#8B8179]">{formatETB(p.costPrice)}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[#8B8179] text-[10px] block font-sans">Gross Revenue:</span>
                            <strong className="text-[#D96827]">{formatETB(p.grossRevenue)}</strong>
                          </div>
                          <div>
                            <span className="text-[#8B8179] text-[10px] block font-sans">Gross Profit:</span>
                            <strong className="text-[#26845B]">+{formatETB(p.grossProfit)}</strong>
                          </div>
                        </div>

                        {/* Revenue Progress bar */}
                        <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#D96827] h-full rounded-full transition-all"
                            style={{ width: `${Math.max(relativePct, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Skater's Tab vs Walk-in Concession Split */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#D96827]" />
                  Active Skater Tab vs. Walk-In Counter Sales
                </h3>
                <span className="text-xs font-bold text-[#26845B] bg-[#EBF5F0] px-2.5 py-0.5 rounded-full border border-[#26845B]/30 font-mono">
                  {analyticsData.tabVsWalkin.attachmentRatePct}% Skater Attachment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#29221E]">Skater&apos;s Tab (Linked to Shoe ID)</span>
                    <span className="font-mono font-bold text-[#D96827]">
                      {analyticsData.tabVsWalkin.tabPercentage}%
                    </span>
                  </div>
                  <div className="text-xl font-black text-[#29221E] font-mono">
                    {formatETB(analyticsData.tabVsWalkin.tabRevenue)}
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D96827] h-full rounded-full"
                      style={{ width: `${analyticsData.tabVsWalkin.tabPercentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    {analyticsData.tabVsWalkin.tabSalesCount} orders charged at skate return
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#29221E]">Walk-In Counter (Direct Checkout)</span>
                    <span className="font-mono font-bold text-[#29221E]">
                      {analyticsData.tabVsWalkin.walkinPercentage}%
                    </span>
                  </div>
                  <div className="text-xl font-black text-[#29221E] font-mono">
                    {formatETB(analyticsData.tabVsWalkin.walkinRevenue)}
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#29221E] h-full rounded-full"
                      style={{ width: `${analyticsData.tabVsWalkin.walkinPercentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    {analyticsData.tabVsWalkin.walkinSalesCount} orders paid immediately
                  </span>
                </div>
              </div>
            </div>

            {/* Stock Shrinkage, Expiration & Spoilage Report */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#FDF0EF] rounded-lg text-[#D94B45]">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider">
                      Stock Shrinkage, Spoilage & Loss Audit
                    </h3>
                    <p className="text-xs text-[#8B8179]">
                      Monetary value and units lost to breakage, expiration, or internal staff use.
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] text-[#8B8179] block uppercase font-sans font-semibold">
                    Total Value Lost
                  </span>
                  <span className="text-lg font-black text-[#D94B45]">
                    -{formatETB(analyticsData.shrinkageReport.totalCostShrinkage)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analyticsData.shrinkageReport.byReason.map((r) => (
                  <div key={r.key} className="p-3 bg-[#F7F6F3] rounded-xl border border-[#E9D9C5] space-y-1">
                    <span className="text-[10px] font-bold text-[#8B8179] block uppercase truncate">
                      {r.label}
                    </span>
                    <div className="text-base font-black text-[#29221E] font-mono">
                      {r.units} units
                    </div>
                    <span className="text-xs font-bold text-[#D94B45] font-mono block">
                      -{formatETB(r.cost)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Inventory Restock Outlay summary */}
              <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E9D9C5] text-[#29221E]">
                    <Package className="h-5 w-5 text-[#D96827]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#29221E] uppercase tracking-wider">
                      Inventory Restock Outlay
                    </h4>
                    <p className="text-xs text-[#8B8179]">
                      Capital and bulk stock replenishment expenditures in this period.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right font-mono">
                  <span className="text-lg font-black text-[#29221E]">
                    {formatETB(analyticsData.restockOutlay.totalOutlay)}
                  </span>
                  <span className="text-[10px] text-[#8B8179] block font-sans">
                    {analyticsData.restockOutlay.recentRestocks.length} replenishment orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: PEAK HOURS & FINANCIALS ================= */}
        {activeTab === "TRAFFIC" && analyticsData && (
          <div className="space-y-6">
            {/* Peak Hours & Customer Traffic Progress Bars */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                    <Flame className="h-4 w-4 text-[#D96827]" />
                    Peak Hours & Skater Rush Heatmap (10:00 AM – 9:00 PM)
                  </h3>
                  <p className="text-xs text-[#8B8179]">
                    Number-based hourly skater traffic and rink utilization.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                    ⚡ Peak: 4 PM - 7 PM
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {analyticsData.hourlyTraffic.map((slot) => {
                  const isPeak = slot.trafficLevel === "PEAK";
                  const isSteady = slot.trafficLevel === "STEADY";

                  return (
                    <div
                      key={slot.hour}
                      className="p-3 sm:p-3.5 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 hover:bg-[#FFF4E5]/30 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#29221E] font-mono w-20">
                            {slot.hourLabel}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isPeak
                                ? "bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]"
                                : isSteady
                                ? "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                                : "bg-white text-[#8B8179] border border-[#E9D9C5]"
                            }`}
                          >
                            {isPeak ? "⚡ RUSH PEAK" : isSteady ? "Steady" : "Calm"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono">
                          <strong className="text-[#29221E]">{slot.skaters} skaters</strong>
                          <span className="text-[#8B8179] hidden sm:inline">
                            ({formatETB(slot.revenue)})
                          </span>
                        </div>
                      </div>

                      {/* Number-based progress bar */}
                      <div className="w-full bg-[#E9D9C5]/50 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isPeak
                              ? "bg-[#D96827]"
                              : isSteady
                              ? "bg-[#29221E]"
                              : "bg-[#8B8179]/60"
                          }`}
                          style={{ width: `${Math.max(slot.intensityPct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Overview & Multi-Channel Distribution */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-4 sm:p-6 shadow-xs space-y-5">
              <div className="pb-3 border-b border-[#E9D9C5]">
                <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-[#D96827]" />
                  Executive Financial Summary & Payment Channels Mix
                </h3>
                <p className="text-xs text-[#8B8179]">
                  Combined revenue streams, petty expense deductions, and payment gateway ratios.
                </p>
              </div>

              {/* 3 Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1">
                  <span className="text-[10px] text-[#8B8179] uppercase font-bold block">
                    Gross Business Revenue
                  </span>
                  <div className="text-2xl font-black text-[#29221E] font-mono">
                    {formatETB(analyticsData.financialSummary.grossTotalRevenue)}
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    Rentals ({formatETB(analyticsData.financialSummary.grossRentalRev)}) + Snacks ({formatETB(analyticsData.financialSummary.grossConcessionRev)})
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1">
                  <span className="text-[10px] text-[#8B8179] uppercase font-bold block">
                    Daily Operating Outflow (OpEx)
                  </span>
                  <div className="text-2xl font-black text-[#D94B45] font-mono">
                    -{formatETB(analyticsData.financialSummary.dailyCashOpEx)}
                  </div>
                  <span className="text-[11px] text-[#8B8179] font-mono block">
                    Staff meals, transport & daily running costs
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#EBF5F0] border border-[#26845B]/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#26845B] uppercase font-bold block">
                      Net Operating Cash Flow
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#26845B] font-mono">
                      {analyticsData.financialSummary.operatingMarginPct}% Margin
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#26845B] font-mono">
                    +{formatETB(analyticsData.financialSummary.netOperatingCashFlow)}
                  </div>
                  <span className="text-[11px] text-[#26845B]/80 font-mono block">
                    Realized surplus after daily petty cash
                  </span>
                </div>
              </div>

              {/* Payment Channels Progress Bars */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#29221E] uppercase tracking-wider">
                  Payment Gateway Mix
                </h4>

                {/* Cash */}
                <div className="p-3 bg-[#F7F6F3] rounded-xl border border-[#E9D9C5] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#29221E] flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-[#D96827]" />
                      Physical Cash
                    </span>
                    <span className="font-mono font-bold text-[#29221E]">
                      {analyticsData.financialSummary.channels.percentages.cash}% ({formatETB(analyticsData.financialSummary.channels.amounts.cash)})
                    </span>
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#29221E] h-full rounded-full"
                      style={{ width: `${analyticsData.financialSummary.channels.percentages.cash}%` }}
                    />
                  </div>
                </div>

                {/* Telebirr */}
                <div className="p-3 bg-[#F7F6F3] rounded-xl border border-[#E9D9C5] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#D96827] flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4" />
                      Telebirr Digital
                    </span>
                    <span className="font-mono font-bold text-[#D96827]">
                      {analyticsData.financialSummary.channels.percentages.telebirr}% ({formatETB(analyticsData.financialSummary.channels.amounts.telebirr)})
                    </span>
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#D96827] h-full rounded-full"
                      style={{ width: `${analyticsData.financialSummary.channels.percentages.telebirr}%` }}
                    />
                  </div>
                </div>

                {/* CBE */}
                <div className="p-3 bg-[#F7F6F3] rounded-xl border border-[#E9D9C5] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#29221E] flex items-center gap-1.5">
                      <Landmark className="h-4 w-4 text-[#D96827]" />
                      Commercial Bank of Ethiopia (CBE)
                    </span>
                    <span className="font-mono font-bold text-[#29221E]">
                      {analyticsData.financialSummary.channels.percentages.cbe}% ({formatETB(analyticsData.financialSummary.channels.amounts.cbe)})
                    </span>
                  </div>
                  <div className="w-full bg-[#E9D9C5]/50 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#26845B] h-full rounded-full"
                      style={{ width: `${analyticsData.financialSummary.channels.percentages.cbe}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CLOSE SHIFT MODAL ================= */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#D94B45]" />
                  <h3 className="text-base font-bold text-[#29221E]">Count Drawer & Close Shift</h3>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="mt-4 space-y-4">
                <div className="p-3.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-[#8B8179]">
                    <span>Expected Cash in Drawer:</span>
                    <strong className="text-[#29221E] text-sm">
                      {formatETB(registerData?.register.expectedClosingCash || 0)}
                    </strong>
                  </div>
                  <p className="text-[10px] text-[#8B8179] font-sans italic">
                    Opening Float ({formatETB(registerData?.register.openingCash || 0)}) + Cash Revenue ({formatETB(registerData?.summary.channels.cash.inflow || 0)}) - Daily Expenses ({formatETB(registerData?.summary.dailyExpensesTotal || 0)})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    Actual Physical Cash Counted (ETB)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                {/* Live discrepancy preview */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between font-mono ${
                    liveDiscrepancy === 0
                      ? "bg-[#EBF5F0] border-[#26845B]/30 text-[#26845B]"
                      : liveDiscrepancy > 0
                      ? "bg-[#FFF4E5] border-[#E9D9C5] text-[#D96827]"
                      : "bg-[#FDF0EF] border-[#D94B45]/30 text-[#D94B45]"
                  }`}
                >
                  <span className="font-sans font-semibold">Cash Balance Status:</span>
                  <span className="font-bold text-sm">
                    {liveDiscrepancy === 0
                      ? "0 ETB (Balanced ✓)"
                      : liveDiscrepancy > 0
                      ? `+${formatETB(liveDiscrepancy)} (Surplus)`
                      : `${formatETB(liveDiscrepancy)} (Deficit)`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Closing Notes / Shift Observations (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clean drawer, handed key to owner"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={closing}
                    className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D94B45]/20 cursor-pointer"
                  >
                    {closing ? "Locking..." : "Confirm & Lock Register"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
