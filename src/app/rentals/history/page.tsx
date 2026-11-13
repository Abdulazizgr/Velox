"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatETB, format12HourTime, exportToCSV } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import {
  History,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  User,
  Clock,
  Footprints,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Banknote,
  Repeat,
} from "lucide-react";
import { startOfDay, endOfDay, subDays, startOfMonth, format } from "date-fns";

interface RentalHistoryItem {
  _id: string;
  shoeId: string;
  shoeSize: number;
  skateType?: "INLINE" | "QUAD";
  customerName: string;
  customerPhone?: string;
  baseDurationMinutes: number;
  totalMinutes: number;
  startedAt: string;
  expectedEndTime: string;
  actualReturnTime?: string;
  basePrice: number;
  extensionPrice: number;
  totalRentalFee: number;
  pricingType: "WEEKDAY" | "WEEKEND";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PAID" | "UNPAID";
  paymentMethod?: "CASH" | "TELEBIRR" | "CBE";
  notes?: string;
  tabTotal?: number;
}

export default function RentalHistoryPage() {
  const { t, lang } = useLanguage();
  const [sessions, setSessions] = useState<RentalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState<"TODAY" | "YESTERDAY" | "7DAYS" | "MONTH" | "CUSTOM">("7DAYS");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Owner guard
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (!res.authenticated || res.user?.role !== "OWNER") {
          window.location.href = "/rentals";
        }
      })
      .catch(() => {});
  }, []);

  const handlePeriodChange = (p: "TODAY" | "YESTERDAY" | "7DAYS" | "MONTH" | "CUSTOM") => {
    setPeriod(p);
    const now = new Date();
    if (p === "TODAY") {
      const todayStr = format(now, "yyyy-MM-dd");
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === "YESTERDAY") {
      const yStr = format(subDays(now, 1), "yyyy-MM-dd");
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (p === "7DAYS") {
      setStartDate(format(subDays(now, 7), "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    } else if (p === "MONTH") {
      setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sortBy", "startedAt");
      params.set("status", statusFilter);

      if (period === "TODAY") {
        params.set("todayOnly", "true");
      } else {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/rentals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Fetch rental history error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [period, startDate, endDate, statusFilter]);

  // Client-side search filtering
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.shoeId.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.shoeSize.toString().includes(q)
    );
  }, [sessions, searchQuery]);

  // Metric Aggregates
  const totalRevenue = useMemo(() => {
    return filteredSessions
      .filter((s) => s.status !== "CANCELLED" && s.paymentStatus === "PAID")
      .reduce((acc, s) => acc + s.totalRentalFee, 0);
  }, [filteredSessions]);

  const completedCount = filteredSessions.filter((s) => s.status === "COMPLETED").length;
  const activeCount = filteredSessions.filter((s) => s.status === "ACTIVE").length;
  const cancelledCount = filteredSessions.filter((s) => s.status === "CANCELLED").length;

  const handleExportCSV = () => {
    exportToCSV(
      `Velox_Rentals_History_${startDate}_to_${endDate}`,
      [
        "Shoe Tag",
        "Size",
        "Type",
        "Customer",
        "Phone",
        "Duration (min)",
        "Started At",
        "Return Time",
        "Fee (ETB)",
        "Status",
        "Payment Status",
        "Payment Method",
        "Notes",
      ],
      filteredSessions.map((s) => [
        s.shoeId,
        s.shoeSize,
        s.skateType || "INLINE",
        s.customerName,
        s.customerPhone || "",
        s.totalMinutes,
        s.startedAt,
        s.actualReturnTime || "",
        s.totalRentalFee,
        s.status,
        s.paymentStatus,
        s.paymentMethod || "",
        s.notes || "",
      ])
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E9D9C5]">
          <div className="flex items-center gap-3">
            <Link
              href="/rentals"
              className="p-2 rounded-xl bg-white border border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E] hover:bg-[#FFF4E5] transition-colors shadow-2xs"
              title="Back to Rental Board"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <History className="h-6 w-6 text-[#D96827]" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                  {t("rentals.historyTitle", "Rental History")}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                  {t("staff.ownerOnly", "Owner Only")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#8B8179]">
                {t("rentals.historySubtitle", "Historical skate sessions, durations, and payment logs")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#FFF4E5] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("common.refresh", "Refresh")}</span>
            </button>

            {filteredSessions.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-bold text-[#29221E] hover:text-[#D96827] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#FFF4E5] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="h-4 w-4 text-[#D96827]" />
                <span>CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-2xs space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8B8179]">
              {t("common.total", "Total Sessions")}
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
              {filteredSessions.length}
            </div>
            <div className="text-[10px] text-[#26845B] font-mono">
              {completedCount} {t("rentals.returnedTab", "completed")}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-2xs space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#26845B]">
              {t("reports.grossRevenue", "Rental Revenue")}
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#26845B] font-mono">
              {formatETB(totalRevenue)}
            </div>
            <div className="text-[10px] text-[#8B8179] font-mono">
              {t("rentals.paidBadge", "PAID")}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-2xs space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D96827]">
              {t("rentals.activeTab", "Active")}
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#D96827] font-mono">
              {activeCount}
            </div>
            <div className="text-[10px] text-[#8B8179] font-mono">
              {t("dashboard.onFloor", "on the floor")}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-2xs space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D94B45]">
              {t("rentals.cancelledBadge", "Cancelled")}
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#D94B45] font-mono">
              {cancelledCount}
            </div>
            <div className="text-[10px] text-[#8B8179]">
              {t("rentals.voided", "voided sessions")}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-2xs space-y-3">
          {/* Preset Period Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "TODAY", label: t("expenses.today", "Today") },
              { id: "YESTERDAY", label: t("expenses.yesterday", "Yesterday") },
              { id: "7DAYS", label: t("expenses.sevenDays", "7 Days") },
              { id: "MONTH", label: t("expenses.thisMonth", "This Month") },
              { id: "CUSTOM", label: t("expenses.customRange", "Custom Range") },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodChange(p.id as typeof period)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  period === p.id
                    ? "bg-[#D96827] text-white shadow-2xs"
                    : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if CUSTOM */}
          {period === "CUSTOM" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#E9D9C5]/60 items-center text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#8B8179] uppercase mb-0.5">
                  {t("concession.startDate", "Start Date")}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8B8179] uppercase mb-0.5">
                  {t("concession.endDate", "End Date")}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={fetchHistory}
                  className="w-full py-1.5 px-3 bg-[#29221E] text-white font-bold text-xs rounded-xl"
                >
                  {t("reports.apply", "Apply")}
                </button>
              </div>
            </div>
          )}

          {/* Search & Status Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 border-t border-[#E9D9C5]/60 items-center">
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B8179]" />
              <input
                type="text"
                placeholder={t("rentals.searchPlaceholder", "Search shoe tag, name, phone...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-2">
              <span className="text-xs text-[#8B8179] font-bold uppercase whitespace-nowrap">
                {t("common.status", "Status")}:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-2.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827] cursor-pointer"
              >
                <option value="ALL">{t("common.all", "All Statuses")}</option>
                <option value="COMPLETED">{t("rentals.returnedTab", "Completed")}</option>
                <option value="ACTIVE">{t("rentals.activeTab", "Active")}</option>
                <option value="CANCELLED">{t("rentals.cancelledBadge", "Cancelled")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="p-12 text-center text-[#8B8179] bg-white border border-[#E9D9C5] rounded-2xl">
            <div className="h-8 w-8 border-2 border-[#D96827] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">{t("common.loading", "Loading rental records...")}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center text-[#8B8179] bg-white border border-[#E9D9C5] rounded-2xl space-y-2">
            <History className="h-8 w-8 text-[#8B8179] mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-[#29221E]">{t("rentals.noReturnedSessions", "No rental sessions found")}</h4>
            <p className="text-xs text-[#8B8179]">Try selecting another date range or filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-2xs">
            {/* Mobile View: Cards */}
            <div className="md:hidden divide-y divide-[#E9D9C5]">
              {filteredSessions.map((session) => (
                <div key={session._id} className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-base font-black text-[#29221E]">
                          {session.shoeId}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                          #{session.shoeSize}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#F7F6F3] text-[#8B8179]">
                          {session.skateType || "INLINE"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8B8179] mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3 text-[#8B8179]" />
                        <span className="font-medium text-[#29221E]">{session.customerName}</span>
                        {session.customerPhone && (
                          <span className="font-mono text-[10px]">({session.customerPhone})</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        session.status === "COMPLETED"
                          ? "bg-[#EBF5F0] text-[#26845B]"
                          : session.status === "ACTIVE"
                          ? "bg-[#FFF4E5] text-[#D96827]"
                          : "bg-[#FDF0EF] text-[#D94B45]"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[#F7F6F3] text-[11px] font-mono">
                    <div>
                      <span className="text-[#8B8179] block text-[9px] font-sans">Started</span>
                      <span>{format12HourTime(session.startedAt)}</span>
                    </div>
                    <div>
                      <span className="text-[#8B8179] block text-[9px] font-sans">Returned</span>
                      <span>{session.actualReturnTime ? format12HourTime(session.actualReturnTime) : "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div>
                      <span className="text-[#8B8179]">Fee: </span>
                      <strong className="text-[#29221E] font-mono">{formatETB(session.totalRentalFee)}</strong>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        session.paymentStatus === "PAID"
                          ? "bg-[#EBF5F0] text-[#26845B]"
                          : "bg-[#FFF4E5] text-[#D96827]"
                      }`}
                    >
                      {session.paymentStatus} ({session.paymentMethod || "CASH"})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] text-[11px] uppercase font-bold text-[#8B8179] border-b border-[#E9D9C5]">
                  <tr>
                    <th className="px-4 py-3">Shoe Tag</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Started At</th>
                    <th className="px-4 py-3">Returned At</th>
                    <th className="px-4 py-3">Rental Fee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9D9C5] font-mono">
                  {filteredSessions.map((session) => (
                    <tr key={session._id} className="hover:bg-[#FFF4E5]/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#29221E]">{session.shoeId}</strong>
                          <span className="text-[10px] px-1 rounded bg-[#FFF4E5] text-[#D96827]">
                            #{session.shoeSize}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <div className="font-semibold text-[#29221E]">{session.customerName}</div>
                        {session.customerPhone && (
                          <div className="text-[10px] text-[#8B8179] font-mono">{session.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {session.totalMinutes}m
                      </td>
                      <td className="px-4 py-3 text-[#8B8179]">
                        {new Date(session.startedAt).toLocaleDateString()} {format12HourTime(session.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-[#8B8179]">
                        {session.actualReturnTime ? format12HourTime(session.actualReturnTime) : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#29221E]">
                        {formatETB(session.totalRentalFee)}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            session.status === "COMPLETED"
                              ? "bg-[#EBF5F0] text-[#26845B]"
                              : session.status === "ACTIVE"
                              ? "bg-[#FFF4E5] text-[#D96827]"
                              : "bg-[#FDF0EF] text-[#D94B45]"
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            session.paymentStatus === "PAID"
                              ? "bg-[#EBF5F0] text-[#26845B]"
                              : "bg-[#FFF4E5] text-[#D96827]"
                          }`}
                        >
                          {session.paymentStatus} ({session.paymentMethod || "CASH"})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
