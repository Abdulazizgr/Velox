"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatETB, format12HourTime, format12HourDateTime } from "@/lib/utils";
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
  Footprints,
  ShoppingBag,
  X,
  Edit3,
  ArrowLeft,
  Calendar,
  BarChart3,
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

export default function DailyReportPage() {
  const { showAlert, showConfirm } = useAlertModal();
  const { t, lang } = useLanguage();

  const [registerData, setRegisterData] = useState<RegisterData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchTodayRegister = async () => {
    try {
      const res = await fetch("/api/register/today");
      if (res.ok) {
        const data = await res.json();
        setRegisterData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayRegister();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCash) {
      showAlert({
        title: t("common.warning", "Warning"),
        message: lang === "am" ? "እባክዎ የተቆጠረውን ጥሬ ገንዘብ ያስገቡ።" : "Please enter the counted cash amount.",
        type: "warning",
      });
      return;
    }

    setClosing(true);
    try {
      const res = await fetch("/api/register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualClosingCash: Number(countedCash),
          notes: closeNotes,
          openingCash: closingFloat ? Number(closingFloat) : undefined,
        }),
      });

      if (res.ok) {
        showAlert({
          title: t("reports.shiftClosedSuccess", "Shift Closed Successfully"),
          message: t("reports.shiftClosedDesc", "The drawer has been reconciled and the shift is now locked."),
          type: "success",
        });
        setShowCloseModal(false);
        setCountedCash("");
        setCloseNotes("");
        fetchTodayRegister();
      } else {
        const err = await res.json();
        showAlert({
          title: t("reports.cannotCloseShift", "Cannot Close Shift"),
          message: err.error || "Failed to close shift",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setClosing(false);
    }
  };

  const handleUpdateFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFloat || isNaN(Number(quickFloat))) {
      showAlert({
        title: t("common.warning", "Warning"),
        message: lang === "am" ? "እባክዎ ትክክለኛ የመነሻ ገንዘብ ያስገቡ።" : "Please enter a valid float amount.",
        type: "warning",
      });
      return;
    }

    setUpdatingFloat(true);
    try {
      const res = await fetch("/api/register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: Number(quickFloat),
        }),
      });

      if (res.ok) {
        showAlert({
          title: t("common.success", "Success"),
          message: lang === "am" ? "የሳጥን መነሻ ገንዘብ በተሳካ ሁኔታ ተስተካክሏል።" : "Opening drawer float updated successfully.",
          type: "success",
        });
        setShowFloatModal(false);
        fetchTodayRegister();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || "Failed to update float",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setUpdatingFloat(false);
    }
  };

  const handleReopenShift = async () => {
    showConfirm({
      title: t("reports.reopenShiftTitle", "Re-open Shift?"),
      message: t("reports.reopenShiftDesc", "This will unlock today's register, allowing cashiers to record additional transactions."),
      confirmText: t("reports.confirmReopen", "Re-open Register"),
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/register/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              openingCash: registerData?.register.openingCash,
              forceReopen: true,
            }),
          });
          if (res.ok) {
            showAlert({
              title: t("reports.shiftReopened", "Shift Re-opened"),
              message: t("reports.shiftReopenedDesc", "Register is now open for live operations."),
              type: "success",
            });
            fetchTodayRegister();
          }
        } catch {
          showAlert({
            title: t("common.error", "Error"),
            message: "Failed to re-open shift.",
            type: "error",
          });
        }
      },
    });
  };

  const activeFloat = showCloseModal
    ? Number(closingFloat || registerData?.register.openingCash || 0)
    : Number(registerData?.register.openingCash || 0);

  const liveExpectedClosingCash =
    activeFloat +
    (registerData?.summary.channels.cash.inflow || 0) -
    (registerData?.summary.dailyExpensesTotal || 0);

  const liveDiscrepancy = Number(countedCash || 0) - liveExpectedClosingCash;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <SkateLoading label={t("common.loading", "Loading...")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] pb-16 overflow-x-hidden">
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ================= PRINT-ONLY RECEIPT ================= */}
        <div className="hidden print:flex items-center justify-between pb-4 mb-4 border-b-2 border-[#29221E] text-[#29221E]">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-[#E9D9C5] bg-black shrink-0">
              <Image src="/icon-192.png" alt="Velox" fill sizes="48px" className="object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#29221E]">{t("login.title", "VELOX SKATE")}</h1>
              <p className="text-xs text-[#8B8179]">{t("reports.dailyReportTitle", "Daily Shift & Drawer Report")}</p>
            </div>
          </div>
          <div className="text-right text-xs text-[#29221E] font-mono">
            <p className="font-bold">{t("common.date", "Date")}: {registerData?.summary.date}</p>
            <p className="text-[#8B8179] text-[11px]">{format12HourDateTime(new Date())}</p>
          </div>
        </div>

        {/* ================= HEADER (MOBILE-FIRST) ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9D9C5] print:hidden">
          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="p-2 rounded-xl border border-[#E9D9C5] bg-white text-[#8B8179] hover:text-[#29221E] transition-colors"
              title={t("common.back", "Back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#29221E]">
                  {t("reports.dailyReportTitle", "Daily Shift & Drawer Report")}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                  {t("dashboard.today", "Today")}
                </span>
              </div>
              <p className="text-xs text-[#8B8179]">
                {t("reports.dailyReportSub", "Shift closing, physical cash drawer balancing and receipt")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/reports"
              className="px-3 py-1.5 rounded-xl border border-[#E9D9C5] bg-white text-xs font-bold text-[#8B8179] hover:text-[#29221E] flex items-center gap-1.5 shadow-xs"
            >
              <BarChart3 className="h-3.5 w-3.5 text-[#D96827]" />
              <span className="hidden sm:inline">{t("reports.analyticsTitle", "Analytics Center")}</span>
            </Link>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#29221E] hover:text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t("reports.printReceipt", "Print")}</span>
            </button>
            <button
              onClick={fetchTodayRegister}
              className="p-1.5 rounded-xl border border-[#E9D9C5] bg-white text-[#8B8179] hover:text-[#D96827] cursor-pointer shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

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
                  {lang === "am" ? "የዛሬ ፈረቃ" : "Today's Shift"}: {registerData?.summary.date}
                </h2>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                    registerData?.register.status === "CLOSED"
                      ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                      : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                  }`}
                >
                  {registerData?.register.status === "CLOSED"
                    ? t("nav.shiftClosed", "Closed")
                    : t("nav.shiftOpen", "Open")}
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
            <div className="text-[10px] text-[#8B8179] mt-0.5 truncate">
              {t("expenses.dailyExpensesDesc", "Petty cash")}
            </div>
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
            <div className="text-[10px] text-[#8B8179] mt-0.5 truncate">
              {t("reports.dailyExpensesTotal", "After expenses")}
            </div>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5]/60">
              <span className="text-[10px] uppercase text-[#8B8179] block mb-0.5 font-sans">
                {t("dashboard.float", "Opening Float")}
              </span>
              <span className="font-bold text-sm text-[#29221E]">
                {formatETB(registerData?.summary.channels.cash.openingFloat || 0)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5]/60">
              <span className="text-[10px] uppercase text-[#8B8179] block mb-0.5 font-sans">
                {t("reports.cashIn", "Cash Intake")}
              </span>
              <span className="font-bold text-sm text-[#26845B]">
                +{formatETB(registerData?.summary.channels.cash.inflow || 0)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5]/60">
              <span className="text-[10px] uppercase text-[#8B8179] block mb-0.5 font-sans">
                {t("reports.expensesPaid", "Petty Expenses")}
              </span>
              <span className="font-bold text-sm text-[#D94B45]">
                -{formatETB(registerData?.summary.dailyExpensesTotal || 0)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5]">
              <span className="text-[10px] uppercase text-[#D96827] block mb-0.5 font-sans font-bold">
                {t("reports.expectedCash", "Expected in Drawer")}
              </span>
              <span className="font-bold text-sm text-[#D96827]">
                {formatETB(registerData?.summary.channels.cash.expectedInDrawer || 0)}
              </span>
            </div>
          </div>

          {/* Actual count & discrepancy badge */}
          {registerData?.register.status === "CLOSED" && (
            <div className="pt-2 border-t border-[#E9D9C5] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-[#8B8179]">{t("reports.actualCountedCash", "Actual Counted:")}</span>
                <span className="font-bold font-mono text-[#29221E] text-sm">
                  {formatETB(registerData?.register.actualClosingCash || 0)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#8B8179]">{t("reports.discrepancyLabel", "Discrepancy:")}</span>
                {(registerData?.register.discrepancy || 0) === 0 ? (
                  <span className="px-2 py-0.5 rounded-md bg-[#EBF5F0] text-[#26845B] font-bold border border-[#26845B]/30">
                    {t("reports.balancedExact", "Exact Match (0 ETB)")}
                  </span>
                ) : (registerData?.register.discrepancy || 0) > 0 ? (
                  <span className="px-2 py-0.5 rounded-md bg-[#EBF5F0] text-[#26845B] font-bold border border-[#26845B]/30">
                    +{formatETB(registerData?.register.discrepancy || 0)} ({t("reports.over", "Over")})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-[#FDF0EF] text-[#D94B45] font-bold border border-[#D94B45]/30">
                    {formatETB(registerData?.register.discrepancy || 0)} ({t("reports.short", "Short")})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Payment Channels Breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#29221E] uppercase tracking-wider">
            {t("reports.digitalIntakeTitle", "Payment Channels Breakdown")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Cash Channel */}
            <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white text-[#26845B] border border-[#E9D9C5]">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#29221E] block">{t("common.cash", "Cash Inflow")}</span>
                  <span className="text-[10px] text-[#8B8179]">{t("reports.physicalBills", "Physical bills")}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-[#29221E] text-sm">
                {formatETB(registerData?.summary.channels.cash.inflow || 0)}
              </span>
            </div>

            {/* Telebirr Channel */}
            <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white text-[#007AC2] border border-[#E9D9C5]">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#29221E] block">{t("common.telebirr", "Telebirr")}</span>
                  <span className="text-[10px] text-[#8B8179]">{t("reports.merchantApp", "Digital payments")}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-[#29221E] text-sm">
                {formatETB(registerData?.summary.channels.telebirr.inflow || 0)}
              </span>
            </div>

            {/* CBE Birr Channel */}
            <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white text-[#6F1D78] border border-[#E9D9C5]">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#29221E] block">{t("common.cbe", "CBE Bank")}</span>
                  <span className="text-[10px] text-[#8B8179]">{t("reports.cbeAccount", "Bank transfers")}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-[#29221E] text-sm">
                {formatETB(registerData?.summary.channels.cbe.inflow || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* ================= MODAL: CLOSE SHIFT ================= */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">{t("reports.closeDrawerTitle", "Close Shift & Audit")}</h3>
                    <p className="text-xs text-[#8B8179]">{t("reports.closeDrawerSubtitle", "Count the physical cash in drawer")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 rounded-lg text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-4 pt-3 text-xs">
                {/* 1. Opening Float Input */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("reports.floatAmount", "Opening Float (ETB)")}
                  </label>
                  <input
                    type="number"
                    value={closingFloat}
                    onChange={(e) => setClosingFloat(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] font-mono focus:outline-none focus:border-[#D96827]"
                  />
                  <p className="text-[10px] text-[#8B8179] mt-1">
                    {t("reports.floatHelp", "Adjust opening float if different from default.")}
                  </p>
                </div>

                {/* 2. Expected Calculation Display */}
                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-[#8B8179]">
                    <span>{t("dashboard.float", "Opening Float")}:</span>
                    <span>+{formatETB(activeFloat)}</span>
                  </div>
                  <div className="flex justify-between text-[#26845B]">
                    <span>{t("reports.cashIn", "Cash Intake")}:</span>
                    <span>+{formatETB(registerData?.summary.channels.cash.inflow || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#D94B45]">
                    <span>{t("reports.expensesPaid", "Petty Expenses")}:</span>
                    <span>-{formatETB(registerData?.summary.dailyExpensesTotal || 0)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#E9D9C5] flex justify-between font-bold text-xs text-[#29221E]">
                    <span>{t("reports.expectedCash", "Expected in Drawer")}:</span>
                    <span className="text-[#D96827]">{formatETB(liveExpectedClosingCash)}</span>
                  </div>
                </div>

                {/* 3. Physical Counted Input */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("reports.actualCountedCash", "Physical Counted Cash in Drawer (ETB)")} *
                  </label>
                  <input
                    type="number"
                    required
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-full px-3 py-2.5 text-base font-bold rounded-xl border-2 border-[#D96827] bg-white text-[#29221E] font-mono focus:outline-none shadow-xs"
                  />
                </div>

                {/* 4. Live Discrepancy Indicator */}
                {countedCash !== "" && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      liveDiscrepancy === 0
                        ? "bg-[#EBF5F0] border-[#26845B]/30 text-[#26845B]"
                        : liveDiscrepancy > 0
                        ? "bg-[#EBF5F0] border-[#26845B]/30 text-[#26845B]"
                        : "bg-[#FDF0EF] border-[#D94B45]/30 text-[#D94B45]"
                    }`}
                  >
                    <span>{t("reports.discrepancyLabel", "Discrepancy")}:</span>
                    <span>
                      {liveDiscrepancy === 0
                        ? t("reports.balancedExact", "Exact Match (0 ETB)")
                        : liveDiscrepancy > 0
                        ? `+${formatETB(liveDiscrepancy)} (${t("reports.over", "Over")})`
                        : `${formatETB(liveDiscrepancy)} (${t("reports.short", "Short")})`}
                    </span>
                  </div>
                )}

                {/* 5. Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("reports.notesOptional", "Closing Notes")}
                  </label>
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder={t("reports.notesPlaceholder", "e.g. Keys handed to manager")}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] focus:outline-none focus:border-[#D96827]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={closing}
                    className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {closing ? t("reports.locking", "Locking Shift...") : t("reports.confirmLock", "Confirm & Lock Shift")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: QUICK EDIT FLOAT ================= */}
        {showFloatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">{t("reports.editDrawerFloat", "Edit Drawer Float")}</h3>
                    <p className="text-xs text-[#8B8179]">{t("dashboard.today", "Today's shift")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFloatModal(false)}
                  className="p-1 rounded-lg text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateFloat} className="space-y-4 pt-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("reports.floatAmount", "Opening Float Amount (ETB)")}
                  </label>
                  <input
                    type="number"
                    required
                    value={quickFloat}
                    onChange={(e) => setQuickFloat(e.target.value)}
                    placeholder="e.g. 500"
                    autoFocus
                    className="w-full px-3 py-2.5 text-base font-bold rounded-xl border-2 border-[#D96827] bg-white text-[#29221E] font-mono focus:outline-none"
                  />
                  <p className="text-[10px] text-[#8B8179] mt-1">
                    {t("reports.floatHelp", "Set the initial cash placed in the register at the start of shift.")}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setShowFloatModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={updatingFloat}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {updatingFloat ? t("reports.saving", "Saving...") : t("reports.saveFloat", "Save Float")}
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
