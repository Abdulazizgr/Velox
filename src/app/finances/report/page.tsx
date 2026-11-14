"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatETB, exportToCSV } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import {
  TrendingUp,
  Wallet,
  ArrowRight,
  Download,
  Calendar,
  PieChart,
  ShoppingBag,
  Footprints,
  FileText,
  Banknote,
  DollarSign,
  ArrowUpDown,
  Building,
  Loader2,
} from "lucide-react";
import SkateLoading from "@/components/SkateLoading";

type PresetOption = "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "ALL" | "CUSTOM";

interface FinancialSummary {
  grossRevenue: number;
  rentalRevenue: number;
  shopRevenue: number;
  dailyOpEx: number;
  capitalExp: number;
  netOperatingIncome: number;
  operatingMarginPct: number;
  netCashSurplus: number;
  totalExpenses: number;
}

interface GeneralCapital {
  baseCapital: number;
  allTimeGross: number;
  allTimeDailyOpEx: number;
  allTimeNetIncome: number;
  allTimeCapEx: number;
  currentGeneralCapital: number;
}

interface DailyLedgerItem {
  date: string;
  skates: number;
  shop: number;
  gross: number;
  dailyExpenses: number;
  netIncome: number;
  marginPct: number;
  capitalExpenses: number;
}

interface ExpenseReasonItem {
  reason: string;
  amount: number;
  percentage: number;
}

interface ReportData {
  preset: string;
  dateRange: { start: string; end: string };
  summary: FinancialSummary;
  generalCapital: GeneralCapital;
  channels: {
    total: number;
    cash: number;
    telebirr: number;
    cbe: number;
  };
  expenseReasons: ExpenseReasonItem[];
  dailyLedger: DailyLedgerItem[];
}

export default function FinancialReportPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PresetOption>("WEEK");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchReport = async (p: PresetOption = preset, start?: string, end?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("preset", p);
      if (p === "CUSTOM") {
        if (start || customStart) params.set("startDate", start || customStart);
        if (end || customEnd) params.set("endDate", end || customEnd);
      }
      const res = await fetch(`/api/finances/report?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load financial report:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport("WEEK");
  }, []);

  const handlePresetSelect = (p: PresetOption) => {
    setPreset(p);
    if (p !== "CUSTOM") {
      fetchReport(p);
    }
  };

  const handleApplyCustom = () => {
    if (customStart) {
      fetchReport("CUSTOM", customStart, customEnd || customStart);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.dailyLedger.length) return;
    const headers = [
      "Date",
      "Skate Rentals (ETB)",
      "Shop Sales (ETB)",
      "Total Gross Revenue (ETB)",
      "Daily Expenses (ETB)",
      "Net Income (ETB)",
      "Profit Margin (%)",
      "Capital Expenses (ETB)",
    ];
    const rows = data.dailyLedger.map((row) => [
      row.date,
      row.skates,
      row.shop,
      row.gross,
      row.dailyExpenses,
      row.netIncome,
      `${row.marginPct}%`,
      row.capitalExpenses,
    ]);
    exportToCSV(`Velox_Financial_Report_${preset}`, headers, rows);
  };

  return (
    <div className="min-h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 text-[#29221E] max-w-full overflow-x-hidden">
      {/* 1. Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9D9C5]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#FFF4E5] text-[#D96827]">
              <DollarSign className="h-5 w-5" />
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-[#29221E] tracking-tight">
              {t("finances.financialReportTab", "Financial Report & P&L")}
            </h1>
          </div>
          <p className="text-xs text-[#8B8179] mt-0.5">
            {t("finances.financialReportSub", "Executive P&L statement, daily net profit accumulation, and capital tracking")}
          </p>
        </div>

        {/* Tab switchers: Expenses Log vs Financial Report */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E9D9C5] shadow-2xs self-start sm:self-center">
          <Link
            href="/finances"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#8B8179] hover:text-[#29221E] transition-all"
          >
            {t("finances.expensesLogTab", "Expenses Log")}
          </Link>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#D96827] text-white shadow-xs">
            {t("finances.financialReportTab", "Financial Report & P&L")}
          </span>
        </div>
      </div>

      {/* 2. Date Range Filter Bar */}
      <div className="p-3 bg-white rounded-2xl border border-[#E9D9C5] shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-[11px] font-bold text-[#8B8179] uppercase tracking-wider shrink-0 mr-1">
              {t("expenses.datePeriod", "Period:")}
            </span>
            {(["TODAY", "YESTERDAY", "WEEK", "MONTH", "ALL", "CUSTOM"] as PresetOption[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  preset === p
                    ? "bg-[#D96827] text-white shadow-xs"
                    : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                }`}
              >
                {p === "TODAY" && t("expenses.today", "Today")}
                {p === "YESTERDAY" && t("expenses.yesterday", "Yesterday")}
                {p === "WEEK" && t("expenses.past7Days", "7 Days")}
                {p === "MONTH" && t("expenses.thisMonth", "30 Days")}
                {p === "ALL" && t("expenses.allTime", "All Time")}
                {p === "CUSTOM" && t("expenses.customDate", "Custom Range")}
              </button>
            ))}
          </div>

          {data && data.dailyLedger.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F6F3] hover:bg-[#E9D9C5] border border-[#E9D9C5] text-xs font-bold text-[#29221E] transition-all cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-[#D96827]" />
              <span>{t("finances.exportReport", "Export P&L (CSV)")}</span>
            </button>
          )}
        </div>

        {/* Custom Date Inputs */}
        {preset === "CUSTOM" && (
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
              onClick={handleApplyCustom}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-[#D96827] text-white font-bold text-xs cursor-pointer hover:bg-[#C2571A] disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{t("reports.apply", "Apply")}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <SkateLoading size="lg" text={t("reports.loadingMetrics", "Loading financial report...")} />
        </div>
      )}

      {/* 4. Report Content */}
      {!loading && data && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0 max-w-full">
            {/* Card 1: Net Operating Income */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-[#8B8179] mb-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#26845B] truncate">
                    {t("finances.netIncome", "Net Income")}
                  </span>
                  <div className="p-1 rounded-lg bg-[#EBF5F0] text-[#26845B] shrink-0">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-black text-[#26845B] font-mono truncate">
                  {formatETB(data.summary.netOperatingIncome)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
                  {t("finances.marginPct", "Profit Margin")}: <strong className="text-[#26845B]">{data.summary.operatingMarginPct}%</strong>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 text-[10px] text-[#8B8179]">
                <span>Period Net Operating Profit</span>
              </div>
            </div>

            {/* Card 2: General Capital Available */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[#FFF4E5]/60 border border-[#D96827]/30 shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-[#8B8179] mb-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D96827] truncate">
                    {t("finances.capitalBalance", "General Capital")}
                  </span>
                  <div className="p-1 rounded-lg bg-[#D96827] text-white shrink-0">
                    <Building className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-black text-[#D96827] font-mono truncate">
                  {formatETB(data.generalCapital.currentGeneralCapital)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
                  {t("finances.capitalBalanceDesc", "Sum of Daily Net Incomes - CapEx")}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#D96827]/20 flex items-center justify-between text-[10px] text-[#8B8179]">
                <span>All-Time Net:</span>
                <span className="font-bold text-[#29221E] font-mono">{formatETB(data.generalCapital.allTimeNetIncome)}</span>
              </div>
            </div>

            {/* Card 3: Gross Revenue */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-[#8B8179] mb-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#29221E] truncate">
                    {t("finances.grossRevenue", "Gross Revenue")}
                  </span>
                  <div className="p-1 rounded-lg bg-[#F7F6F3] text-[#29221E] shrink-0">
                    <Banknote className="h-3.5 w-3.5 text-[#26845B]" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-black text-[#29221E] font-mono truncate">
                  {formatETB(data.summary.grossRevenue)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
                  {t("dashboard.skatesShare", "Skates")}: {formatETB(data.summary.rentalRevenue)}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] text-[#8B8179]">
                <span>{t("dashboard.shopShare", "Shop")}:</span>
                <span className="font-bold text-[#29221E] font-mono">{formatETB(data.summary.shopRevenue)}</span>
              </div>
            </div>

            {/* Card 4: Operating Expenses */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-[#8B8179] mb-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D94B45] truncate">
                    {t("finances.operatingExpenses", "Operating Expenses")}
                  </span>
                  <div className="p-1 rounded-lg bg-[#FDF0EF] text-[#D94B45] shrink-0">
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-black text-[#D94B45] font-mono truncate">
                  -{formatETB(data.summary.dailyOpEx)}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8B8179] truncate">
                  CapEx: -{formatETB(data.summary.capitalExp)}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[10px] text-[#8B8179]">
                <span>Total Spent:</span>
                <span className="font-bold text-[#D94B45] font-mono">-{formatETB(data.summary.totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Profit & Loss Statement (P&L Breakdown) */}
          <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[#E9D9C5]">
              <FileText className="h-4 w-4 text-[#D96827]" />
              {t("finances.pnlStatement", "Profit & Loss (P&L) Statement")}
            </h2>

            <div className="space-y-2 text-xs">
              {/* Gross Income Rows */}
              <div className="p-3 rounded-xl bg-[#F7F6F3] space-y-1.5">
                <div className="flex justify-between items-center font-bold text-[#29221E]">
                  <span>1. {t("finances.grossRevenue", "Total Gross Revenue")}</span>
                  <span className="font-mono text-[#26845B] text-sm">+{formatETB(data.summary.grossRevenue)}</span>
                </div>
                <div className="pl-3 space-y-1 text-[#8B8179] text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span>• Skate Rentals Intake</span>
                    <span>{formatETB(data.summary.rentalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Shop Sales Intake</span>
                    <span>{formatETB(data.summary.shopRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses Rows */}
              <div className="p-3 rounded-xl bg-[#F7F6F3] space-y-1.5">
                <div className="flex justify-between items-center font-bold text-[#29221E]">
                  <span>2. {t("finances.operatingExpenses", "Daily Operating Expenses (Petty Cash)")}</span>
                  <span className="font-mono text-[#D94B45] text-sm">-{formatETB(data.summary.dailyOpEx)}</span>
                </div>
                <div className="pl-3 text-[#8B8179] text-[11px]">
                  Daily minor operational costs, refreshments, cleaning, and day-to-day items
                </div>
              </div>

              {/* Net Operating Income Result */}
              <div className="p-3 rounded-xl bg-[#EBF5F0] border border-[#26845B]/30 flex justify-between items-center font-bold">
                <div>
                  <span className="text-sm text-[#26845B] block">{t("finances.netIncome", "Net Operating Income")}</span>
                  <span className="text-[10px] text-[#8B8179] font-normal">Operating Profit before Capital disbursements</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#26845B] text-base font-black">+{formatETB(data.summary.netOperatingIncome)}</div>
                  <span className="text-[10px] font-mono text-[#26845B]">{data.summary.operatingMarginPct}% Margin</span>
                </div>
              </div>

              {/* Capital Expenditures */}
              <div className="p-3 rounded-xl bg-[#F7F6F3] space-y-1">
                <div className="flex justify-between items-center font-bold text-[#29221E]">
                  <span>3. Capital Expenditures (CapEx Deductions)</span>
                  <span className="font-mono text-[#D94B45] text-sm">-{formatETB(data.summary.capitalExp)}</span>
                </div>
                <div className="pl-3 text-[#8B8179] text-[11px]">
                  Fleet shoe purchases, major infrastructure, and capital investments
                </div>
              </div>

              {/* Retained Net Cash Surplus */}
              <div className="p-3 rounded-xl bg-[#FFF4E5] border border-[#D96827]/40 flex justify-between items-center font-bold">
                <div>
                  <span className="text-sm text-[#D96827] block">Net Retained Cash Surplus</span>
                  <span className="text-[10px] text-[#8B8179] font-normal">Transferred to cumulative General Capital pool</span>
                </div>
                <div className="font-mono text-[#D96827] text-base font-black">
                  {formatETB(data.summary.netCashSurplus)}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Net Income Ledger (Day-by-Day Performance Table) */}
          <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#E9D9C5]">
              <h2 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#D96827]" />
                {t("finances.dailyNetHistory", "Daily Net Income Ledger")}
              </h2>
              <span className="text-[11px] text-[#8B8179] font-mono">
                {data.dailyLedger.length} days recorded
              </span>
            </div>

            {data.dailyLedger.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8B8179]">
                No financial transactions recorded for this period.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E9D9C5] text-[#8B8179] text-[10px] uppercase">
                      <th className="py-2 px-2.5 font-bold">Date</th>
                      <th className="py-2 px-2.5 font-bold">Skates</th>
                      <th className="py-2 px-2.5 font-bold">Shop</th>
                      <th className="py-2 px-2.5 font-bold">Gross Total</th>
                      <th className="py-2 px-2.5 font-bold">Daily OpEx</th>
                      <th className="py-2 px-2.5 font-bold text-right">Net Income</th>
                      <th className="py-2 px-2.5 font-bold text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9D9C5]/50 font-mono">
                    {data.dailyLedger.map((row) => (
                      <tr key={row.date} className="hover:bg-[#F7F6F3]/60 transition-colors">
                        <td className="py-2.5 px-2.5 font-bold text-[#29221E]">{row.date}</td>
                        <td className="py-2.5 px-2.5 text-[#8B8179]">{formatETB(row.skates)}</td>
                        <td className="py-2.5 px-2.5 text-[#8B8179]">{formatETB(row.shop)}</td>
                        <td className="py-2.5 px-2.5 font-bold text-[#29221E]">{formatETB(row.gross)}</td>
                        <td className="py-2.5 px-2.5 text-[#D94B45]">-{formatETB(row.dailyExpenses)}</td>
                        <td className="py-2.5 px-2.5 font-black text-right text-[#26845B]">
                          +{formatETB(row.netIncome)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                              row.marginPct >= 50
                                ? "bg-[#EBF5F0] text-[#26845B]"
                                : row.marginPct >= 25
                                ? "bg-[#FFF4E5] text-[#D96827]"
                                : "bg-[#FDF0EF] text-[#D94B45]"
                            }`}
                          >
                            {row.marginPct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expense Breakdown by Reason */}
          {data.expenseReasons.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E9D9C5] p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
              <h2 className="text-xs font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-[#E9D9C5]">
                <PieChart className="h-4 w-4 text-[#D96827]" />
                Expense Distribution by Reason
              </h2>

              <div className="space-y-2.5">
                {data.expenseReasons.map((item) => (
                  <div key={item.reason} className="p-2.5 rounded-xl border border-[#E9D9C5]/80 bg-[#F7F6F3]/50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#29221E]">{item.reason}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#8B8179] text-[11px]">{item.percentage}%</span>
                        <strong className="text-[#D94B45]">-{formatETB(item.amount)}</strong>
                      </div>
                    </div>
                    <div className="w-full bg-[#E9D9C5]/50 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#D94B45] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
