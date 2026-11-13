"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatETB, exportToCSV, format12HourTime, format12HourDateTime } from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import { useLanguage } from "@/lib/i18n";
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
  Footprints,
  ShoppingBag,
  X,
  Download,
  Flame,
  Clock,
  Package,
  ShieldAlert,
  Tag,
  Edit3,
} from "lucide-react";
import SkateLoading from "@/components/SkateLoading";

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
  const { t, lang } = useLanguage();
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
  const [closingFloat, setClosingFloat] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);

  // Quick edit float modal state
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [quickFloat, setQuickFloat] = useState("");
  const [updatingFloat, setUpdatingFloat] = useState(false);

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

  // Fetch register (Today)
  const fetchTodayRegister = async () => {
    try {
      const res = await fetch("/api/register/today");
      if (res.ok) {
        const json = await res.json();
        setRegisterData(json);
        const floatVal = json.register?.openingCash ?? 0;
        setClosingFloat(floatVal.toString());
        setQuickFloat(floatVal.toString());
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

  const handleRangeSelect = (range: string) => {
    setSelectedRange(range);
    fetchAnalytics(range);
  };

  // Quick edit float
  const handleUpdateFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingFloat(true);
    try {
      const res = await fetch("/api/register/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCash: Number(quickFloat) }),
      });
      if (res.ok) {
        setShowFloatModal(false);
        fetchTodayRegister();
        showAlert({
          title: "Float Updated",
          message: `Drawer float set to ${formatETB(Number(quickFloat))}.`,
          type: "success",
        });
      } else {
        showAlert({ title: "Error", message: "Failed to update float", type: "error" });
      }
    } catch {
      showAlert({ title: "Error", message: "Network error", type: "error" });
    } finally {
      setUpdatingFloat(false);
    }
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
          openingCash: Number(closingFloat),
          notes: closeNotes,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setShowCloseModal(false);
        fetchTodayRegister();
        showAlert({
          title: "Shift Closed",
          message: "The register has been safely closed and locked.",
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
      message: "Are you sure you want to re-open today's register?",
      confirmText: "Yes, Re-Open",
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/register/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ openingCash: Number(closingFloat) || 0 }),
          });
          if (res.ok) {
            fetchTodayRegister();
            showAlert({
              title: "Shift Re-Opened",
              message: "Today's shift register is now active.",
              type: "success",
            });
          } else {
            showAlert({ title: "Failed", message: "Could not re-open register.", type: "error" });
          }
        } catch {
          showAlert({ title: "Error", message: "Network error", type: "error" });
        }
      },
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Live expected cash calculation based on user-typed float
  const activeFloat = closingFloat !== "" ? Number(closingFloat) : (registerData?.register.openingCash || 0);
  const liveExpectedClosingCash =
    activeFloat +
    (registerData?.summary.channels.cash.inflow || 0) -
    (registerData?.summary.dailyExpensesTotal || 0);

  const liveDiscrepancy = Number(countedCash || 0) - liveExpectedClosingCash;

  const maxShoeRentals = Math.max(
    ...(analyticsData?.shoeSizeReport.sizes.map((s) => s.rentalsCount) || [1]),
    1
  );

  const maxProductRevenue = Math.max(
    ...(analyticsData?.topSellingProducts.map((p) => p.grossRevenue) || [1]),
    1
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <SkateLoading label="Loading Reports..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] pb-16 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ================= PRINT-ONLY RECEIPT ================= */}
        <div className="hidden print:flex items-center justify-between pb-4 mb-4 border-b-2 border-[#29221E] text-[#29221E]">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-[#E9D9C5] bg-black shrink-0">
              <Image src="/icon-192.png" alt="Velox" fill sizes="48px" className="object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#29221E]">{t("login.title", "VELOX SKATE")}</h1>
              <p className="text-xs text-[#8B8179]">{t("reports.title", "Shift Closing & Cash Audit")}</p>
            </div>
          </div>
          <div className="text-right text-xs text-[#29221E] font-mono">
            <p className="font-bold">{t("common.date", "Date")}: {registerData?.summary.date}</p>
            <p className="text-[#8B8179] text-[11px]">{format12HourDateTime(new Date())}</p>
          </div>
        </div>

        {/* ================= HEADER (MOBILE-FIRST) ================= */}
        <div className="flex flex-col gap-3 pb-3 border-b border-[#E9D9C5] print:hidden min-w-0">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden border border-[#E9D9C5] shadow-xs shrink-0 bg-black">
                <Image src="/icon-192.png" alt="Velox" fill sizes="44px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black tracking-tight text-[#29221E] truncate">
                  {t("reports.title", "Reports & Audits")}
                </h1>
                <p className="text-[11px] text-[#8B8179] truncate">
                  {t("reports.subtitle", "Cash balancing, shoe demand & profit margins")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handlePrint}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#29221E] hover:text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title={t("reports.printReceipt", "Print Shift Receipt")}
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("reports.printReceipt", "Print")}</span>
              </button>

              <button
                onClick={() => {
                  fetchTodayRegister();
                  fetchAnalytics(selectedRange);
                }}
                disabled={loadingAnalytics}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingAnalytics ? "animate-spin text-[#D96827]" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* ================= 4 MAIN REPORT TABS (HORIZONTAL SCROLL ON MOBILE) ================= */}
          <div className="overflow-x-auto scrollbar-none max-w-full pb-0.5">
            <div className="flex items-center gap-1.5 w-max">
              <button
                onClick={() => setActiveTab("DRAWER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "DRAWER"
                    ? "bg-[#29221E] text-white shadow-xs"
                    : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                }`}
              >
                <Banknote className="h-3.5 w-3.5 text-[#D96827]" />
                <span>{t("reports.cashDrawerTab", "Cash Drawer")}</span>
              </button>

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
            </div>
          </div>

          {/* ================= DATE RANGE SELECTOR BAR ================= */}
          {activeTab !== "DRAWER" && (
            <div className="overflow-x-auto scrollbar-none max-w-full">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E9D9C5] shadow-xs w-max">
                {[
                  { key: "today", label: t("expenses.today", "Today") },
                  { key: "yesterday", label: t("expenses.yesterday", "Yesterday") },
                  { key: "7days", label: t("expenses.past7Days", "7 Days") },
                  { key: "30days", label: t("expenses.thisMonth", "30 Days") },
                  { key: "all", label: t("expenses.allTime", "All Time") },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleRangeSelect(item.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedRange === item.key
                        ? "bg-[#D96827] text-white shadow-xs"
                        : "text-[#8B8179] hover:text-[#29221E]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= TAB 1: CASH DRAWER & CLOSING ================= */}
        {activeTab === "DRAWER" && (
          <div className="space-y-4 min-w-0">
            {/* View Switcher: Today vs History */}
            <div className="flex bg-white border border-[#E9D9C5] rounded-xl p-1 text-xs font-bold shadow-xs w-fit">
              <button
                onClick={() => setDrawerSubTab("TODAY")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  drawerSubTab === "TODAY"
                    ? "bg-[#D96827] text-white shadow-xs"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                {t("dashboard.today", "Today")}
              </button>
              <button
                onClick={() => setDrawerSubTab("HISTORY")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  drawerSubTab === "HISTORY"
                    ? "bg-[#D96827] text-white shadow-xs"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                {t("reports.pastRegisters", "Past Shifts")}
              </button>
            </div>

            {drawerSubTab === "TODAY" ? (
              <div className="space-y-4 min-w-0">
                {/* 1. Shift Status Banner */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs bg-white ${
                    registerData?.register.status === "CLOSED"
                      ? "border-[#E9D9C5]"
                      : "border-2 border-[#26845B]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        registerData?.register.status === "CLOSED"
                          ? "bg-[#F7F6F3] text-[#8B8179]"
                          : "bg-[#EBF5F0] text-[#26845B]"
                      }`}
                    >
                      {registerData?.register.status === "CLOSED" ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <Unlock className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-black text-[#29221E] truncate">
                          {lang === "am" ? "ፈረቃ" : "Shift"}: {registerData?.summary.date}
                        </h2>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            registerData?.register.status === "CLOSED"
                              ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                              : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                          }`}
                        >
                          {registerData?.register.status === "CLOSED" ? t("nav.shiftClosed", "Closed") : t("nav.shiftOpen", "Open")}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B8179] truncate">
                        {registerData?.register.status === "CLOSED"
                          ? `${lang === "am" ? "የተዘጋበት ሰዓት" : "Closed at"} ${format12HourTime(registerData?.register.closedAt)}`
                          : `${t("dashboard.float", "Float")}: ${formatETB(registerData?.register.openingCash || 0)}`}
                      </p>
                    </div>
                  </div>

                  {registerData?.register.status === "OPEN" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setQuickFloat((registerData?.register.openingCash || 0).toString());
                          setShowFloatModal(true);
                        }}
                        className="px-3 py-2 bg-white hover:bg-[#F7F6F3] text-[#29221E] font-bold text-xs rounded-xl border border-[#E9D9C5] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#D96827]" />
                        <span>{t("reports.editFloatButton", "Edit Float")}</span>
                      </button>

                      <button
                        onClick={() => {
                          setClosingFloat((registerData?.register.openingCash || 0).toString());
                          setShowCloseModal(true);
                        }}
                        className="px-4 py-2 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 print:hidden"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>{t("reports.closeShiftButton", "Close Shift")}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-xs text-[#26845B] font-bold bg-[#EBF5F0] px-2.5 py-1 rounded-xl border border-[#26845B]/30 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{t("reports.reconciled", "Reconciled")}</span>
                      </div>
                      <button
                        onClick={handleReopenShift}
                        className="text-xs text-[#8B8179] hover:text-[#29221E] px-2 py-1 underline cursor-pointer print:hidden"
                      >
                        {t("reports.reopen", "Re-open")}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Revenue & Operations Recap Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs min-w-0">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[10px]">{t("nav.rentals", "Rentals")}</span>
                      <Footprints className="h-3.5 w-3.5 text-[#D96827]" />
                    </div>
                    <div className="text-base sm:text-xl font-black text-[#29221E] font-mono truncate">
                      {formatETB(registerData?.summary.rentalsTotal || 0)}
                    </div>
                    <div className="text-[10px] text-[#8B8179] mt-0.5 truncate">
                      {registerData?.summary.rentalsCount || 0} {t("common.units", "sessions")}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs min-w-0">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[10px]">{t("nav.pos", "Concessions")}</span>
                      <ShoppingBag className="h-3.5 w-3.5 text-[#D96827]" />
                    </div>
                    <div className="text-base sm:text-xl font-black text-[#29221E] font-mono truncate">
                      {formatETB(registerData?.summary.concessionsTotal || 0)}
                    </div>
                    <div className="text-[10px] text-[#8B8179] mt-0.5 truncate">
                      {registerData?.summary.concessionsCount || 0} {t("expenses.entries", "orders")}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs min-w-0">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[10px]">{t("nav.expenses", "Expenses")}</span>
                      <span className="text-[#D94B45] font-bold text-[10px]">OpEx</span>
                    </div>
                    <div className="text-base sm:text-xl font-black text-[#D94B45] font-mono truncate">
                      -{formatETB(registerData?.summary.dailyExpensesTotal || 0)}
                    </div>
                    <div className="text-[10px] text-[#8B8179] mt-0.5 truncate">{t("expenses.dailyExpensesDesc", "Petty cash")}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-[#26845B]/40 shadow-xs min-w-0">
                    <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                      <span className="uppercase font-semibold text-[#26845B] text-[10px]">
                        {t("dashboard.netCashFlow", "Net Cash")}
                      </span>
                      <TrendingUp className="h-3.5 w-3.5 text-[#26845B]" />
                    </div>
                    <div className="text-base sm:text-xl font-black text-[#26845B] font-mono truncate">
                      {formatETB(registerData?.summary.netOperatingIncome || 0)}
                    </div>
                    <div className="text-[10px] text-[#8B8179] mt-0.5 truncate">{t("reports.dailyExpensesTotal", "After expenses")}</div>
                  </div>
                </div>

                {/* 3. Physical Cash Drawer Balancing */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-[#D96827]" />
                      {t("reports.cashDrawerTab", "Cash Drawer Balancing")}
                    </h3>
                    <button
                      onClick={() => {
                        setQuickFloat((registerData?.register.openingCash || 0).toString());
                        setShowFloatModal(true);
                      }}
                      className="text-xs text-[#D96827] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>{t("reports.editFloatButton", "Edit Float")}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs font-mono">
                    <div>
                      <span className="text-[#8B8179] block font-sans text-[10px]">1. {t("dashboard.float", "Float")}</span>
                      <strong className="text-[#29221E] text-sm">
                        {formatETB(registerData?.summary.channels.cash.openingFloat || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#8B8179] block font-sans text-[10px]">2. (+) {t("dashboard.cashIntake", "Cash In")}</span>
                      <strong className="text-[#26845B] text-sm">
                        +{formatETB(registerData?.summary.channels.cash.inflow || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#8B8179] block font-sans text-[10px]">3. (-) {t("dashboard.minusExpenses", "Outflow")}</span>
                      <strong className="text-[#D94B45] text-sm">
                        -{formatETB(registerData?.summary.channels.cash.outflow || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#D96827] block font-sans text-[10px] font-bold">
                        4. (=) {t("reports.expectedCash", "Expected")}
                      </span>
                      <strong className="text-[#29221E] text-sm">
                        {formatETB(registerData?.summary.channels.cash.expectedInDrawer || 0)}
                      </strong>
                    </div>
                  </div>

                  {registerData?.register.status === "CLOSED" && (
                    <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[#8B8179]">{t("reports.actualCounted", "Actual Counted:")} </span>
                        <strong className="text-[#29221E] font-mono text-sm ml-1">
                          {formatETB(registerData.register.actualClosingCash || 0)}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[#8B8179]">{t("reports.difference", "Discrepancy:")} </span>
                        <span
                          className={`font-mono font-bold text-xs ml-1 ${
                            (registerData.register.discrepancy || 0) === 0
                              ? "text-[#26845B]"
                              : (registerData.register.discrepancy || 0) > 0
                              ? "text-[#D96827]"
                              : "text-[#D94B45]"
                          }`}
                        >
                          {(registerData.register.discrepancy || 0) === 0
                            ? t("reports.balanced", "Balanced ✓")
                            : (registerData.register.discrepancy || 0) > 0
                            ? `+${formatETB(registerData.register.discrepancy || 0)} ${t("reports.surplus", "Surplus")}`
                            : `${formatETB(registerData.register.discrepancy || 0)} ${t("reports.shortage", "Shortage")}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Digital Reconciliation Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#D96827] flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5" />
                        Telebirr
                      </span>
                      <span className="text-[10px] text-[#8B8179]">SMS check</span>
                    </div>
                    <div className="text-xl font-black text-[#D96827] font-mono">
                      {formatETB(registerData?.summary.channels.telebirr.inflow || 0)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#29221E] flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-[#D96827]" />
                        CBE Bank
                      </span>
                      <span className="text-[10px] text-[#8B8179]">App check</span>
                    </div>
                    <div className="text-xl font-black text-[#29221E] font-mono">
                      {formatETB(registerData?.summary.channels.cbe.inflow || 0)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 1 SUBTAB: HISTORICAL REGISTERS */
              <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-[#E9D9C5] flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#29221E]">{t("reports.pastRegisters", "Past Shifts")}</h3>
                    <p className="text-[11px] text-[#8B8179]">{lang === "am" ? "ያለፉ የሳጥን ቆጠራዎች መዝገብ" : "Historical cash drawer logs"}</p>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={() =>
                        exportToCSV(
                          "Velox_Shift_Reports",
                          [
                            "Date",
                            "Cash In",
                            "Telebirr",
                            "CBE",
                            "Expenses",
                            "Expected",
                            "Counted",
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#E9D9C5] text-xs font-semibold text-[#29221E] hover:text-[#D96827] transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-[#D96827]" />
                      <span>{t("common.downloadCsv", "CSV")}</span>
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="p-8 text-center text-[#8B8179] text-xs">
                    {lang === "am" ? "ምንም ያለፈ ፈረቃ አልተገኘም።" : "No past shifts found."}
                  </div>
                ) : (
                  <div className="divide-y divide-[#E9D9C5]">
                    {history.map((h) => (
                      <div key={h._id} className="p-3 space-y-1.5 text-xs">
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

                        <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[#F7F6F3] font-mono text-[11px]">
                          <div>{t("common.cash", "Cash")}: {formatETB(h.cashInTotal)}</div>
                          <div>Telebirr: {formatETB(h.telebirrTotal)}</div>
                          <div>CBE: {formatETB(h.cbeTotal)}</div>
                          <div>OpEx: -{formatETB(h.dailyExpensesTotal)}</div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span>{t("reports.actualCounted", "Counted")}: <strong>{formatETB(h.actualClosingCash || 0)}</strong></span>
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
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SKATE FLEET & DEMAND (MOBILE-FIRST) ================= */}
        {activeTab === "FLEET" && analyticsData && (
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
                        {t("reports.mostRentedSizes", "Shoe Size Demand")}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#FDF0EF] text-[#D94B45]">
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

            {/* Shoe Size Demand List (Mobile First, Clean Layout) */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
                <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                  <Footprints className="h-3.5 w-3.5 text-[#D96827]" />
                  {t("reports.mostRentedSizes", "Demand by Shoe Size")}
                </h3>
                <span className="text-[11px] font-mono text-[#8B8179]">
                  {analyticsData.durationReport.totalRentals} {t("reports.sessions", "sessions")}
                </span>
              </div>

              <div className="space-y-2.5 min-w-0">
                {analyticsData.shoeSizeReport.sizes.map((s) => {
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
                      {/* Row 1: Size & Recommendation */}
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

                      {/* Row 2: Turnaways Alert if any */}
                      {hasBottleneck && (
                        <div className="text-[10px] font-bold text-[#D94B45] bg-[#FDF0EF] px-2 py-1 rounded-lg border border-[#D94B45]/20 flex items-center justify-between">
                          <span>⚠️ {s.missedDemandCount} {t("reports.turnawayCustomers", "Turnaway customers")}</span>
                          <span>-{formatETB(s.estimatedLostRevenue)} {t("reports.lost", "lost")}</span>
                        </div>
                      )}

                      {/* Row 3: Numbers */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#8B8179] text-[11px]">
                          {t("reports.rentalsCount", "Rentals")}: <strong className="text-[#29221E]">{s.rentalsCount}</strong>
                        </span>
                        <span className="text-[#8B8179] text-[11px]">
                          {t("reports.revenueGenerated", "Revenue")}: <strong className="text-[#D96827]">{formatETB(s.revenue)}</strong>
                        </span>
                      </div>

                      {/* Row 4: Progress Bar */}
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

            {/* Session Duration (30m vs 60m vs Extensions) */}
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

        {/* ================= TAB 3: CONCESSION & PROFIT MARGINS ================= */}
        {activeTab === "CONCESSION" && analyticsData && (
          <div className="space-y-4 min-w-0">
            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
                <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#D96827]" />
                  {t("reports.topSellingProducts", "Top Selling Items & Margins")}
                </h3>
                <span className="text-[11px] text-[#8B8179] font-mono">
                  {analyticsData.topSellingProducts.length} {t("nav.stock", "Items")}
                </span>
              </div>

              {analyticsData.topSellingProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8B8179]">
                  {t("reports.noConcessionSales", "No concession sales in this period.")}
                </div>
              ) : (
                <div className="space-y-2.5 min-w-0">
                  {analyticsData.topSellingProducts.map((p) => {
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
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white text-[#8B8179] border border-[#E9D9C5] shrink-0">
                              {p.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B] font-mono shrink-0">
                            {p.marginPct}% {t("reports.margin", "Margin")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                          <div>{t("reports.sold", "Sold")}: <strong>{p.unitsSold}</strong></div>
                          <div>{t("reports.price", "Price")}: {formatETB(p.sellingPrice)}</div>
                          <div>{t("reports.revenueGenerated", "Revenue")}: <strong className="text-[#D96827]">{formatETB(p.grossRevenue)}</strong></div>
                          <div>{t("reports.profit", "Profit")}: <strong className="text-[#26845B]">+{formatETB(p.grossProfit)}</strong></div>
                        </div>

                        <div className="w-full bg-[#E9D9C5]/50 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#D96827] h-full"
                            style={{ width: `${Math.max(relativePct, 3)}%` }}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#29221E]">{t("reports.skaterTab", "Skater Tab")}</span>
                    <span className="font-mono text-[#D96827]">{analyticsData.tabVsWalkin.tabPercentage}%</span>
                  </div>
                  <div className="text-base font-black font-mono">{formatETB(analyticsData.tabVsWalkin.tabRevenue)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#29221E]">{t("reports.walkinCounter", "Walk-in Counter")}</span>
                    <span className="font-mono text-[#29221E]">{analyticsData.tabVsWalkin.walkinPercentage}%</span>
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

        {/* ================= TAB 4: PEAK HOURS & FINANCES ================= */}
        {activeTab === "TRAFFIC" && analyticsData && (
          <div className="space-y-4 min-w-0">
            {/* Peak Hours Flow */}
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
                <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-[#D96827]" />
                  {t("reports.hourlyFlow", "Hourly Traffic (10 AM – 9 PM)")}
                </h3>
              </div>

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
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF4E5] text-[#D96827]">
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

        {/* ================= QUICK EDIT FLOAT MODAL ================= */}
        {showFloatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <h3 className="text-sm font-bold text-[#29221E]">{t("reports.editDrawerFloat", "Edit Drawer Float")}</h3>
                <button onClick={() => setShowFloatModal(false)} className="p-1 text-[#8B8179] hover:text-[#29221E]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateFloat} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    {t("reports.floatAmount", "Float Amount (ETB)")}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quickFloat}
                    onChange={(e) => setQuickFloat(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                  <p className="text-[10px] text-[#8B8179] mt-1">
                    {t("reports.floatHelp", "Change the daily opening float without hardcoded defaults.")}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFloatModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-[#8B8179]"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={updatingFloat}
                    className="px-4 py-2 bg-[#D96827] text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    {updatingFloat ? t("reports.saving", "Saving...") : t("reports.saveFloat", "Save Float")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= CLOSE SHIFT MODAL (FLOAT EDITABLE ON CLOSING) ================= */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#D94B45]" />
                  <h3 className="text-sm sm:text-base font-bold text-[#29221E]">{t("reports.closeShiftModalTitle", "Count Drawer & Close Shift")}</h3>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="mt-4 space-y-3.5">
                {/* 1. EDITABLE FLOAT INPUT (Requirement 5) */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    {t("reports.openingFloatInput", "Drawer Opening Float (ETB)")}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={closingFloat}
                    onChange={(e) => setClosingFloat(e.target.value)}
                    placeholder="Enter Float"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                  <p className="text-[10px] text-[#8B8179] mt-0.5">
                    {t("reports.floatHelp", "Type whatever float was actually provided in the drawer.")}
                  </p>
                </div>

                {/* 2. LIVE FORMULA RECALCULATION */}
                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-[#8B8179]">
                    <span>{t("reports.expectedCashInDrawer", "Expected Cash in Drawer:")}</span>
                    <strong className="text-[#29221E] text-sm">
                      {formatETB(liveExpectedClosingCash)}
                    </strong>
                  </div>
                  <p className="text-[10px] text-[#8B8179] font-sans">
                    {t("reports.floatFormula", "Float")} ({formatETB(activeFloat)}) + {t("reports.cashIn", "Cash In")} ({formatETB(registerData?.summary.channels.cash.inflow || 0)}) - {t("reports.outflow", "Outflow")} ({formatETB(registerData?.summary.dailyExpensesTotal || 0)})
                  </p>
                </div>

                {/* 3. ACTUAL PHYSICAL CASH COUNTED */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    {t("reports.countedCashPrompt", "Actual Counted Cash (ETB)")}
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

                {/* 4. LIVE DISCREPANCY PREVIEW */}
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-mono ${
                    liveDiscrepancy === 0
                      ? "bg-[#EBF5F0] border-[#26845B]/30 text-[#26845B]"
                      : liveDiscrepancy > 0
                      ? "bg-[#FFF4E5] border-[#E9D9C5] text-[#D96827]"
                      : "bg-[#FDF0EF] border-[#D94B45]/30 text-[#D94B45]"
                  }`}
                >
                  <span className="font-sans font-semibold">{t("reports.balanceLabel", "Balance:")}</span>
                  <span className="font-bold text-xs">
                    {liveDiscrepancy === 0
                      ? `0 ETB (${t("reports.balanced", "Balanced ✓")})`
                      : liveDiscrepancy > 0
                      ? `+${formatETB(liveDiscrepancy)} ${t("reports.surplus", "Surplus")}`
                      : `${formatETB(liveDiscrepancy)} ${t("reports.shortage", "Shortage")}`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("reports.notesOptional", "Notes (Optional)")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("reports.notesPlaceholder", "e.g. Handed key to owner")}
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={closing}
                    className="px-4 py-2 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    {closing ? t("reports.locking", "Locking...") : t("reports.confirmLock", "Confirm & Lock")}
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
