"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { formatETB, format12HourTime, triggerVibration } from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import {
  Timer,
  Plus,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  Sparkles,
  Footprints,
  User,
  Check,
  X,
  Volume2,
  VolumeX,
  ArrowUpDown,
  History,
  QrCode,
  BellRing,
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
  skateType?: "INLINE" | "QUAD";
  shoeSwaps?: ShoeSwapLog[];
  tabTotal?: number;
  tabItemsCount?: number;
}

interface ShoeOption {
  _id: string;
  shoeId: string;
  size: number;
  type?: "INLINE" | "QUAD";
  status: string;
}

export default function RentalBoardPage() {
  const { showAlert, showConfirm } = useAlertModal();
  const [sessions, setSessions] = useState<RentalSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "OVERDUE" | "COMPLETED">("ACTIVE");
  const [sortBy, setSortBy] = useState<"EARLIEST_END" | "SHOE_ID" | "SIZE">("EARLIEST_END");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio trigger ref to prevent repeating sound every second
  const playedAlertsRef = useRef<Set<string>>(new Set());
  // 30-second recurring alert timestamp ref for overdue sessions
  const lastOverdueReminderRef = useRef<number>(0);

  // New Rental Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [availableShoes, setAvailableShoes] = useState<ShoeOption[]>([]);
  const [selectedSize, setSelectedSize] = useState<number>(40);
  const [selectedType, setSelectedType] = useState<"INLINE" | "QUAD">("INLINE");
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

  // Web Audio synthesizer chime and vibration for alerts
  const playAudioCue = (type: "start" | "due" | "overdue" | "chime") => {
    // Mobile haptic vibration alerts (supported on Android/Chrome/PWA)
    if (type === "overdue") {
      triggerVibration([300, 100, 300, 100, 500]);
    } else if (type === "due") {
      triggerVibration([200, 100, 200]);
    }

    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "start") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "due") {
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "overdue") {
        // Distinct pulsing alarm sound for overdue sessions
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(620, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(620, ctx.currentTime + 0.3);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  // Unlock audio autoplay on first interaction
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const dummy = new AudioCtx();
          if (dummy.state === "suspended") {
            dummy.resume();
          }
        }
      } catch {}
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // 1-second interval to update live countdown timers & check alerts
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      // Find all currently active sessions that are overdue
      const activeOverdueSessions = sessions.filter(
        (s) => s.status === "ACTIVE" && new Date(s.expectedEndTime).getTime() < currentNow
      );

      if (activeOverdueSessions.length > 0) {
        // Check if any session just transitioned into overdue status
        let hasNewOverdue = false;
        activeOverdueSessions.forEach((s) => {
          if (!playedAlertsRef.current.has(`${s._id}-overdue`)) {
            playedAlertsRef.current.add(`${s._id}-overdue`);
            hasNewOverdue = true;
          }
        });

        // Trigger alarm + vibration immediately on first transition, OR every 30 seconds while overdue
        const timeSinceLastAlert = currentNow - lastOverdueReminderRef.current;
        if (hasNewOverdue || timeSinceLastAlert >= 30_000) {
          lastOverdueReminderRef.current = currentNow;
          playAudioCue("overdue");
        }
      } else {
        // Reset reminder timestamp when there are no overdue sessions
        lastOverdueReminderRef.current = 0;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sessions, soundEnabled]);

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

  // Check available skate types (Inline vs Quads) for the currently selected size
  const availableTypesForSelectedSize = useMemo(() => {
    const shoesForSize = availableShoes.filter((s) => s.size === selectedSize);
    const inlineShoes = shoesForSize.filter((s) => (s.type || "INLINE") === "INLINE");
    const quadShoes = shoesForSize.filter((s) => s.type === "QUAD");

    const hasInline = inlineShoes.length > 0;
    const hasQuad = quadShoes.length > 0;

    const inlineAvail = inlineShoes.filter((s) => s.status === "AVAILABLE").length;
    const quadAvail = quadShoes.filter((s) => s.status === "AVAILABLE").length;

    return {
      hasInline,
      hasQuad,
      inlineAvail,
      quadAvail,
      onlyInline: hasInline && !hasQuad,
      onlyQuad: hasQuad && !hasInline,
    };
  }, [availableShoes, selectedSize]);

  // If a size number only has one type or only one available type, auto-switch to it
  useEffect(() => {
    if (availableTypesForSelectedSize.onlyQuad) {
      setSelectedType("QUAD");
    } else if (availableTypesForSelectedSize.onlyInline) {
      setSelectedType("INLINE");
    } else if (availableTypesForSelectedSize.inlineAvail === 0 && availableTypesForSelectedSize.quadAvail > 0) {
      setSelectedType("QUAD");
    } else if (availableTypesForSelectedSize.quadAvail === 0 && availableTypesForSelectedSize.inlineAvail > 0) {
      setSelectedType("INLINE");
    }
  }, [
    selectedSize,
    availableTypesForSelectedSize.onlyQuad,
    availableTypesForSelectedSize.onlyInline,
    availableTypesForSelectedSize.inlineAvail,
    availableTypesForSelectedSize.quadAvail,
  ]);

  // Filter available shoes by selected size AND selected skate type
  const shoesForSelectedSizeAndType = useMemo(() => {
    return availableShoes.filter(
      (s) =>
        s.size === selectedSize &&
        (s.type || "INLINE") === selectedType &&
        s.status === "AVAILABLE"
    );
  }, [availableShoes, selectedSize, selectedType]);

  // Top 3 active rented shoes for selected size AND selected type returning earliest
  const activeSessionsForSelectedSizeAndType = useMemo(() => {
    return sessions
      .filter((s) => {
        const shoeObj = availableShoes.find((sh) => sh.shoeId === s.shoeId);
        const sessionType = shoeObj?.type || s.skateType || "INLINE";
        return (
          s.status === "ACTIVE" &&
          s.shoeSize === selectedSize &&
          sessionType === selectedType
        );
      })
      .sort((a, b) => new Date(a.expectedEndTime).getTime() - new Date(b.expectedEndTime).getTime())
      .slice(0, 3);
  }, [sessions, selectedSize, selectedType, availableShoes]);

  // Set default shoe id when size or type changes
  useEffect(() => {
    if (shoesForSelectedSizeAndType.length > 0) {
      setSelectedShoeId(shoesForSelectedSizeAndType[0].shoeId);
    } else {
      setSelectedShoeId("");
    }
  }, [shoesForSelectedSizeAndType]);

  // Pricing calculations for current day
  const isWeekend = [0, 6].includes(new Date().getDay());
  const calculatedPrice = duration === 30 ? (isWeekend ? 200 : 150) : (isWeekend ? 300 : 250);

  // Handle Start Rental
  const handleStartRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShoeId) {
      showAlert({
        title: "Shoe Required",
        message: "Please choose an available shoe asset before starting the rental.",
        type: "warning",
      });
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
          customerName: customerName.trim() || "Skater",
          customerPhone: customerPhone.trim(),
          paymentStatus: paymentOption,
          paymentMethod: paymentOption === "PAID" ? paymentMethod : undefined,
        }),
      });

      if (res.ok) {
        playAudioCue("start");
        setShowNewModal(false);
        setCustomerName("");
        setCustomerPhone("");
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        showAlert({
          title: "Failed to Issue Skates",
          message: data.error || "Unable to start rental session.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Network error occurred while starting rental. Please check connection.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Extend Minutes (+30 or +60 min / 1 hr)
  const handleExtend = (session: RentalSessionItem, addedMinutes: number) => {
    const fee =
      addedMinutes === 30
        ? session.pricingType === "WEEKEND"
          ? 200
          : 150
        : session.pricingType === "WEEKEND"
        ? 300
        : 250;
    const durationLabel = addedMinutes === 30 ? "30 minutes" : "1 hour (60 minutes)";

    showConfirm({
      title: `Extend Session (+${addedMinutes === 30 ? "30m" : "1h"})`,
      message: `Add +${durationLabel} for ${fee} ETB to shoe ${session.shoeId} (${session.customerName})?\n\nThis will add +${durationLabel} to their countdown timer and append ${fee} ETB to their rental fee.`,
      confirmText: `Add +${addedMinutes === 30 ? "30m" : "1h"} (${fee} ETB)`,
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/rentals/${session._id}/extend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addedMinutes }),
          });

          if (res.ok) {
            playAudioCue("chime");
            fetchRentals();
          } else {
            const data = await res.json();
            showAlert({
              title: "Extension Failed",
              message: data.error || "Failed to extend session",
              type: "error",
            });
          }
        } catch {
          showAlert({
            title: "Network Error",
            message: "Error communicating with server while extending session.",
            type: "error",
          });
        }
      },
    });
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
        playAudioCue("chime");
        setSwapSession(null);
        setSwapNewShoeId("");
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        showAlert({
          title: "Swap Failed",
          message: data.error || "Failed to swap shoe",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Network Error",
        message: "Error communicating with server while swapping shoe.",
        type: "error",
      });
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
        playAudioCue("chime");
        setReturnSession(null);
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        showAlert({
          title: "Return Failed",
          message: data.error || "Failed to return shoe",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Network Error",
        message: "Error communicating with server while returning shoe.",
        type: "error",
      });
    } finally {
      setReturnLoading(false);
    }
  };

  // Compute remaining timer metrics
  const getSessionTimerData = (session: RentalSessionItem) => {
    const endMs = new Date(session.expectedEndTime).getTime();
    const diffMs = endMs - now;

    const isOverdue = diffMs < 0;
    const isDueSoon = diffMs >= 0 && diffMs <= 5 * 60 * 1000;

    const absDiffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(absDiffSeconds / 60);
    const seconds = absDiffSeconds % 60;
    const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Progress percentage
    const totalMs = session.totalMinutes * 60 * 1000;
    const elapsedMs = now - new Date(session.startedAt).getTime();
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

    return {
      isOverdue,
      isDueSoon,
      diffMs,
      timeFormatted,
      minutes,
      progressPercent,
    };
  };

  // Filter & Sort Sessions
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
        if (sortBy === "EARLIEST_END") {
          // Requirement #14: Sort based on expected finish time (who will be out early)
          return (
            new Date(a.expectedEndTime).getTime() - new Date(b.expectedEndTime).getTime()
          );
        }
        if (sortBy === "SHOE_ID") {
          return a.shoeId.localeCompare(b.shoeId);
        }
        if (sortBy === "SIZE") {
          return a.shoeSize - b.shoeSize;
        }
        return 0;
      });
  }, [sessions, searchQuery, statusTab, sortBy, now]);

  const activeCount = sessions.filter((s) => s.status === "ACTIVE").length;
  const overdueCount = sessions.filter(
    (s) => s.status === "ACTIVE" && getSessionTimerData(s).isOverdue
  ).length;
  const dueSoonCount = sessions.filter(
    (s) => s.status === "ACTIVE" && getSessionTimerData(s).isDueSoon
  ).length;
  const completedTodayCount = sessions.filter((s) => s.status === "COMPLETED").length;

  const distinctSizes = Array.from(new Set(availableShoes.map((s) => s.size))).sort(
    (a, b) => a - b
  );

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        {/* Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="h-6 w-6 text-[#D96827]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                Live Rental Timer Board
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                Live Board
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8B8179]">
              Sorted by finish time • +5m grace period • In-flight shoe swaps & extensions
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Audio Toggle & Sound Test */}
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) playAudioCue("chime");
              }}
              title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                soundEnabled
                  ? "bg-[#FFF4E5] border-[#E9D9C5] text-[#D96827] hover:bg-[#FCEAD2]"
                  : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-[11px] hidden sm:inline font-semibold">
                {soundEnabled ? "Sound ON" : "Muted"}
              </span>
            </button>

            <button
              onClick={() => {
                fetchRentals();
                fetchAvailableShoes();
              }}
              disabled={loading}
              className="p-2.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Issue Skates</span>
            </button>
          </div>
        </div>

        {/* Status Highlight Tabs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <button
            onClick={() => setStatusTab("ACTIVE")}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "ACTIVE"
                ? "bg-gradient-to-br from-[#FFF4E5] to-[#FDF0DE] border-2 border-[#D96827] shadow-md shadow-[#D96827]/15 ring-2 ring-[#D96827]/20"
                : "bg-[#FFFBF5] border border-[#F3D5BD] hover:border-[#D96827] hover:bg-[#FFF4E5]/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[#A85822]">
                Active
              </span>
              <span className="p-1 rounded-lg bg-[#FFE7D1] text-[#D96827]">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#29221E]">{activeCount}</span>
              {dueSoonCount > 0 && (
                <span className="text-[11px] text-[#D96827] font-bold">
                  ({dueSoonCount} due)
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setStatusTab("OVERDUE")}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "OVERDUE"
                ? "bg-gradient-to-br from-[#FDF0EF] to-[#FCE3E1] border-2 border-[#D94B45] shadow-md shadow-[#D94B45]/20 ring-2 ring-[#D94B45]/20"
                : "bg-[#FFF7F7] border border-[#F8CECC] hover:border-[#D94B45] hover:bg-[#FDF0EF]/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[#C43833]">
                Overdue
              </span>
              <span className="p-1 rounded-lg bg-[#FDE2E0] text-[#D94B45]">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#D94B45]">{overdueCount}</span>
              {overdueCount > 0 && (
                <span className="inline-block h-2 w-2 rounded-full bg-[#D94B45] animate-ping ml-1" />
              )}
            </div>
          </button>

          <button
            onClick={() => setStatusTab("COMPLETED")}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "COMPLETED"
                ? "bg-gradient-to-br from-[#F0F7F3] to-[#E2EFE7] border-2 border-[#2D7A4D] shadow-md shadow-[#2D7A4D]/15 ring-2 ring-[#2D7A4D]/20"
                : "bg-[#F6FAF7] border border-[#CDE6D7] hover:border-[#2D7A4D] hover:bg-[#F0F7F3]/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[#23603D]">
                Returned
              </span>
              <span className="p-1 rounded-lg bg-[#DEECE3] text-[#2D7A4D]">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#2D7A4D]">
              {completedTodayCount}
            </div>
          </button>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#E9D9C5] rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8B8179]" />
            <input
              type="text"
              placeholder="Search Shoe ID (e.g. SK-40-01) or skater name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs sm:text-sm text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827] font-mono"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#8B8179]">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#D96827]" />
              <span className="font-semibold text-[#29221E]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "EARLIEST_END" | "SHOE_ID" | "SIZE")}
                className="bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl px-2.5 py-1.5 text-[#29221E] font-medium text-xs focus:outline-none cursor-pointer"
              >
                <option value="EARLIEST_END">Earliest Finish Time (Default)</option>
                <option value="SHOE_ID">Shoe ID</option>
                <option value="SIZE">Shoe Size</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Timer Grid */}
        {filteredSessions.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-2xl bg-white border border-[#E9D9C5] text-[#8B8179] shadow-sm">
            <Timer className="h-12 w-12 mx-auto mb-3 opacity-30 text-[#D96827]" />
            <p className="text-base font-bold text-[#29221E]">No sessions match this view</p>
            <p className="text-xs text-[#8B8179] mt-1 max-w-sm mx-auto">
              {statusTab === "ACTIVE"
                ? "No skaters currently active. Tap 'Issue Skates' to allocate shoes."
                : statusTab === "OVERDUE"
                ? "All skaters are currently on time! No overdue sessions."
                : "No completed sessions recorded yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredSessions.map((session) => {
              const timer = getSessionTimerData(session);
              const isActive = session.status === "ACTIVE";

              return (
                <div
                  key={session._id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between relative overflow-hidden bg-white shadow-sm ${
                    !isActive
                      ? "border-[#E9D9C5] opacity-75"
                      : timer.isOverdue
                      ? "border-2 border-[#D94B45] shadow-md"
                      : timer.isDueSoon
                      ? "border-2 border-[#D96827] shadow-md"
                      : "border-[#E9D9C5] hover:border-[#D96827]/60"
                  }`}
                >
                  {/* Top Progress / Alert Strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 transition-all ${
                      !isActive
                        ? "bg-[#E9D9C5]"
                        : timer.isOverdue
                        ? "bg-[#D94B45] animate-pulse"
                        : timer.isDueSoon
                        ? "bg-[#D96827]"
                        : "bg-[#26845B]"
                    }`}
                  />

                  <div>
                    {/* Header: Shoe ID + Status Tag */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xl sm:text-2xl font-black text-[#29221E] tracking-tight">
                            {session.shoeId}
                          </span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                            Size #{session.shoeSize}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              (session.skateType || "INLINE") === "QUAD"
                                ? "bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]"
                                : "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]"
                            }`}
                          >
                            {(session.skateType || "INLINE") === "QUAD" ? "Quads" : "Inline"}
                          </span>
                        </div>
                        <div className="text-xs text-[#8B8179] mt-1 flex items-center gap-1.5 truncate">
                          <User className="h-3 w-3 text-[#8B8179] shrink-0" />
                          <span className="font-semibold text-[#29221E]">{session.customerName}</span>
                          {session.customerPhone && (
                            <span className="text-[#8B8179] font-mono text-[11px]">
                              ({session.customerPhone})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="shrink-0">
                        {!isActive ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]">
                            Returned
                          </span>
                        ) : timer.isOverdue ? (
                          <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#D94B45] text-white animate-pulse">
                            OVERDUE +{timer.minutes}m
                          </span>
                        ) : timer.isDueSoon ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#D96827]/40">
                            Due Soon ({timer.minutes}m)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/40">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Countdown Digits */}
                    {isActive ? (
                      <div className="py-3 my-2 text-center rounded-xl bg-[#F7F6F3] border border-[#E9D9C5]">
                        <div className="text-[10px] text-[#8B8179] uppercase tracking-widest font-semibold mb-0.5">
                          {timer.isOverdue ? "Overdue Exceeded" : "Time Remaining"}
                        </div>
                        <div
                          className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
                            timer.isOverdue
                              ? "text-[#D94B45]"
                              : timer.isDueSoon
                              ? "text-[#D96827]"
                              : "text-[#26845B]"
                          }`}
                        >
                          {timer.timeFormatted}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-48 mx-auto mt-2 h-1.5 rounded-full bg-[#E9D9C5] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              timer.isOverdue
                                ? "bg-[#D94B45]"
                                : timer.isDueSoon
                                ? "bg-[#D96827]"
                                : "bg-[#26845B]"
                            }`}
                            style={{ width: `${timer.progressPercent}%` }}
                          />
                        </div>

                        <div className="text-[11px] text-[#8B8179] mt-2 flex items-center justify-center gap-2 font-mono">
                          <span>
                            Started: {format12HourTime(session.startedAt)}
                          </span>
                          <span>•</span>
                          <span className="text-[#29221E] font-bold">
                            Due: {format12HourTime(session.expectedEndTime)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 my-2 text-center rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs text-[#8B8179]">
                        Returned at{" "}
                        {session.actualReturnTime
                          ? format12HourTime(session.actualReturnTime)
                          : "Closed"}
                      </div>
                    )}

                    {/* Financial summary & Snack Tabs */}
                    <div className="mt-2.5 pt-2.5 border-t border-[#E9D9C5] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#8B8179]">Skate Fee: </span>
                        <strong className="text-[#29221E] font-mono">
                          {formatETB(session.totalRentalFee)}
                        </strong>
                        {session.extensionPrice > 0 && (
                          <span className="text-[10px] text-[#D96827] block font-mono font-semibold">
                            (+{formatETB(session.extensionPrice)} ext.)
                          </span>
                        )}
                      </div>

                      <div>
                        {session.paymentStatus === "PAID" ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                            PAID ({session.paymentMethod || "CASH"})
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                            UNPAID (TAB)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attached Snack Concession Tab if any */}
                    {session.tabTotal && session.tabTotal > 0 ? (
                      <div className="mt-2 text-[11px] text-[#29221E] bg-[#FFF4E5] p-2 rounded-xl border border-[#E9D9C5] flex items-center justify-between">
                        <span>🍿 Attached Concession ({session.tabItemsCount || 0} items)</span>
                        <strong className="font-mono font-bold text-[#D96827]">+{formatETB(session.tabTotal)}</strong>
                      </div>
                    ) : null}

                    {/* Swap notice */}
                    {session.shoeSwaps && session.shoeSwaps.length > 0 && (
                      <div className="mt-2 text-[10px] text-[#8B8179] bg-[#F7F6F3] p-1.5 rounded-lg border border-[#E9D9C5] truncate">
                        🔄 Swapped from {session.shoeSwaps[0].oldShoeId} to{" "}
                        {session.shoeSwaps[0].newShoeId}
                      </div>
                    )}
                  </div>

                  {/* Bottom Operational Action Buttons */}
                  {isActive && (
                    <div className="mt-3.5 pt-3 border-t border-[#E9D9C5] grid grid-cols-4 gap-1.5 sm:gap-2">
                      <button
                        onClick={() => {
                          setSwapSession(session);
                          setSwapNewShoeId("");
                        }}
                        className="py-2 px-1 rounded-xl bg-[#F7F6F3] hover:bg-[#E9D9C5]/40 border border-[#E9D9C5] text-[11px] sm:text-xs font-semibold text-[#29221E] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Swap shoe for comfortable fit"
                      >
                        <Repeat className="h-3.5 w-3.5 text-[#D96827]" />
                        <span>Swap</span>
                      </button>

                      <button
                        onClick={() => handleExtend(session, 30)}
                        className="py-2 px-1 rounded-xl bg-[#FFF4E5] hover:bg-[#FCEAD2] border border-[#E9D9C5] text-[11px] sm:text-xs font-bold text-[#D96827] transition-colors flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer"
                        title="Add +30 minutes"
                      >
                        <Plus className="h-3 w-3 text-[#D96827]" />
                        <span>+30m</span>
                      </button>

                      <button
                        onClick={() => handleExtend(session, 60)}
                        className="py-2 px-1 rounded-xl bg-[#FFF0E6] hover:bg-[#FCD8C2] border border-[#E9D9C5] text-[11px] sm:text-xs font-bold text-[#C2571A] transition-colors flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer"
                        title="Add +1 hour (60 minutes)"
                      >
                        <Plus className="h-3 w-3 text-[#C2571A]" />
                        <span>+1h</span>
                      </button>

                      <button
                        onClick={() => {
                          setReturnSession(session);
                          setReturnPaymentMethod(session.paymentMethod || "CASH");
                        }}
                        className="py-2 px-1 rounded-xl bg-[#D96827] hover:bg-[#C2571A] text-[11px] sm:text-xs font-bold text-white transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        title="Return shoe & checkout"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#29221E]">
                      Start Skate Rental Session
                    </h3>
                    <p className="text-xs text-[#8B8179]">
                      Allocate shoe asset, apply rates, and launch countdown timer.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-1 rounded-lg text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleStartRental} className="mt-4 space-y-4">
                {/* Step 1: Select Shoe Size */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    1. Select Shoe Size
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {distinctSizes.map((size) => {
                      const avail = availableShoes.filter(
                        (s) => s.size === size && s.status === "AVAILABLE"
                      ).length;
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center min-w-[56px] shrink-0 ${
                            isSelected
                              ? "bg-[#D96827] text-white shadow-md shadow-[#D96827]/25 scale-105"
                              : avail > 0
                              ? "bg-[#F7F6F3] text-[#29221E] border border-[#E9D9C5] hover:border-[#D96827]"
                              : "bg-[#F7F6F3]/50 text-[#8B8179]/50 border border-dashed border-[#E9D9C5] opacity-50"
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

                {/* Step 2: Skate Type (Inline Skates vs Quads) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider">
                      2. Skate Type (Size #{selectedSize})
                    </label>
                    {availableTypesForSelectedSize.onlyInline && (
                      <span className="text-[10px] font-semibold text-[#8B8179] bg-[#F7F6F3] px-2 py-0.5 rounded-full border border-[#E9D9C5]">
                        Only Inline available in #{selectedSize}
                      </span>
                    )}
                    {availableTypesForSelectedSize.onlyQuad && (
                      <span className="text-[10px] font-semibold text-[#6D28D9] bg-[#EDE9FE] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                        Only Quads available in #{selectedSize}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Inline Skates Button */}
                    <button
                      type="button"
                      disabled={!availableTypesForSelectedSize.hasInline}
                      onClick={() => setSelectedType("INLINE")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedType === "INLINE"
                          ? "bg-[#D96827] text-white border-[#D96827] shadow-sm font-bold"
                          : availableTypesForSelectedSize.hasInline
                          ? "bg-white text-[#29221E] border-[#E9D9C5] hover:border-[#D96827]/40"
                          : "bg-[#F7F6F3]/50 text-[#8B8179]/40 border-dashed border-[#E9D9C5] cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Footprints className="h-4 w-4 shrink-0" />
                        <div>
                          <div className="text-xs font-bold leading-tight">Inline Skates</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              selectedType === "INLINE" ? "text-white/80" : "text-[#8B8179]"
                            }`}
                          >
                            {availableTypesForSelectedSize.hasInline
                              ? `${availableTypesForSelectedSize.inlineAvail} available`
                              : "Not stocked"}
                          </div>
                        </div>
                      </div>
                      {selectedType === "INLINE" && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      )}
                    </button>

                    {/* Quads Button */}
                    <button
                      type="button"
                      disabled={!availableTypesForSelectedSize.hasQuad}
                      onClick={() => setSelectedType("QUAD")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedType === "QUAD"
                          ? "bg-[#D96827] text-white border-[#D96827] shadow-sm font-bold"
                          : availableTypesForSelectedSize.hasQuad
                          ? "bg-white text-[#29221E] border-[#E9D9C5] hover:border-[#D96827]/40"
                          : "bg-[#F7F6F3]/50 text-[#8B8179]/40 border-dashed border-[#E9D9C5] cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <div>
                          <div className="text-xs font-bold leading-tight">Quads</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              selectedType === "QUAD" ? "text-white/80" : "text-[#8B8179]"
                            }`}
                          >
                            {availableTypesForSelectedSize.hasQuad
                              ? `${availableTypesForSelectedSize.quadAvail} available`
                              : "Not stocked"}
                          </div>
                        </div>
                      </div>
                      {selectedType === "QUAD" && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 3: Specific Shoe ID Asset */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    3. Choose Shoe Asset (Unique ID)
                  </label>
                  {shoesForSelectedSizeAndType.length === 0 ? (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#D94B45]/30 text-[#D94B45] text-xs flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-[#D94B45] mt-0.5" />
                        <div>
                          <strong className="block font-bold">
                            No {selectedType === "QUAD" ? "Quads" : "Inline Skates"} of Size #{selectedSize} are currently available.
                          </strong>
                          <span className="text-[11px] text-[#D94B45]/90">
                            Customer will need to wait for one to be returned.
                          </span>
                        </div>
                      </div>

                      {/* Helpful tip if alternate type is available */}
                      {selectedType === "INLINE" && availableTypesForSelectedSize.quadAvail > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedType("QUAD")}
                          className="w-full p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-[#D96827] text-xs flex items-center justify-between cursor-pointer hover:bg-[#FFE8CC] transition-colors"
                        >
                          <span className="font-semibold text-left">
                            💡 Quads are available for Size #{selectedSize} ({availableTypesForSelectedSize.quadAvail} left)
                          </span>
                          <span className="text-[11px] font-bold underline shrink-0">Switch to Quads &rarr;</span>
                        </button>
                      )}

                      {selectedType === "QUAD" && availableTypesForSelectedSize.inlineAvail > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedType("INLINE")}
                          className="w-full p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-[#D96827] text-xs flex items-center justify-between cursor-pointer hover:bg-[#FFE8CC] transition-colors"
                        >
                          <span className="font-semibold text-left">
                            💡 Inline Skates are available for Size #{selectedSize} ({availableTypesForSelectedSize.inlineAvail} left)
                          </span>
                          <span className="text-[11px] font-bold underline shrink-0">Switch to Inline &rarr;</span>
                        </button>
                      )}

                      {activeSessionsForSelectedSizeAndType.length > 0 ? (
                        <div className="p-3 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] space-y-2">
                          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#E9D9C5]/60">
                            <span className="font-bold text-[#29221E] flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#D96827]" />
                              Top {activeSessionsForSelectedSizeAndType.length} Returning Soonest (Size #{selectedSize} {selectedType === "QUAD" ? "Quads" : "Inline"}):
                            </span>
                            <span className="text-[10px] text-[#8B8179] font-medium">Est. Wait</span>
                          </div>

                          <div className="space-y-1.5">
                            {activeSessionsForSelectedSizeAndType.map((s, idx) => {
                              const timer = getSessionTimerData(s);
                              const dueTime = format12HourTime(s.expectedEndTime);
                              const displayName =
                                !s.customerName || s.customerName.toLowerCase().includes("walk-in")
                                  ? "Skater"
                                  : s.customerName;

                              return (
                                <div
                                  key={s._id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E9D9C5] text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-[#FFF4E5] text-[#D96827] font-bold text-[10px] flex items-center justify-center border border-[#E9D9C5]">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-mono font-bold text-[#29221E]">{s.shoeId}</span>
                                    <span className="text-[#8B8179] text-[11px] truncate max-w-[120px]">
                                      ({displayName})
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    {timer.isOverdue ? (
                                      <span className="text-[#D94B45] font-bold font-mono text-[11px] flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-[#D94B45] animate-ping" />
                                        Overdue (+{timer.timeFormatted})
                                      </span>
                                    ) : (
                                      <div className="text-right">
                                        <span className="font-mono font-bold text-[#D96827] text-xs">
                                          ~{timer.timeFormatted} left
                                        </span>
                                        <span className="block text-[10px] text-[#8B8179]">
                                          (due {dueTime})
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-[11px] text-[#8B8179] text-center">
                          No active sessions currently on track for Size #{selectedSize} {selectedType === "QUAD" ? "Quads" : "Inline"}.
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      value={selectedShoeId}
                      onChange={(e) => setSelectedShoeId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827] cursor-pointer"
                    >
                      {shoesForSelectedSizeAndType.map((s) => (
                        <option key={s._id} value={s.shoeId}>
                          {s.shoeId} (Size #{s.size} • {s.type === "QUAD" ? "Quads" : "Inline"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 4: Duration & Pricing */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    4. Rental Duration & Timing
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDuration(30)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        duration === 30
                          ? "bg-[#FFF4E5] border-2 border-[#D96827] text-[#29221E] shadow-sm"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:border-[#D96827]/40"
                      }`}
                    >
                      <div className="font-bold text-sm text-[#29221E]">30 Minutes</div>
                      <div className="text-[11px] text-[#D96827] font-bold mt-0.5">
                        {isWeekend ? "200 ETB (Weekend)" : "150 ETB (Weekday)"}
                      </div>
                      <div className="text-[10px] text-[#8B8179] mt-1">
                        +5m buffer = <strong>35m timer</strong>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDuration(60)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        duration === 60
                          ? "bg-[#FFF4E5] border-2 border-[#D96827] text-[#29221E] shadow-sm"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:border-[#D96827]/40"
                      }`}
                    >
                      <div className="font-bold text-sm text-[#29221E]">60 Minutes (1 Hour)</div>
                      <div className="text-[11px] text-[#D96827] font-bold mt-0.5">
                        {isWeekend ? "300 ETB (Weekend)" : "250 ETB (Weekday)"}
                      </div>
                      <div className="text-[10px] text-[#8B8179] mt-1">
                        +5m buffer = <strong>65m timer</strong>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 4: Customer Details */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kidus"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="09..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827] font-mono"
                    />
                  </div>
                </div>

                {/* Step 5: Payment Timing */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    5. Payment Timing
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("UNPAID")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        paymentOption === "UNPAID"
                          ? "bg-[#FFF4E5] border-2 border-[#D96827] text-[#D96827] font-bold"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      Pay After Skating (Open Tab)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("PAID")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        paymentOption === "PAID"
                          ? "bg-[#EBF5F0] border-2 border-[#26845B] text-[#26845B] font-bold"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
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
                          className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            paymentMethod === method
                              ? "bg-[#D96827] text-white shadow-sm"
                              : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !selectedShoeId}
                    className="w-full py-3 px-4 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#D96827]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting
                      ? "Launching..."
                      : `Start Rental (${duration + 5} min countdown)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. SHOE SWAP MODAL */}
        {swapSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-[#D96827]" />
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E]">Swap Skate Shoe</h3>
                </div>
                <button
                  onClick={() => setSwapSession(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSwapSubmit} className="mt-4 space-y-4">
                <p className="text-xs text-[#8B8179] leading-relaxed">
                  Currently assigned to shoe{" "}
                  <strong className="text-[#29221E] font-mono">{swapSession.shoeId}</strong> (Size #
                  {swapSession.shoeSize}). The timer will continue without interruption.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    Select New Available Shoe Asset
                  </label>
                  <select
                    value={swapNewShoeId}
                    onChange={(e) => setSwapNewShoeId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                  >
                    <option value="">-- Choose replacement shoe --</option>
                    {availableShoes
                      .filter((s) => s.status === "AVAILABLE" && s.shoeId !== swapSession.shoeId)
                      .map((s) => (
                        <option key={s._id} value={s.shoeId}>
                          {s.shoeId} (Size #{s.size} • {s.type === "QUAD" ? "Quads" : "Inline"})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSwapSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={swapLoading || !swapNewShoeId}
                    className="px-4 py-2 bg-[#D96827] hover:bg-[#C2571A] text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#26845B]" />
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E]">
                    Return Shoe & Settle Bill
                  </h3>
                </div>
                <button
                  onClick={() => setReturnSession(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReturnSubmit} className="mt-4 space-y-4">
                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-2.5">
                  <div className="flex justify-between text-xs text-[#8B8179]">
                    <span>Shoe Asset:</span>
                    <strong className="text-[#29221E] font-mono">
                      {returnSession.shoeId} (Size #{returnSession.shoeSize})
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-[#8B8179]">
                    <span>Customer:</span>
                    <span className="text-[#29221E] font-medium">{returnSession.customerName}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8B8179]">
                    <span>Skate Duration:</span>
                    <span className="text-[#29221E]">
                      {returnSession.totalMinutes - returnSession.gracePeriodMinutes} mins
                    </span>
                  </div>

                  {/* Cost breakdown */}
                  <div className="pt-2 border-t border-[#E9D9C5] space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[#8B8179]">
                      <span>Skate Rental Fee:</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className={returnSession.paymentStatus === "PAID" ? "line-through text-[#8B8179]" : "font-bold text-[#29221E]"}>
                          {formatETB(returnSession.totalRentalFee)}
                        </span>
                        {returnSession.paymentStatus === "PAID" && (
                          <span className="text-[10px] font-bold text-[#26845B] bg-[#EBF5F0] px-1.5 py-0.5 rounded border border-[#26845B]/30">
                            ✓ PAID ({returnSession.paymentMethod || "PAID"})
                          </span>
                        )}
                      </div>
                    </div>

                    {returnSession.tabTotal && returnSession.tabTotal > 0 ? (
                      <div className="flex justify-between items-center text-[#D96827] font-semibold">
                        <span>Attached Concession Snacks:</span>
                        <span className="font-mono font-bold">+{formatETB(returnSession.tabTotal)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Amount Due to Collect Now */}
                  {(() => {
                    const isSkatePaid = returnSession.paymentStatus === "PAID";
                    const skateDue = isSkatePaid ? 0 : returnSession.totalRentalFee;
                    const snackDue = returnSession.tabTotal || 0;
                    const totalDueNow = skateDue + snackDue;

                    return (
                      <div className="pt-2.5 border-t border-[#E9D9C5]">
                        <div className="flex justify-between items-baseline">
                          <div>
                            <span className="text-sm font-bold text-[#29221E] block">
                              {totalDueNow > 0 ? "Amount Due Now:" : "Settlement Status:"}
                            </span>
                            {isSkatePaid && snackDue > 0 && (
                              <span className="text-[10px] text-[#8B8179]">
                                (Skate already pre-paid, collecting snacks only)
                              </span>
                            )}
                          </div>
                          <span className={`text-xl font-black font-mono ${totalDueNow > 0 ? "text-[#D96827]" : "text-[#26845B]"}`}>
                            {formatETB(totalDueNow)}
                          </span>
                        </div>
                        {totalDueNow === 0 && (
                          <div className="mt-1 text-[11px] text-[#26845B] font-semibold text-right">
                            ✓ All fees cleared. Ready for return.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Payment method selector if balance is owed */}
                {(() => {
                  const isSkatePaid = returnSession.paymentStatus === "PAID";
                  const skateDue = isSkatePaid ? 0 : returnSession.totalRentalFee;
                  const snackDue = returnSession.tabTotal || 0;
                  const totalDueNow = skateDue + snackDue;

                  if (totalDueNow <= 0) return null;

                  return (
                    <div>
                      <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                        Select Settlement Payment Method ({formatETB(totalDueNow)})
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setReturnPaymentMethod(method)}
                            className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                              returnPaymentMethod === method
                                ? "bg-[#D96827] text-white shadow-sm"
                                : "bg-white border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="px-5 py-2.5 bg-[#26845B] hover:bg-[#1f6d4a] text-white font-bold text-xs rounded-xl shadow-md shadow-[#26845B]/20 cursor-pointer"
                  >
                    {returnLoading ? "Processing..." : "Confirm Return & Mark Available"}
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
