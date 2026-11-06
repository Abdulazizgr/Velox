"use client";

import { useEffect, useState, useMemo } from "react";
import { formatETB } from "@/lib/utils";
import {
  Timer,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  Sparkles,
  Phone,
  User,
  CreditCard,
  Check,
  X,
  Volume2,
  VolumeX,
  Layers,
} from "lucide-react";

interface ShoeSwapLog {
  oldShoeId: string;
  newShoeId: string;
  swappedAt: string;
  reason?: string;
}

interface RentalSessionItem {
  _id: string;
  shoeId: string;
  shoeSize: number;
  customerName: string;
  customerPhone?: string;
  baseDurationMinutes: number;
  gracePeriodMinutes: number;
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
  shoeSwaps?: ShoeSwapLog[];
}

interface ShoeOption {
  _id: string;
  shoeId: string;
  size: number;
  status: string;
}

export default function RentalBoardPage() {
  const [sessions, setSessions] = useState<RentalSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "OVERDUE" | "COMPLETED">("ACTIVE");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // New Rental Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [availableShoes, setAvailableShoes] = useState<ShoeOption[]>([]);
  const [selectedSize, setSelectedSize] = useState<number>(40);
  const [selectedShoeId, setSelectedShoeId] = useState<string>("");
  const [duration, setDuration] = useState<30 | 60>(30);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState<"UNPAID" | "PAID">("UNPAID");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [submitting, setSubmitting] = useState(false);

  // Swap Modal State
  const [swapSession, setSwapSession] = useState<RentalSessionItem | null>(null);
  const [swapNewShoeId, setSwapNewShoeId] = useState("");
  const [swapReason, setSwapReason] = useState("Customer uncomfortable / fit adjustment");
  const [swapLoading, setSwapLoading] = useState(false);

  // Return & Settle Modal State
  const [returnSession, setReturnSession] = useState<RentalSessionItem | null>(null);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [returnLoading, setReturnLoading] = useState(false);

  // 1-second interval to update live countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rentals?status=ALL");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableShoes = async () => {
    try {
      const res = await fetch("/api/shoes");
      if (res.ok) {
        const data = await res.json();
        setAvailableShoes(data.shoes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRentals();
    fetchAvailableShoes();
  }, []);

  // Filter available shoes by selected size
  const shoesForSelectedSize = useMemo(() => {
    return availableShoes.filter((s) => s.size === selectedSize && s.status === "AVAILABLE");
  }, [availableShoes, selectedSize]);

  // Set default shoe id when size changes
  useEffect(() => {
    if (shoesForSelectedSize.length > 0) {
      setSelectedShoeId(shoesForSelectedSize[0].shoeId);
    } else {
      setSelectedShoeId("");
    }
  }, [shoesForSelectedSize]);

  // Pricing calculations for current day
  const isWeekend = [0, 6].includes(new Date().getDay());
  const calculatedPrice = duration === 30 ? (isWeekend ? 200 : 150) : (isWeekend ? 300 : 250);

  // Handle Start Rental
  const handleStartRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShoeId) {
      alert("Please select an available Shoe ID");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoeId: selectedShoeId,
          durationMinutes: duration,
          customerName: customerName.trim() || "Walk-in Skater",
          customerPhone: customerPhone.trim(),
          paymentStatus: paymentOption,
          paymentMethod: paymentOption === "PAID" ? paymentMethod : undefined,
        }),
      });

      if (res.ok) {
        setShowNewModal(false);
        setCustomerName("");
        setCustomerPhone("");
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to start rental");
      }
    } catch {
      alert("Network error starting rental");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Extend Minutes (+30 or +60 min)
  const handleExtend = async (session: RentalSessionItem, addedMinutes: number) => {
    const fee = addedMinutes === 30 ? (session.pricingType === "WEEKEND" ? 200 : 150) : (session.pricingType === "WEEKEND" ? 300 : 250);
    const confirmed = confirm(`Add +${addedMinutes} minutes for ${fee} ETB to shoe ${session.shoeId}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/rentals/${session._id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addedMinutes }),
      });

      if (res.ok) {
        fetchRentals();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to extend session");
      }
    } catch {
      alert("Error extending session");
    }
  };

  // Handle Swap Shoe
  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapSession || !swapNewShoeId) return;

    setSwapLoading(true);
    try {
      const res = await fetch(`/api/rentals/${swapSession._id}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newShoeId: swapNewShoeId, reason: swapReason }),
      });

      if (res.ok) {
        setSwapSession(null);
        setSwapNewShoeId("");
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to swap shoe");
      }
    } catch {
      alert("Error swapping shoe");
    } finally {
      setSwapLoading(false);
    }
  };

  // Handle Return Shoe & Settle
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSession) return;

    setReturnLoading(true);
    try {
      const res = await fetch(`/api/rentals/${returnSession._id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: returnPaymentMethod }),
      });

      if (res.ok) {
        setReturnSession(null);
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to return shoe");
      }
    } catch {
      alert("Error returning shoe");
    } finally {
      setReturnLoading(false);
    }
  };

  // Helper to compute countdown status
  const getSessionTimerData = (session: RentalSessionItem) => {
    const endMs = new Date(session.expectedEndTime).getTime();
    const diffMs = endMs - now;

    const isOverdue = diffMs < 0;
    const isDueSoon = diffMs >= 0 && diffMs <= 5 * 60 * 1000;

    const absDiffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(absDiffSeconds / 60);
    const seconds = absDiffSeconds % 60;
    const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    return {
      isOverdue,
      isDueSoon,
      diffMs,
      timeFormatted,
      minutes,
    };
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const matchesQuery =
          searchQuery === "" ||
          s.shoeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.shoeSize.toString().includes(searchQuery);

        if (!matchesQuery) return false;

        const timer = getSessionTimerData(s);
        if (statusTab === "ACTIVE") {
          return s.status === "ACTIVE";
        }
        if (statusTab === "OVERDUE") {
          return s.status === "ACTIVE" && timer.isOverdue;
        }
        if (statusTab === "COMPLETED") {
          return s.status === "COMPLETED";
        }
        return true;
      })
      .sort((a, b) => {
        // Sort active sessions by earliest expectedEndTime first (Requirement #14)
        return new Date(a.expectedEndTime).getTime() - new Date(b.expectedEndTime).getTime();
      });
  }, [sessions, searchQuery, statusTab, now]);

  const activeCount = sessions.filter((s) => s.status === "ACTIVE").length;
  const overdueCount = sessions.filter((s) => s.status === "ACTIVE" && getSessionTimerData(s).isOverdue).length;
  const dueSoonCount = sessions.filter(
    (s) => s.status === "ACTIVE" && getSessionTimerData(s).isDueSoon
  ).length;

  const distinctSizes = Array.from(new Set(availableShoes.map((s) => s.size))).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="h-6 w-6 text-emerald-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Live Rental Timer Board</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 2
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Real-time countdowns (+5m prep buffer), sorted by earliest finish time. Manage shoe swaps & returns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              onClick={() => {
                fetchRentals();
                fetchAvailableShoes();
              }}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Start New Rental
            </button>
          </div>
        </div>

        {/* Counter Stats & Status Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setStatusTab("ACTIVE")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "ACTIVE"
                ? "bg-zinc-900 border-emerald-500 shadow-md shadow-emerald-500/10"
                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-semibold text-zinc-400">Active on Rink</span>
              <Clock className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{activeCount}</span>
              {dueSoonCount > 0 && (
                <span className="text-xs text-amber-400 font-semibold">({dueSoonCount} due soon)</span>
              )}
            </div>
          </button>

          <button
            onClick={() => setStatusTab("OVERDUE")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "OVERDUE"
                ? "bg-zinc-900 border-rose-500 shadow-md shadow-rose-500/10"
                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-semibold text-zinc-400">Overdue Skaters</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-rose-400">{overdueCount}</div>
          </button>

          <button
            onClick={() => setStatusTab("COMPLETED")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "COMPLETED"
                ? "bg-zinc-900 border-zinc-500 shadow-md"
                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-semibold text-zinc-400">Completed Today</span>
              <CheckCircle2 className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-300">
              {sessions.filter((s) => s.status === "COMPLETED").length}
            </div>
          </button>
        </div>

        {/* Search & Quick Filter Bar */}
        <div className="flex items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by Shoe ID (e.g. SK-40-01) or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-zinc-400 hidden sm:block">
            Showing <strong className="text-white">{filteredSessions.length}</strong> sessions
          </div>
        </div>

        {/* Live Timer Grid */}
        {filteredSessions.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-zinc-500">
            <Timer className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-semibold text-zinc-300">No sessions match this filter</p>
            <p className="text-xs text-zinc-500 mt-1">
              {statusTab === "ACTIVE"
                ? "No skaters currently on the rink. Click 'Start New Rental' to issue skates."
                : statusTab === "OVERDUE"
                ? "Great! No skaters are currently overdue."
                : "No completed sessions recorded yet today."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => {
              const timer = getSessionTimerData(session);
              const isActive = session.status === "ACTIVE";

              return (
                <div
                  key={session._id}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between relative overflow-hidden ${
                    !isActive
                      ? "bg-zinc-900/40 border-zinc-800 opacity-80"
                      : timer.isOverdue
                      ? "bg-gradient-to-b from-rose-950/30 to-zinc-900 border-rose-500 shadow-lg shadow-rose-950/20"
                      : timer.isDueSoon
                      ? "bg-gradient-to-b from-amber-950/30 to-zinc-900 border-amber-500 shadow-lg shadow-amber-950/20"
                      : "bg-zinc-900/90 border-emerald-500/40 hover:border-emerald-500"
                  }`}
                >
                  {/* Status ribbon accent */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      !isActive
                        ? "bg-zinc-700"
                        : timer.isOverdue
                        ? "bg-rose-500 animate-pulse"
                        : timer.isDueSoon
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                    }`}
                  />

                  <div>
                    {/* Top Row: Shoe Tag & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl font-black text-white tracking-tight">
                            {session.shoeId}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                            Size #{session.shoeSize}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                          <User className="h-3 w-3 text-zinc-500" />
                          <span>{session.customerName}</span>
                          {session.customerPhone && (
                            <span className="text-zinc-500 font-mono">({session.customerPhone})</span>
                          )}
                        </div>
                      </div>

                      {/* Timer / Status Pill */}
                      <div>
                        {!isActive ? (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Returned
                          </span>
                        ) : timer.isOverdue ? (
                          <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-500 text-white animate-pulse">
                            OVERDUE +{timer.minutes}m
                          </span>
                        ) : timer.isDueSoon ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Due Soon ({timer.minutes}m)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Countdown Display */}
                    {isActive ? (
                      <div className="py-4 my-2 text-center rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                        <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">
                          {timer.isOverdue ? "Overdue Time" : "Remaining Time"}
                        </div>
                        <div
                          className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
                            timer.isOverdue
                              ? "text-rose-400"
                              : timer.isDueSoon
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {timer.timeFormatted}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1.5 flex items-center justify-center gap-2">
                          <span>
                            Started: {new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>•</span>
                          <span>
                            Due: {new Date(session.expectedEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 my-2 text-center rounded-xl bg-zinc-950/40 border border-zinc-800/40 text-xs text-zinc-500">
                        Session ended at {session.actualReturnTime ? new Date(session.actualReturnTime).toLocaleTimeString() : "Closed"}
                      </div>
                    )}

                    {/* Financial details & Swaps */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-500">Total Fee: </span>
                        <strong className="text-white font-mono">{formatETB(session.totalRentalFee)}</strong>
                        {session.extensionPrice > 0 && (
                          <span className="text-[10px] text-amber-400 block">
                            (Includes +{formatETB(session.extensionPrice)} ext.)
                          </span>
                        )}
                      </div>

                      <div>
                        {session.paymentStatus === "PAID" ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            PAID ({session.paymentMethod || "CASH"})
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            UNPAID (TAB)
                          </span>
                        )}
                      </div>
                    </div>

                    {session.shoeSwaps && session.shoeSwaps.length > 0 && (
                      <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800">
                        🔄 Swapped from {session.shoeSwaps[0].oldShoeId} to {session.shoeSwaps[0].newShoeId}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons (Only for Active sessions) */}
                  {isActive && (
                    <div className="mt-4 pt-3 border-t border-zinc-800 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          setSwapSession(session);
                          setSwapNewShoeId("");
                        }}
                        className="py-2 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Swap shoe for comfortable fit"
                      >
                        <Repeat className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Swap</span>
                      </button>

                      <button
                        onClick={() => handleExtend(session, 30)}
                        className="py-2 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Add +30 minutes"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-400" />
                        <span>+30m</span>
                      </button>

                      <button
                        onClick={() => {
                          setReturnSession(session);
                          setReturnPaymentMethod(session.paymentMethod || "CASH");
                        }}
                        className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-emerald-600/20"
                        title="Return shoe and settle bill"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Return</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 1. START NEW RENTAL MODAL */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Start Skate Rental Session</h3>
                    <p className="text-xs text-zinc-400">Assign shoe, set duration, and launch countdown.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleStartRental} className="mt-5 space-y-4">
                {/* Hygiene reminder banner (Requirement 5: lastics / festal) */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Hygiene Protocol:</strong> Remember to give the customer <strong>2 plastic foot liners (festal/lastics)</strong> with these skates!
                  </span>
                </div>

                {/* Step 1: Select Shoe Size */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    1. Select Shoe Size
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                    {distinctSizes.map((size) => {
                      const avail = availableShoes.filter((s) => s.size === size && s.status === "AVAILABLE").length;
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center min-w-[58px] ${
                            isSelected
                              ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 scale-105"
                              : avail > 0
                              ? "bg-zinc-950 text-white border border-zinc-800 hover:border-zinc-700"
                              : "bg-zinc-950/40 text-zinc-600 border border-zinc-900 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <span className="text-sm">#{size}</span>
                          <span className="text-[10px] font-normal opacity-80">
                            {avail > 0 ? `${avail} left` : "0 left"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Specific Shoe ID */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    2. Choose Available Shoe Asset (Unique ID)
                  </label>
                  {shoesForSelectedSize.length === 0 ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      ⚠️ No shoes of Size #{selectedSize} are currently available. All units are currently on the rink or in maintenance.
                    </div>
                  ) : (
                    <select
                      value={selectedShoeId}
                      onChange={(e) => setSelectedShoeId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {shoesForSelectedSize.map((s) => (
                        <option key={s._id} value={s.shoeId}>
                          {s.shoeId} (Size #{s.size}) — AVAILABLE
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 3: Duration & Price */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    3. Rental Duration & Timing
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDuration(30)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        duration === 30
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="font-bold text-sm text-white">30 Minutes</div>
                      <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                        {isWeekend ? "200 ETB (Weekend)" : "150 ETB (Weekday)"}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        +5m buffer = <strong>35m timer</strong>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDuration(60)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        duration === 60
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="font-bold text-sm text-white">60 Minutes (1 Hour)</div>
                      <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                        {isWeekend ? "300 ETB (Weekend)" : "250 ETB (Weekday)"}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        +5m buffer = <strong>65m timer</strong>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 4: Customer Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kidus"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="09..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Step 5: Payment Timing (Pay Upfront vs Pay Later) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    4. Payment Timing
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("UNPAID")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        paymentOption === "UNPAID"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Pay After Skating (Open Tab)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("PAID")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        paymentOption === "PAID"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Pay Upfront Now ({formatETB(calculatedPrice)})
                    </button>
                  </div>

                  {paymentOption === "PAID" && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                            paymentMethod === method
                              ? "bg-emerald-500 text-zinc-950"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !selectedShoeId}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? "Launching Session..." : `Start Session (${duration + 5} min total timer)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. SHOE SWAP MODAL */}
        {swapSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Swap Skate Shoe</h3>
                </div>
                <button
                  onClick={() => setSwapSession(null)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSwapSubmit} className="mt-4 space-y-4">
                <p className="text-xs text-zinc-400">
                  Swapping from current shoe <strong className="text-white font-mono">{swapSession.shoeId}</strong> (Size #{swapSession.shoeSize}). The timer will continue without interruption.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Select New Available Shoe
                  </label>
                  <select
                    value={swapNewShoeId}
                    onChange={(e) => setSwapNewShoeId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">-- Choose available replacement shoe --</option>
                    {availableShoes
                      .filter((s) => s.status === "AVAILABLE" && s.shoeId !== swapSession.shoeId)
                      .map((s) => (
                        <option key={s._id} value={s.shoeId}>
                          {s.shoeId} (Size #{s.size})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSwapSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={swapLoading || !swapNewShoeId}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    {swapLoading ? "Swapping..." : "Confirm Shoe Swap"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. RETURN & CHECKOUT MODAL */}
        {returnSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Return Shoe & Settle Bill</h3>
                </div>
                <button
                  onClick={() => setReturnSession(null)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReturnSubmit} className="mt-4 space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Shoe Asset:</span>
                    <strong className="text-white font-mono">{returnSession.shoeId} (Size #{returnSession.shoeSize})</strong>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Customer:</span>
                    <span className="text-white">{returnSession.customerName}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Rental Duration:</span>
                    <span className="text-white">{returnSession.totalMinutes - returnSession.gracePeriodMinutes} mins</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-zinc-300">Total Amount Due:</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {formatETB(returnSession.totalRentalFee)}
                    </span>
                  </div>
                  {returnSession.paymentStatus === "PAID" && (
                    <div className="text-[11px] text-emerald-400 text-right">
                      Already pre-paid via {returnSession.paymentMethod}
                    </div>
                  )}
                </div>

                {returnSession.paymentStatus !== "PAID" && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1.5">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setReturnPaymentMethod(method)}
                          className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            returnPaymentMethod === method
                              ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    {returnLoading ? "Closing..." : "Confirm Return & Mark Available"}
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
