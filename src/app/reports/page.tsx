"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { formatETB } from "@/lib/utils";
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Print-Only Official Receipt Header */}
        <div className="hidden print:flex items-center justify-between pb-4 mb-4 border-b-2 border-zinc-700 text-zinc-900">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-zinc-700 bg-black shrink-0">
              <Image
                src="/logo.jpg"
                alt="Velox Skate Logo"
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">VELOX SKATE RINK</h1>
              <p className="text-xs text-zinc-400">Daily Shift Closing & Financial Audit Receipt</p>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-300 font-mono">
            <p className="font-bold">Shift Date: {data?.summary.date}</p>
            <p className="text-zinc-400 font-sans text-[11px]">Printed: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-amber-500/30 shadow-md shadow-amber-500/10 shrink-0 bg-black">
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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Daily Closing & Audit Reports
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Phase 5
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-zinc-400">
                End-of-day register balancing, physical cash drawer counting, and multi-channel audit reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab("TODAY")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "TODAY"
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Today&apos;s Shift
              </button>
              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "HISTORY"
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Shift History
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-2 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print EOD Summary"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Receipt</span>
            </button>

            <button
              onClick={fetchTodayRegister}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {activeTab === "TODAY" ? (
          <div className="space-y-6">
            {/* 1. SHIFT STATUS BANNER */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                data?.register.status === "CLOSED"
                  ? "bg-zinc-900/90 border-zinc-700"
                  : "bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border-emerald-500/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    data?.register.status === "CLOSED"
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-emerald-500/20 text-emerald-400 animate-pulse"
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
                    <h2 className="text-base sm:text-lg font-black text-white">
                      Shift Date: {data?.summary.date}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        data?.register.status === "CLOSED"
                          ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {data?.register.status === "CLOSED" ? "Shift Closed & Locked" : "Shift Open"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {data?.register.status === "CLOSED"
                      ? `Closed at ${new Date(data?.register.closedAt || "").toLocaleTimeString()}`
                      : "Register is actively accepting rentals, concession sales, and expenses."}
                  </p>
                </div>
              </div>

              {data?.register.status === "OPEN" ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center justify-center gap-2 print:hidden"
                >
                  <Lock className="h-4 w-4" />
                  <span>Count Drawer & Close Shift</span>
                </button>
              ) : (
                <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Reconciled & Finalized</span>
                </div>
              )}
            </div>

            {/* 2. REVENUE & OPERATIONS RECAP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Skate Rentals */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase font-semibold">Skate Rentals</span>
                  <Footprints className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatETB(data?.summary.rentalsTotal || 0)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {data?.summary.rentalsCount} completed sessions
                </div>
              </div>

              {/* Concession Sales */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase font-semibold">Snacks & Drinks</span>
                  <ShoppingBag className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {formatETB(data?.summary.concessionsTotal || 0)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {data?.summary.concessionsCount} concession orders
                </div>
              </div>

              {/* Petty Cash Expenses */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase font-semibold">Petty Expenses</span>
                  <span className="text-rose-400 font-bold">OpEx</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
                  -{formatETB(data?.summary.dailyExpensesTotal || 0)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Staff lunch & transport</div>
              </div>

              {/* Net Daily Operating Profit */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-emerald-500/40">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase font-semibold text-emerald-400">Net Operating Profit</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                  {formatETB(data?.summary.netOperatingIncome || 0)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Gross revenue minus petty expenses</div>
              </div>
            </div>

            {/* 3. CASH DRAWER RECONCILIATION CARD (The centerpiece of EOD) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-400" />
                Physical Cash Drawer Reconciliation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block uppercase font-sans text-[10px]">
                    1. Opening Float
                  </span>
                  <span className="text-base font-bold text-zinc-300">
                    {formatETB(data?.summary.channels.cash.openingFloat || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 block uppercase font-sans text-[10px]">
                    2. (+) Cash Sales Inflow
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    +{formatETB(data?.summary.channels.cash.inflow || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 block uppercase font-sans text-[10px]">
                    3. (-) Daily Petty Outflow
                  </span>
                  <span className="text-base font-bold text-rose-400">
                    -{formatETB(data?.summary.channels.cash.outflow || 0)}
                  </span>
                </div>

                <div className="pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-zinc-800 sm:pl-4">
                  <span className="text-emerald-400 block uppercase font-sans text-[10px] font-bold">
                    4. (=) Expected in Drawer
                  </span>
                  <span className="text-lg font-black text-white">
                    {formatETB(data?.summary.channels.cash.expectedInDrawer || 0)}
                  </span>
                </div>
              </div>

              {/* Closed status discrepancy readout */}
              {data?.register.status === "CLOSED" && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400">Actual Counted Physical Cash: </span>
                    <strong className="text-white font-mono text-sm ml-1">
                      {formatETB(data.register.actualClosingCash || 0)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-zinc-400">Closing Discrepancy: </span>
                    <span
                      className={`font-mono font-bold text-sm ml-1 ${
                        (data.register.discrepancy || 0) === 0
                          ? "text-emerald-400"
                          : (data.register.discrepancy || 0) > 0
                          ? "text-amber-400"
                          : "text-rose-400"
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
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-cyan-500/30 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" />
                    Telebirr Inflows
                  </span>
                  <span className="text-[10px] text-zinc-500">Cross-check with SMS</span>
                </div>
                <div className="text-2xl font-black text-cyan-400 font-mono">
                  {formatETB(data?.summary.channels.telebirr.inflow || 0)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Confirm against your Telebirr merchant / wallet incoming transfer statements.
                </p>
              </div>

              {/* CBE Audit */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-purple-500/30 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-purple-400 flex items-center gap-1.5">
                    <Landmark className="h-4 w-4" />
                    Commercial Bank (CBE) Inflows
                  </span>
                  <span className="text-[10px] text-zinc-500">Cross-check with App</span>
                </div>
                <div className="text-2xl font-black text-purple-400 font-mono">
                  {formatETB(data?.summary.channels.cbe.inflow || 0)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Confirm against your CBE mobile banking direct deposit notifications.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: HISTORICAL SHIFT ARCHIVE */
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Closed Shift Registers</h3>
                <p className="text-xs text-zinc-400">Past daily audit logs and cash balancing records</p>
              </div>
              <span className="text-xs text-zinc-400">Total: {history.length} days</span>
            </div>

            {history.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No historical closed registers found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/60 uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
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
                  <tbody className="divide-y divide-zinc-800/80 font-mono">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3 font-sans font-bold text-white">{h.date}</td>
                        <td className="px-5 py-3 text-zinc-300">{formatETB(h.cashInTotal)}</td>
                        <td className="px-5 py-3 text-cyan-400">{formatETB(h.telebirrTotal)}</td>
                        <td className="px-5 py-3 text-purple-400">{formatETB(h.cbeTotal)}</td>
                        <td className="px-5 py-3 text-rose-400">-{formatETB(h.dailyExpensesTotal)}</td>
                        <td className="px-5 py-3 text-white font-bold">{formatETB(h.expectedClosingCash)}</td>
                        <td className="px-5 py-3 text-white">{formatETB(h.actualClosingCash || 0)}</td>
                        <td className="px-5 py-3 font-bold">
                          {(h.discrepancy || 0) === 0 ? (
                            <span className="text-emerald-400 font-sans">✓ Balanced</span>
                          ) : (h.discrepancy || 0) > 0 ? (
                            <span className="text-amber-400 font-sans">+{formatETB(h.discrepancy || 0)}</span>
                          ) : (
                            <span className="text-rose-400 font-sans">{formatETB(h.discrepancy || 0)}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.status === "CLOSED"
                                ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-rose-400" />
                  <h3 className="text-base font-bold text-white">Count Drawer & Close Shift</h3>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="mt-4 space-y-4">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Expected Cash in Drawer:</span>
                    <strong className="text-white text-sm">
                      {formatETB(data?.register.expectedClosingCash || 0)}
                    </strong>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans italic">
                    Opening Float ({formatETB(data?.register.openingCash || 0)}) + Cash Revenue ({formatETB(data?.summary.channels.cash.inflow || 0)}) - Petty Expenses ({formatETB(data?.summary.dailyExpensesTotal || 0)})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Actual Physical Cash Counted (ETB)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Live discrepancy preview */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between font-mono ${
                    liveDiscrepancy === 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : liveDiscrepancy > 0
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
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
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Closing Notes / Shift Observations (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clean drawer, handed key to owner"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={closing}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
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
