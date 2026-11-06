"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatETB, exportToCSV } from "@/lib/utils";
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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"TODAY" | "HISTORY">("TODAY");
  const [data, setData] = useState<RegisterData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Close shift modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);

  const fetchTodayRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/register/today");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.register.expectedClosingCash) {
          setCountedCash(json.register.expectedClosingCash.toString());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/register/history");
      if (res.ok) {
        const json = await res.json();
        setHistory(json.registers || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTodayRegister();
  }, []);

  useEffect(() => {
    if (activeTab === "HISTORY") {
      fetchHistory();
    }
  }, [activeTab]);

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
      } else {
        alert(resJson.error || "Failed to close shift");
      }
    } catch {
      alert("Network error closing shift");
    } finally {
      setClosing(false);
    }
  };

  const handleReopenShift = async () => {
    const confirmed = confirm("Re-open today's shift register?");
    if (!confirmed) return;
    try {
      const res = await fetch("/api/register/open", { method: "POST" });
      if (res.ok) {
        fetchTodayRegister();
      } else {
        alert("Failed to re-open shift");
      }
    } catch {
      alert("Network error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const liveDiscrepancy = Number(countedCash || 0) - (data?.register.expectedClosingCash || 0);

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Print-Only Official Receipt Header */}
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
            <p className="font-bold">Shift Date: {data?.summary.date}</p>
            <p className="text-[#8B8179] font-sans text-[11px]">Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9D9C5] print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-[#E9D9C5] shadow-sm shrink-0 bg-black">
              <Image
                src="/logo.jpg"
                alt="Velox Skate"
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                  Daily Closing & Audit Reports
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                  EOD
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#8B8179]">
                End-of-day register balancing, physical cash drawer counting, and multi-channel audit reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-white border border-[#E9D9C5] rounded-xl p-1 text-xs font-bold shadow-sm">
              <button
                onClick={() => setActiveTab("TODAY")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "TODAY"
                    ? "bg-[#D96827] text-white shadow-sm"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                Today&apos;s Shift
              </button>
              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "HISTORY"
                    ? "bg-[#D96827] text-white shadow-sm"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                Shift History
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-2 text-xs font-bold text-[#29221E] hover:text-white bg-white hover:bg-[#29221E] border border-[#E9D9C5] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Print EOD Summary"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Receipt</span>
            </button>

            <button
              onClick={fetchTodayRegister}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {activeTab === "TODAY" ? (
          <div className="space-y-6">
            {/* 1. SHIFT STATUS BANNER */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-white ${
                data?.register.status === "CLOSED"
                  ? "border-[#E9D9C5]"
                  : "border-2 border-[#26845B]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    data?.register.status === "CLOSED"
                      ? "bg-[#F7F6F3] text-[#8B8179]"
                      : "bg-[#EBF5F0] text-[#26845B]"
                  }`}
                >
                  {data?.register.status === "CLOSED" ? (
                    <Lock className="h-6 w-6" />
                  ) : (
                    <Unlock className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-[#29221E]">
                      Shift Date: {data?.summary.date}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        data?.register.status === "CLOSED"
                          ? "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]"
                          : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                      }`}
                    >
                      {data?.register.status === "CLOSED" ? "Shift Closed & Locked" : "Shift Open"}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8179] mt-0.5">
                    {data?.register.status === "CLOSED"
                      ? `Closed at ${new Date(data?.register.closedAt || "").toLocaleTimeString()}`
                      : "Register is actively accepting rentals, concession sales, and expenses."}
                  </p>
                </div>
              </div>

              {data?.register.status === "OPEN" ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#D94B45]/20 cursor-pointer flex items-center justify-center gap-2 print:hidden"
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

            {/* 2. REVENUE & OPERATIONS RECAP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Skate Rentals */}
              <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
                <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                  <span className="uppercase font-semibold">Skate Rentals</span>
                  <Footprints className="h-4 w-4 text-[#D96827]" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
                  {formatETB(data?.summary.rentalsTotal || 0)}
                </div>
                <div className="text-[11px] text-[#8B8179] mt-1">
                  {data?.summary.rentalsCount} completed sessions
                </div>
              </div>

              {/* Concession Sales */}
              <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
                <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                  <span className="uppercase font-semibold">Snacks & Drinks</span>
                  <ShoppingBag className="h-4 w-4 text-[#D96827]" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
                  {formatETB(data?.summary.concessionsTotal || 0)}
                </div>
                <div className="text-[11px] text-[#8B8179] mt-1">
                  {data?.summary.concessionsCount} concession orders
                </div>
              </div>

              {/* Petty Cash Expenses */}
              <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
                <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                  <span className="uppercase font-semibold">Petty Expenses</span>
                  <span className="text-[#D94B45] font-bold">OpEx</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#D94B45] font-mono">
                  -{formatETB(data?.summary.dailyExpensesTotal || 0)}
                </div>
                <div className="text-[11px] text-[#8B8179] mt-1">Staff lunch & transport</div>
              </div>

              {/* Net Daily Operating Profit */}
              <div className="p-4 rounded-2xl bg-white border border-[#26845B]/40 shadow-sm">
                <div className="flex items-center justify-between text-[#8B8179] text-xs mb-1">
                  <span className="uppercase font-semibold text-[#26845B]">Net Operating Profit</span>
                  <TrendingUp className="h-4 w-4 text-[#26845B]" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#26845B] font-mono">
                  {formatETB(data?.summary.netOperatingIncome || 0)}
                </div>
                <div className="text-[11px] text-[#8B8179] mt-1">Gross revenue minus petty expenses</div>
              </div>
            </div>

            {/* 3. CASH DRAWER RECONCILIATION CARD (The centerpiece of EOD) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#29221E] uppercase tracking-wider flex items-center gap-2">
                <Banknote className="h-5 w-5 text-[#D96827]" />
                Physical Cash Drawer Reconciliation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs font-mono">
                <div>
                  <span className="text-[#8B8179] block uppercase font-sans text-[10px] font-semibold">
                    1. Opening Float
                  </span>
                  <span className="text-base font-bold text-[#29221E]">
                    {formatETB(data?.summary.channels.cash.openingFloat || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-[#8B8179] block uppercase font-sans text-[10px] font-semibold">
                    2. (+) Cash Inflow
                  </span>
                  <span className="text-base font-bold text-[#26845B]">
                    +{formatETB(data?.summary.channels.cash.inflow || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-[#8B8179] block uppercase font-sans text-[10px] font-semibold">
                    3. (-) Daily Petty Outflow
                  </span>
                  <span className="text-base font-bold text-[#D94B45]">
                    -{formatETB(data?.summary.channels.cash.outflow || 0)}
                  </span>
                </div>

                <div className="pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#E9D9C5] sm:pl-4">
                  <span className="text-[#D96827] block uppercase font-sans text-[10px] font-bold">
                    4. (=) Expected in Drawer
                  </span>
                  <span className="text-lg font-black text-[#29221E]">
                    {formatETB(data?.summary.channels.cash.expectedInDrawer || 0)}
                  </span>
                </div>
              </div>

              {/* Closed status discrepancy readout */}
              {data?.register.status === "CLOSED" && (
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#8B8179]">Actual Counted Cash: </span>
                    <strong className="text-[#29221E] font-mono text-sm ml-1">
                      {formatETB(data.register.actualClosingCash || 0)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[#8B8179]">Closing Discrepancy: </span>
                    <span
                      className={`font-mono font-bold text-sm ml-1 ${
                        (data.register.discrepancy || 0) === 0
                          ? "text-[#26845B]"
                          : (data.register.discrepancy || 0) > 0
                          ? "text-[#D96827]"
                          : "text-[#D94B45]"
                      }`}
                    >
                      {(data.register.discrepancy || 0) === 0
                        ? "0 ETB (Balanced ✓)"
                        : (data.register.discrepancy || 0) > 0
                        ? `+${formatETB(data.register.discrepancy || 0)} (Surplus)`
                        : `${formatETB(data.register.discrepancy || 0)} (Deficit / Shortage)`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. DIGITAL RECONCILIATION CHANNELS (Telebirr & CBE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Telebirr Audit */}
              <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-[#D96827] flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" />
                    Telebirr Inflows
                  </span>
                  <span className="text-[10px] text-[#8B8179]">Cross-check with SMS</span>
                </div>
                <div className="text-2xl font-black text-[#D96827] font-mono">
                  {formatETB(data?.summary.channels.telebirr.inflow || 0)}
                </div>
                <p className="text-[11px] text-[#8B8179] mt-2">
                  Confirm against your Telebirr merchant / wallet incoming transfer statements.
                </p>
              </div>

              {/* CBE Audit */}
              <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-[#29221E] flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-[#D96827]" />
                    Commercial Bank (CBE) Inflows
                  </span>
                  <span className="text-[10px] text-[#8B8179]">Cross-check with App</span>
                </div>
                <div className="text-2xl font-black text-[#29221E] font-mono">
                  {formatETB(data?.summary.channels.cbe.inflow || 0)}
                </div>
                <p className="text-[11px] text-[#8B8179] mt-2">
                  Confirm against your CBE mobile banking direct deposit notifications.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: HISTORICAL SHIFT ARCHIVE */
          <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-sm">
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
              <div className="overflow-x-auto">
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
            )}
          </div>
        )}

        {/* CLOSE SHIFT MODAL */}
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
                      {formatETB(data?.register.expectedClosingCash || 0)}
                    </strong>
                  </div>
                  <p className="text-[10px] text-[#8B8179] font-sans italic">
                    Opening Float ({formatETB(data?.register.openingCash || 0)}) + Cash Revenue ({formatETB(data?.summary.channels.cash.inflow || 0)}) - Petty Expenses ({formatETB(data?.summary.dailyExpensesTotal || 0)})
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
