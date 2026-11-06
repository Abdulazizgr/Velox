"use client";

import { useEffect, useState, useMemo } from "react";
import { formatETB, exportToCSV, format12HourDateTime } from "@/lib/utils";
import {
  Wallet,
  Plus,
  RefreshCw,
  TrendingDown,
  Building2,
  Calendar,
  Search,
  Filter,
  Download,
  Trash2,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  Calculator,
  Tag,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

interface ExpenseItem {
  _id: string;
  title: string;
  amount: number;
  category: string; // Internal field storing the reason key
  fundSource: "DAILY_CASH" | "CAPITAL";
  paymentMethod: "CASH" | "TELEBIRR" | "CBE";
  notes?: string;
  date: string;
}

interface ExpenseReasonItem {
  _id: string;
  name: string;
  displayName: string;
  fundSource: "DAILY_CASH" | "CAPITAL" | "BOTH";
}

interface FinanceData {
  summary: {
    dailyTotal: number;
    dailyCount: number;
    capitalTotal: number;
    capitalCount: number;
    totalBoth: number;
    totalCount: number;
  };
  capital: {
    totalCapital: number;
    remainingBalance: number;
    lastUpdated: string;
  };
  expenses: ExpenseItem[];
}

type DatePreset = "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "ALL" | "CUSTOM";

export default function ExpensesPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [reasons, setReasons] = useState<ExpenseReasonItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("TODAY");
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fundFilter, setFundFilter] = useState<"ALL" | "DAILY_CASH" | "CAPITAL">("ALL");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Record Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [fundSource, setFundSource] = useState<"DAILY_CASH" | "CAPITAL">("DAILY_CASH");
  const [selectedReason, setSelectedReason] = useState("LUNCH");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add Reason Modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [newReasonName, setNewReasonName] = useState("");
  const [newReasonDisplay, setNewReasonDisplay] = useState("");
  const [newReasonFundSource, setNewReasonFundSource] = useState<"DAILY_CASH" | "CAPITAL" | "BOTH">("BOTH");
  const [creatingReason, setCreatingReason] = useState(false);

  // Inline Reason Creator inside Expense Modal
  const [showInlineReason, setShowInlineReason] = useState(false);
  const [inlineReasonName, setInlineReasonName] = useState("");

  // Capital Top-up Modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  // Delete Confirmation Modal
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // System Notification Popup Modal
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  }>({ show: false, title: "", message: "", type: "success" });

  const showPopup = (title: string, message: string, type: "success" | "error" = "success") => {
    setNotification({ show: true, title, message, type });
  };

  // Fetch Reasons
  const fetchReasons = async () => {
    try {
      const res = await fetch("/api/finances/categories");
      if (res.ok) {
        const json = await res.json();
        setReasons(json.categories || []);
      }
    } catch (e) {
      console.error("Error fetching reasons:", e);
    }
  };

  // Fetch Expenses with active date filter
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("preset", datePreset);
      if (datePreset === "CUSTOM" && customDate) {
        params.set("date", customDate);
      }

      const res = await fetch(`/api/finances?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showPopup("Error", "Failed to load expense records", "error");
      }
    } catch {
      showPopup("Network Error", "Could not connect to server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [datePreset, customDate]);

  // Handle Record Expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      showPopup("Amount Required", "Please enter the expense amount", "error");
      return;
    }

    const effectiveTitle = title.trim() || getReasonDisplay(selectedReason);

    setSubmitting(true);
    try {
      const res = await fetch("/api/finances/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: effectiveTitle,
          amount: Number(amount),
          category: selectedReason, // Backend uses category field to store reason
          fundSource,
          paymentMethod,
          notes: notes.trim(),
          date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setShowExpenseModal(false);
        setTitle("");
        setAmount("");
        setNotes("");
        setExpenseDate(new Date().toISOString().slice(0, 10));
        showPopup("Success", resJson.message || "Expense recorded successfully");
        fetchExpenses();
        fetchReasons();
      } else {
        showPopup("Recording Failed", resJson.error || "Failed to record expense", "error");
      }
    } catch {
      showPopup("Network Error", "Error recording expense", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Reason
  const handleCreateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonName.trim()) {
      showPopup("Input Required", "Please enter a reason name", "error");
      return;
    }

    setCreatingReason(true);
    try {
      const res = await fetch("/api/finances/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newReasonName.trim(),
          displayName: newReasonDisplay.trim() || newReasonName.trim(),
          fundSource: newReasonFundSource,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setShowReasonModal(false);
        setNewReasonName("");
        setNewReasonDisplay("");
        showPopup("Reason Added", `Reason "${json.category.displayName}" created!`);
        fetchReasons();
      } else {
        showPopup("Error", json.error || "Failed to create reason", "error");
      }
    } catch {
      showPopup("Network Error", "Could not create reason", "error");
    } finally {
      setCreatingReason(false);
    }
  };

  // Handle Quick Inline Reason Creation inside Record Expense Modal
  const handleCreateInlineReason = async () => {
    if (!inlineReasonName.trim()) return;
    try {
      const res = await fetch("/api/finances/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inlineReasonName.trim(),
          displayName: inlineReasonName.trim(),
          fundSource,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSelectedReason(json.category.name);
        setInlineReasonName("");
        setShowInlineReason(false);
        fetchReasons();
      } else {
        showPopup("Error", json.error || "Failed to create reason", "error");
      }
    } catch {
      showPopup("Network Error", "Failed to create reason", "error");
    }
  };

  // Handle Capital Top-up
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
        showPopup("Capital Deposited", `Added ${formatETB(Number(topupAmount))} to General Capital!`);
        fetchExpenses();
      } else {
        const err = await res.json();
        showPopup("Error", err.error || "Failed to top up capital", "error");
      }
    } catch {
      showPopup("Error", "Network error adding capital", "error");
    } finally {
      setTopupLoading(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/finances/expenses?id=${expenseToDelete._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExpenseToDelete(null);
        showPopup("Expense Removed", "The expense record has been deleted.");
        fetchExpenses();
      } else {
        const json = await res.json();
        showPopup("Error", json.error || "Failed to delete expense", "error");
      }
    } catch {
      showPopup("Network Error", "Could not delete expense", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered expenses based on Fund Source, Reason, and Search
  const filteredExpenses = useMemo(() => {
    return (data?.expenses || []).filter((exp) => {
      // Fund Source Filter
      if (fundFilter !== "ALL" && exp.fundSource !== fundFilter) {
        return false;
      }
      // Reason Filter
      if (reasonFilter !== "ALL" && exp.category !== reasonFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesNotes = (exp.notes || "").toLowerCase().includes(q);
        const matchesChannel = exp.paymentMethod.toLowerCase().includes(q);
        const matchesReason = exp.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesChannel && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [data?.expenses, fundFilter, reasonFilter, searchQuery]);

  // Map reason code to human readable name
  const getReasonDisplay = (reasonCode: string) => {
    const found = reasons.find((r) => r.name === reasonCode);
    if (found) return found.displayName;
    return reasonCode
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  };

  // Date preset title
  const getDateLabel = () => {
    if (datePreset === "TODAY") return "Today";
    if (datePreset === "YESTERDAY") return "Yesterday";
    if (datePreset === "WEEK") return "Past 7 Days";
    if (datePreset === "MONTH") return "This Month";
    if (datePreset === "ALL") return "All Time";
    return customDate || "Custom Date";
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                <Wallet className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                Expenses
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#8B8179]">
              Audit and record daily operational petty expenses and capital expenditures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchExpenses}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowReasonModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-[#29221E] bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:bg-[#FFF4E5]/40 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Tag className="h-4 w-4 text-[#D96827]" />
              <span>+ Reason</span>
            </button>

            <button
              onClick={() => {
                setExpenseDate(new Date().toISOString().slice(0, 10));
                setShowExpenseModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* 1. DATE FILTER CONTROLS */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#D96827]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B8179]">
                Date Period:
              </span>
              <span className="text-xs font-extrabold text-[#D96827] bg-[#FFF4E5] px-2 py-0.5 rounded-md border border-[#E9D9C5]">
                {getDateLabel()}
              </span>
            </div>

            {/* Date Preset Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(
                [
                  { id: "TODAY", label: "Today" },
                  { id: "YESTERDAY", label: "Yesterday" },
                  { id: "WEEK", label: "7 Days" },
                  { id: "MONTH", label: "This Month" },
                  { id: "ALL", label: "All Time" },
                  { id: "CUSTOM", label: "Custom" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    datePreset === preset.id
                      ? "bg-[#29221E] text-white shadow-xs font-bold"
                      : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] hover:bg-[#E9D9C5]/50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Picker (if Custom is chosen) */}
          {datePreset === "CUSTOM" && (
            <div className="pt-2 border-t border-[#E9D9C5] flex items-center gap-3">
              <label className="text-xs font-semibold text-[#8B8179]">Pick Date:</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1.5 bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl text-xs font-mono text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
              />
            </div>
          )}
        </div>

        {/* 2. THE 3 REQUESTED CARDS: TOTAL DAILY, CAPITAL, AND BOTH */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Daily Expenses */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B8179]">
                  Daily Expenses (OpEx)
                </span>
                <div className="p-1.5 rounded-lg bg-[#FFF4E5] text-[#D96827]">
                  <Banknote className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#D94B45] font-mono tracking-tight">
                {formatETB(data?.summary.dailyTotal || 0)}
              </div>
              <p className="mt-1 text-[11px] text-[#8B8179]">
                Staff lunch, taxi, cleaning & petty supplies
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[11px] text-[#8B8179]">
              <span>Transactions:</span>
              <span className="font-bold text-[#29221E] font-mono">
                {data?.summary.dailyCount || 0} entries
              </span>
            </div>
          </div>

          {/* Card 2: Total Capital Expenses */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B8179]">
                  Capital Expenses (CapEx)
                </span>
                <div className="p-1.5 rounded-lg bg-[#F7F6F3] text-[#29221E]">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#29221E] font-mono tracking-tight">
                {formatETB(data?.summary.capitalTotal || 0)}
              </div>
              <p className="mt-1 text-[11px] text-[#8B8179]">
                Skate shoes, bulk stock restock, rent & equipment
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#E9D9C5]/60 flex items-center justify-between text-[11px] text-[#8B8179]">
              <span className="flex items-center gap-1.5">
                Reserve:{" "}
                <strong className="text-[#29221E] font-mono">
                  {formatETB(data?.capital.remainingBalance || 0)}
                </strong>
              </span>
              <button
                onClick={() => setShowTopupModal(true)}
                className="text-[#D96827] font-bold hover:underline cursor-pointer"
              >
                + Top Up
              </button>
            </div>
          </div>

          {/* Card 3: Total Expenses (Both / Combined) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF4E5]/80 border-2 border-[#D96827] shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D96827]">
                  Total Expenses (Both)
                </span>
                <div className="p-1.5 rounded-lg bg-[#D96827] text-white">
                  <Calculator className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#D96827] font-mono tracking-tight">
                {formatETB(data?.summary.totalBoth || 0)}
              </div>
              <p className="mt-1 text-[11px] text-[#8B8179]">
                Combined Daily Operational + Capital Expenditures
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#E9D9C5] flex items-center justify-between text-[11px] text-[#8B8179]">
              <span>Combined Total:</span>
              <span className="font-bold text-[#D96827] font-mono">
                {data?.summary.totalCount || 0} transactions
              </span>
            </div>
          </div>
        </div>

        {/* 3. REASON SCROLLER & QUICK CONTROLS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#8B8179] px-1">
            <span className="uppercase tracking-wider">Filter by Reason:</span>
            <span className="text-[11px] font-normal">
              Showing {filteredExpenses.length} of {data?.expenses.length || 0}
            </span>
          </div>

          {/* Scrollable Reason Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin whitespace-nowrap">
            <button
              onClick={() => setReasonFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                reasonFilter === "ALL"
                  ? "bg-[#D96827] text-white shadow-xs"
                  : "bg-white border border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
              }`}
            >
              All Reasons ({data?.expenses.length || 0})
            </button>

            {reasons.map((r) => {
              const count = (data?.expenses || []).filter((e) => e.category === r.name).length;
              const isSelected = reasonFilter === r.name;
              return (
                <button
                  key={r._id}
                  onClick={() => setReasonFilter(r.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#29221E] text-white shadow-xs font-bold"
                      : "bg-white border border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  {r.displayName} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}

            <button
              onClick={() => setShowReasonModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#D96827] bg-[#FFF4E5] hover:bg-[#FCEAD2] border border-[#E9D9C5] transition-all shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>New Reason</span>
            </button>
          </div>
        </div>

        {/* 4. EXPENSES AUDIT LOG & SECONDARY FILTERS */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-xs">
          {/* Header Bar */}
          <div className="p-4 border-b border-[#E9D9C5] flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B8179]" />
              <input
                type="text"
                placeholder="Search reason, notes, channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Fund Source Filter Pills & Export CSV */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#F7F6F3] p-1 rounded-xl border border-[#E9D9C5] text-xs">
                <button
                  onClick={() => setFundFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    fundFilter === "ALL"
                      ? "bg-[#D96827] text-white font-bold shadow-xs"
                      : "text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  All Funds
                </button>
                <button
                  onClick={() => setFundFilter("DAILY_CASH")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    fundFilter === "DAILY_CASH"
                      ? "bg-[#D96827] text-white font-bold shadow-xs"
                      : "text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  Daily Cash
                </button>
                <button
                  onClick={() => setFundFilter("CAPITAL")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    fundFilter === "CAPITAL"
                      ? "bg-[#29221E] text-white font-bold shadow-xs"
                      : "text-[#8B8179] hover:text-[#29221E]"
                  }`}
                >
                  Capital
                </button>
              </div>

              {filteredExpenses.length > 0 && (
                <button
                  onClick={() =>
                    exportToCSV(
                      "Velox_Expenses",
                      ["Date/Time", "Expense Reason / Title", "Reason", "Fund Source", "Channel", "Amount (ETB)", "Notes"],
                      filteredExpenses.map((exp) => [
                        format12HourDateTime(exp.date),
                        exp.title,
                        getReasonDisplay(exp.category),
                        exp.fundSource === "DAILY_CASH" ? "Daily Cash Drawer" : "General Capital",
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

          {/* List Content */}
          {loading ? (
            <div className="p-12 text-center text-[#8B8179]">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#D96827]" />
              <p className="text-xs">Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-[#8B8179]">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#D96827]" />
              <p className="text-sm font-bold text-[#29221E]">No expenses found</p>
              <p className="text-xs text-[#8B8179] mt-1">
                No recorded expenses matching the active date & reason filters.
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-[#E9D9C5]">
                {filteredExpenses.map((exp) => (
                  <div key={exp._id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-[#29221E]">
                          {exp.title || getReasonDisplay(exp.category)}
                        </h4>
                        <div className="text-[11px] text-[#8B8179] font-mono mt-0.5">
                          {format12HourDateTime(exp.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-[#D94B45]">
                          -{formatETB(exp.amount)}
                        </span>
                      </div>
                    </div>

                    {exp.notes && (
                      <p className="text-xs text-[#8B8179] bg-[#F7F6F3] p-2 rounded-xl border border-[#E9D9C5]/60">
                        {exp.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5] font-semibold">
                          {getReasonDisplay(exp.category)}
                        </span>
                        {exp.fundSource === "DAILY_CASH" ? (
                          <span className="px-2 py-0.5 rounded font-semibold bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                            Daily Cash
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-semibold bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                            Capital
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-white text-[#29221E] font-bold border border-[#E9D9C5]">
                          {exp.paymentMethod}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpenseToDelete(exp)}
                        className="p-1 text-[#8B8179] hover:text-[#D94B45] cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                    <tr>
                      <th className="px-5 py-3">Date / Time</th>
                      <th className="px-5 py-3">Expense / Details</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-5 py-3">Funding Source</th>
                      <th className="px-5 py-3">Channel</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9D9C5]">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-[#FFF4E5]/20 transition-colors">
                        <td className="px-5 py-3 text-[#8B8179] font-mono">
                          {format12HourDateTime(exp.date)}
                        </td>
                        <td className="px-5 py-3 font-bold text-[#29221E]">
                          {exp.title || getReasonDisplay(exp.category)}
                          {exp.notes && (
                            <span className="block text-[11px] text-[#8B8179] font-normal">
                              {exp.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5] text-[10px] font-semibold">
                            {getReasonDisplay(exp.category)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {exp.fundSource === "DAILY_CASH" ? (
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                              Daily Cash Drawer
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                              General Capital
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#29221E] font-bold">
                          {exp.paymentMethod}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-black text-[#D94B45] text-sm">
                          -{formatETB(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1 text-[#8B8179] hover:text-[#D94B45] transition-colors cursor-pointer"
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL 1: RECORD BUSINESS EXPENSE */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">Record Expense</h3>
                    <p className="text-xs text-[#8B8179]">Select funding source & reason</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordExpense} className="mt-4 space-y-4">
                {/* 1. FUNDING SOURCE SELECTOR */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                    1. Funding Source
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFundSource("DAILY_CASH");
                        setSelectedReason("LUNCH");
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        fundSource === "DAILY_CASH"
                          ? "bg-[#FFF4E5] border-2 border-[#D96827] text-[#29221E] shadow-xs"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      <div className="font-bold text-xs text-[#29221E]">Daily Cash Drawer</div>
                      <div className="text-[10px] text-[#8B8179] mt-0.5">
                        Lunch, transport, supplies
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFundSource("CAPITAL");
                        setSelectedReason("SKATE_SHOES");
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        fundSource === "CAPITAL"
                          ? "bg-[#29221E] text-white shadow-xs"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      <div className="font-bold text-xs">General Capital</div>
                      <div className="text-[10px] mt-0.5 opacity-80">
                        Skates, restock, rent
                      </div>
                    </button>
                  </div>

                  {/* Quick Fill Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] text-[#8B8179] uppercase font-bold shrink-0">
                      Quick Fill:
                    </span>
                    {fundSource === "DAILY_CASH" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle("Staff Lunch");
                            setAmount("200");
                            setSelectedReason("LUNCH");
                            setPaymentMethod("CASH");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Lunch 200 ETB
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle("Taxi Transport");
                            setAmount("100");
                            setSelectedReason("TRANSPORT");
                            setPaymentMethod("CASH");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Taxi 100 ETB
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle("Cleaning Supplies");
                            setAmount("150");
                            setSelectedReason("SUPPLIES");
                            setPaymentMethod("CASH");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#FFF4E5] text-[#29221E] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Supplies 150 ETB
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle("New Skate Shoes Batch");
                            setSelectedReason("SKATE_SHOES");
                            setPaymentMethod("CBE");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFF4E5] hover:bg-[#FCEAD2] text-[#D96827] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Skate Shoes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle("Bulk Concession Restock");
                            setSelectedReason("SNACK_RESTOCK");
                            setPaymentMethod("CBE");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFF4E5] hover:bg-[#FCEAD2] text-[#D96827] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Snack Restock
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle("Facility Monthly Rent");
                            setSelectedReason("RENT");
                            setPaymentMethod("CBE");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFF4E5] hover:bg-[#FCEAD2] text-[#D96827] text-[11px] font-semibold whitespace-nowrap cursor-pointer border border-[#E9D9C5]"
                        >
                          Facility Rent
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. REASON & AMOUNT */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#29221E]">
                        Reason
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowInlineReason(!showInlineReason)}
                        className="text-[10px] text-[#D96827] font-bold hover:underline cursor-pointer"
                      >
                        {showInlineReason ? "Cancel" : "+ New"}
                      </button>
                    </div>

                    {!showInlineReason ? (
                      <select
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                      >
                        {reasons.map((r) => (
                          <option key={r._id} value={r.name}>
                            {r.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="New reason..."
                          value={inlineReasonName}
                          onChange={(e) => setInlineReasonName(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-[#D96827] rounded-xl text-xs text-[#29221E] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCreateInlineReason}
                          className="px-2 py-1.5 bg-[#D96827] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

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
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    />
                  </div>
                </div>

                {/* 3. OPTIONAL DETAILS / TITLE */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Description / Details <span className="font-normal text-[#8B8179]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${getReasonDisplay(selectedReason)} details, receipt ref`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                {/* 4. PAYMENT CHANNEL & DATE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                      Paid Channel
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                            paymentMethod === method
                              ? "bg-[#D96827] text-white shadow-xs"
                              : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                          }`}
                        >
                          {method === "TELEBIRR" ? "Tele" : method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    />
                  </div>
                </div>

                {/* 5. NOTES */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Receipt #1234, staff name, vendor details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E9D9C5]">
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

        {/* MODAL 2: CREATE EXPENSE REASON */}
        {showReasonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">New Expense Reason</h3>
                    <p className="text-xs text-[#8B8179]">Add custom reason for expenses</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReasonModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateReason} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Reason Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electricity, Marketing, First Aid"
                    value={newReasonName}
                    onChange={(e) => setNewReasonName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Display Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Electricity & Power Bills"
                    value={newReasonDisplay}
                    onChange={(e) => setNewReasonDisplay(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Funding Source Applicability
                  </label>
                  <select
                    value={newReasonFundSource}
                    onChange={(e) =>
                      setNewReasonFundSource(
                        e.target.value as "DAILY_CASH" | "CAPITAL" | "BOTH"
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none"
                  >
                    <option value="BOTH">Both (Daily Cash & Capital)</option>
                    <option value="DAILY_CASH">Daily Cash Drawer Only</option>
                    <option value="CAPITAL">General Capital Only</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setShowReasonModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingReason}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D96827]/20 cursor-pointer"
                  >
                    {creatingReason ? "Creating..." : "Save Reason"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: CAPITAL TOP-UP */}
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
                  className="p-1 text-[#8B8179] hover:text-[#29221E] cursor-pointer"
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
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E9D9C5]">
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

        {/* MODAL 4: DELETE EXPENSE CONFIRMATION */}
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#29221E]">Delete Expense?</h3>
                  <p className="text-xs text-[#8B8179]">This action cannot be undone.</p>
                </div>
              </div>

              <div className="bg-[#F7F6F3] p-3 rounded-xl border border-[#E9D9C5] my-3 text-xs space-y-1">
                <div className="font-bold text-[#29221E]">
                  {expenseToDelete.title || getReasonDisplay(expenseToDelete.category)}
                </div>
                <div className="font-mono text-[#D94B45] font-bold">
                  -{formatETB(expenseToDelete.amount)}
                </div>
                <div className="text-[11px] text-[#8B8179]">
                  {expenseToDelete.fundSource === "DAILY_CASH"
                    ? "Daily Cash Drawer"
                    : "General Capital"}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteExpense}
                  className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: SYSTEM POPUP NOTIFICATION (Replacement for browser alerts) */}
        {notification.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    notification.type === "success"
                      ? "bg-[#EBF5F0] text-[#26845B]"
                      : "bg-[#FDF0EF] text-[#D94B45]"
                  }`}
                >
                  {notification.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <h3 className="text-base font-bold text-[#29221E]">{notification.title}</h3>
              </div>
              <p className="text-xs text-[#8B8179] leading-relaxed mb-4">
                {notification.message}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setNotification({ ...notification, show: false })}
                  className="px-4 py-2 bg-[#29221E] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
