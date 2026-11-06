"use client";

import { useEffect, useState } from "react";
import { formatETB, exportToCSV, format12HourTime } from "@/lib/utils";
import { ExpenseCategory, ExpenseFundSource } from "@/models/Expense";
import {
  Wallet,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Coffee,
  Truck,
  Package,
  Footprints,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Layers,
  Banknote,
  Smartphone,
  Landmark,
  Download,
} from "lucide-react";

interface FinanceData {
  capital: {
    totalCapital: number;
    remainingBalance: number;
    lastUpdated: string;
  };
  today: {
    date: string;
    rentalRevenue: { cash: number; telebirr: number; cbe: number; total: number };
    concessionRevenue: { cash: number; telebirr: number; cbe: number; total: number };
    grossTotal: { cash: number; telebirr: number; cbe: number; total: number };
    dailyPettyCashExpenses: number;
    capitalExpenses: number;
    netDailyCashInDrawer: number;
  };
  expenses: {
    _id: string;
    title: string;
    amount: number;
    category: ExpenseCategory;
    fundSource: ExpenseFundSource;
    paymentMethod: "CASH" | "TELEBIRR" | "CBE";
    notes?: string;
    date: string;
  }[];
}

export default function FinancesPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseFilter, setExpenseFilter] = useState<"ALL" | "DAILY_CASH" | "CAPITAL">("ALL");

  // Record Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [fundSource, setFundSource] = useState<ExpenseFundSource>("DAILY_CASH");
  const [category, setCategory] = useState<ExpenseCategory>("LUNCH");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Capital Top-up Modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  const fetchFinances = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finances");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinances();
  }, []);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/finances/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: Number(amount),
          category,
          fundSource,
          paymentMethod,
          notes,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setShowExpenseModal(false);
        setTitle("");
        setAmount("");
        setNotes("");
        fetchFinances();
      } else {
        alert(resJson.error || "Failed to record expense");
      }
    } catch {
      alert("Network error recording expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopupCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAmount || Number(topupAmount) <= 0) return;

    setTopupLoading(true);
    try {
      const res = await fetch("/api/finances/capital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(topupAmount) }),
      });

      if (res.ok) {
        setShowTopupModal(false);
        setTopupAmount("");
        fetchFinances();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to top up capital");
      }
    } catch {
      alert("Error adding capital");
    } finally {
      setTopupLoading(false);
    }
  };

  // Filtered expenses list
  const filteredExpenses = (data?.expenses || []).filter((e) => {
    if (expenseFilter === "ALL") return true;
    return e.fundSource === expenseFilter;
  });

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#D96827]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                Finances & Cash Accounting
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                Ledger
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8B8179]">
              Strict two-tier separation: Daily Operating Cash (lunch, transport) vs General Capital (shoes, restock, rent).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchFinances}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* 1. TOP METRICS: TWO-TIER ACCOUNTING CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: General Capital Reserve */}
          <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-[#8B8179] mb-2">
              <span className="text-xs uppercase font-bold text-[#D96827]">
                General Capital Reserve
              </span>
              <Building2 className="h-5 w-5 text-[#D96827]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#29221E] font-mono">
              {formatETB(data?.capital.remainingBalance || 0)}
            </div>
            <div className="mt-2 text-[11px] text-[#8B8179] flex items-center justify-between">
              <span>Total: {formatETB(data?.capital.totalCapital || 0)}</span>
              <button
                onClick={() => setShowTopupModal(true)}
                className="text-[#D96827] font-bold hover:underline cursor-pointer"
              >
                + Top Up
              </button>
            </div>
          </div>

          {/* Card 2: Today's Gross Inflow */}
          <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
            <div className="flex items-center justify-between text-[#8B8179] mb-2">
              <span className="text-xs uppercase font-semibold text-[#8B8179]">
                Today&apos;s Gross Revenue
              </span>
              <TrendingUp className="h-5 w-5 text-[#26845B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#26845B] font-mono">
              {formatETB(data?.today.grossTotal.total || 0)}
            </div>
            <div className="mt-2 text-[11px] text-[#8B8179] flex items-center justify-between">
              <span>Rentals: {formatETB(data?.today.rentalRevenue.total || 0)}</span>
              <span>Snacks: {formatETB(data?.today.concessionRevenue.total || 0)}</span>
            </div>
          </div>

          {/* Card 3: Daily Petty Cash Expenses (OpEx) */}
          <div className="p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm">
            <div className="flex items-center justify-between text-[#8B8179] mb-2">
              <span className="text-xs uppercase font-semibold text-[#8B8179]">
                Daily Petty Expenses
              </span>
              <TrendingDown className="h-5 w-5 text-[#D94B45]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#D94B45] font-mono">
              -{formatETB(data?.today.dailyPettyCashExpenses || 0)}
            </div>
            <div className="mt-2 text-[11px] text-[#8B8179]">
              Staff lunch, transport, supplies
            </div>
          </div>

          {/* Card 4: Net Daily Cash in Drawer */}
          <div className="p-5 rounded-2xl bg-[#FFF4E5] border border-[#E9D9C5] shadow-sm">
            <div className="flex items-center justify-between text-[#8B8179] mb-2">
              <span className="text-xs uppercase font-bold text-[#D96827]">
                Net Cash in Drawer
              </span>
              <Banknote className="h-5 w-5 text-[#D96827]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#29221E] font-mono">
              {formatETB(data?.today.netDailyCashInDrawer || 0)}
            </div>
            <div className="mt-2 text-[11px] text-[#8B8179]">
              Cash In ({formatETB(data?.today.grossTotal.cash || 0)}) minus petty out
            </div>
          </div>
        </div>

        {/* 2. REVENUE INFLOWS BY PAYMENT CHANNEL */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#29221E] mb-3 uppercase tracking-wider">
            Today&apos;s Revenue by Payment Channel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cash Channel */}
            <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8B8179] font-bold uppercase flex items-center gap-1.5 mb-1">
                  <Banknote className="h-4 w-4 text-[#26845B]" />
                  Physical Cash
                </span>
                <div className="text-xl font-black text-[#29221E] font-mono">
                  {formatETB(data?.today.grossTotal.cash || 0)}
                </div>
              </div>
              <span className="text-[10px] text-[#8B8179]">Drawer notes</span>
            </div>

            {/* Telebirr Channel */}
            <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8B8179] font-bold uppercase flex items-center gap-1.5 mb-1">
                  <Smartphone className="h-4 w-4 text-[#D96827]" />
                  Telebirr
                </span>
                <div className="text-xl font-black text-[#D96827] font-mono">
                  {formatETB(data?.today.grossTotal.telebirr || 0)}
                </div>
              </div>
              <span className="text-[10px] text-[#8B8179]">Mobile transfer</span>
            </div>

            {/* CBE Channel */}
            <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8B8179] font-bold uppercase flex items-center gap-1.5 mb-1">
                  <Landmark className="h-4 w-4 text-[#29221E]" />
                  Commercial Bank (CBE)
                </span>
                <div className="text-xl font-black text-[#29221E] font-mono">
                  {formatETB(data?.today.grossTotal.cbe || 0)}
                </div>
              </div>
              <span className="text-[10px] text-[#8B8179]">Direct deposit</span>
            </div>
          </div>
        </div>

        {/* 3. EXPENSES AUDIT LOG & FILTER */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E9D9C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#29221E]">Expenses Ledger</h3>
              <p className="text-xs text-[#8B8179]">
                Audited breakdown of daily petty operating costs and capital fund withdrawals.
              </p>
            </div>

            {/* Action & Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#F7F6F3] p-1 rounded-xl border border-[#E9D9C5] text-xs">
                <button
                  onClick={() => setExpenseFilter("ALL")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    expenseFilter === "ALL"
                      ? "bg-[#D96827] text-white font-bold shadow-sm"
                      : "text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  All ({data?.expenses.length || 0})
                </button>
                <button
                  onClick={() => setExpenseFilter("DAILY_CASH")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    expenseFilter === "DAILY_CASH"
                      ? "bg-[#D96827] text-white font-bold shadow-sm"
                      : "text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  Daily Cash (OpEx)
                </button>
                <button
                  onClick={() => setExpenseFilter("CAPITAL")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    expenseFilter === "CAPITAL"
                      ? "bg-[#29221E] text-white font-bold shadow-sm"
                      : "text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  Capital (CapEx)
                </button>
              </div>

              {filteredExpenses.length > 0 && (
                <button
                  onClick={() =>
                    exportToCSV(
                      "Velox_Expenses_Ledger",
                      ["Date", "Title", "Category", "Fund Source", "Payment Method", "Amount", "Notes"],
                      filteredExpenses.map((exp) => [
                        exp.date,
                        exp.title,
                        exp.category,
                        exp.fundSource,
                        exp.paymentMethod,
                        exp.amount,
                        exp.notes || "",
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

          {loading ? (
            <div className="p-12 text-center text-[#8B8179]">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#D96827]" />
              <p className="text-xs">Loading financial ledgers...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-[#8B8179]">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#D96827]" />
              <p className="text-xs">No expenses recorded for this filter today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Expense Title</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Fund Source</th>
                    <th className="px-5 py-3">Channel</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9D9C5]">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-[#FFF4E5]/20 transition-colors">
                      <td className="px-5 py-3 text-[#8B8179] font-mono">
                        {format12HourTime(exp.date)}
                      </td>
                      <td className="px-5 py-3 font-bold text-[#29221E]">
                        {exp.title}
                        {exp.notes && (
                          <span className="block text-[11px] text-[#8B8179] font-normal">
                            {exp.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5] font-mono text-[10px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {exp.fundSource === "DAILY_CASH" ? (
                          <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                            Daily Cash Drawer
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                            General Capital Reserve
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#29221E] font-bold">{exp.paymentMethod}</td>
                      <td className="px-5 py-3 text-right font-mono font-black text-[#D94B45] text-sm">
                        -{formatETB(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: RECORD EXPENSE */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">Record Business Expense</h3>
                    <p className="text-xs text-[#8B8179]">Classify fund source & payment channel</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordExpense} className="mt-4 space-y-4">
                {/* 1. FUND SOURCE SELECTOR (Two-Tier) */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                    1. Funding Source (Strict Segregation)
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFundSource("DAILY_CASH");
                        setCategory("LUNCH");
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        fundSource === "DAILY_CASH"
                          ? "bg-[#FFF4E5] border-2 border-[#D96827] text-[#29221E] shadow-sm"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      <div className="font-bold text-xs text-[#29221E]">Daily Cash Register</div>
                      <div className="text-[10px] text-[#8B8179] mt-0.5">
                        Lunch, transport, petty supplies
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFundSource("CAPITAL");
                        setCategory("SKATE_SHOES");
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        fundSource === "CAPITAL"
                          ? "bg-[#29221E] text-white shadow-sm"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      <div className="font-bold text-xs">General Capital</div>
                      <div className="text-[10px] mt-0.5 opacity-80">
                        Buying shoes, restock, rent
                      </div>
                    </button>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] text-[#8B8179] uppercase font-bold shrink-0">Quick Fill:</span>
                    {fundSource === "DAILY_CASH" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setTitle("Staff Lunch"); setAmount("200"); setCategory("LUNCH"); setPaymentMethod("CASH"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Lunch 200 ETB
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTitle("Staff Lunch"); setAmount("250"); setCategory("LUNCH"); setPaymentMethod("CASH"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Lunch 250 ETB
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTitle("Taxi Transport"); setAmount("100"); setCategory("TRANSPORT"); setPaymentMethod("CASH"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Taxi 100 ETB
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTitle("Cleaning Supplies & Detergents"); setAmount("150"); setCategory("SUPPLIES"); setPaymentMethod("CASH"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Supplies 150 ETB
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => { setTitle("New Skate Shoes Batch"); setCategory("SKATE_SHOES"); setPaymentMethod("CBE"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFF4E5] hover:bg-[#FCEAD2] text-[#D96827] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Skate Shoes
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTitle("Bulk Snack Restock"); setCategory("SNACK_RESTOCK"); setPaymentMethod("CBE"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFF4E5] hover:bg-[#FCEAD2] text-[#D96827] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Snack Restock
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTitle("Facility Monthly Rent"); setCategory("RENT"); setPaymentMethod("CBE"); }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFF4E5] hover:bg-[#FCEAD2] text-[#D96827] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Facility Rent
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Expense Title */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Expense Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      fundSource === "DAILY_CASH"
                        ? "e.g. Staff Lunch, Taxi Transport"
                        : "e.g. 10x New Skate Shoes, Shop Rent Deposit"
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                {/* 3. Amount & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Amount (ETB)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none"
                    >
                      {fundSource === "DAILY_CASH" ? (
                        <>
                          <option value="LUNCH">Staff Lunch</option>
                          <option value="TRANSPORT">Transportation</option>
                          <option value="SUPPLIES">Daily Cleaning Supplies</option>
                          <option value="OTHER">Other Operational</option>
                        </>
                      ) : (
                        <>
                          <option value="SKATE_SHOES">Purchasing Skate Shoes</option>
                          <option value="SNACK_RESTOCK">Bulk Concession Restock</option>
                          <option value="RENT">Facility Rent</option>
                          <option value="MAINTENANCE">Equipment Maintenance</option>
                          <option value="OTHER">Other Capital Expense</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* 4. Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    Paid Via Channel
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          paymentMethod === method
                            ? "bg-[#D96827] text-white shadow-sm"
                            : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Notes */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Receipt #1234, driver name"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D94B45]/20 cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Record Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CAPITAL TOP-UP */}
        {showTopupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#D96827]" />
                  <h3 className="text-base font-bold text-[#29221E]">Top Up Capital Fund</h3>
                </div>
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleTopupCapital} className="mt-4 space-y-3.5">
                <p className="text-xs text-[#8B8179] leading-relaxed">
                  Inject additional capital reserves for purchasing new skates, paying facility rent, or large stock replenishments.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Deposit Amount (ETB)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 20000"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTopupModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={topupLoading}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D96827]/20 cursor-pointer"
                  >
                    {topupLoading ? "Saving..." : "Deposit Capital"}
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
