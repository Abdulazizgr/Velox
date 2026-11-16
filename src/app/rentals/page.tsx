"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  formatETB,
  format12HourTime,
  triggerVibration,
  formatEthiopiaTime24,
  formatTimeString12,
} from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import { useLanguage } from "@/lib/i18n";
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
  Pencil,
  Ban,
  Loader2,
  Minus,
  ChevronDown,
  Link2,
  UserCheck,
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
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "RETURNED_UNPAID";
  paymentStatus: "PAID" | "UNPAID";
  paymentMethod?: "CASH" | "TELEBIRR" | "CBE";
  hasOwnSkates?: boolean;
  isShoeReturned?: boolean;
  shoeReturnedAt?: string;
  billedToSessionId?: string;
  billedToShoeId?: string;
  billedToCustomerName?: string;
  payingForSessionIds?: string[];
  skateType?: "INLINE" | "QUAD";
  isExtended?: boolean;
  extendedType?: "EXTENDED_SMALL" | "EXTENDED_MEDIUM" | "EXTENDED_LARGE";
  shoeSwaps?: ShoeSwapLog[];
  extensions?: Array<{
    addedMinutes: number;
    additionalFee: number;
    paymentStatus?: "PAID" | "UNPAID";
    paymentMethod?: "CASH" | "TELEBIRR" | "CBE";
    requestedAt: string;
  }>;
  tabTotal?: number;
  tabItemsCount?: number;
}

interface ShoeOption {
  _id: string;
  shoeId: string;
  size: number;
  type?: "INLINE" | "QUAD";
  status: string;
  isExtended?: boolean;
  extendedType?: "EXTENDED_SMALL" | "EXTENDED_MEDIUM" | "EXTENDED_LARGE";
  coveredSizes?: number[];
}

export default function RentalBoardPage() {
  const { showAlert, showConfirm } = useAlertModal();
  const { t, lang } = useLanguage();
  const [sessions, setSessions] = useState<RentalSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "OVERDUE" | "UNPAID_RETURNS" | "COMPLETED">("ACTIVE");
  const [sortBy, setSortBy] = useState<"EARLIEST_END" | "SHOE_ID" | "SIZE">("EARLIEST_END");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio trigger ref to prevent repeating sound every second
  const playedAlertsRef = useRef<Set<string>>(new Set());
  // 30-second recurring alert timestamp ref for overdue sessions
  const lastOverdueReminderRef = useRef<number>(0);

  // New Rental Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [availableShoes, setAvailableShoes] = useState<ShoeOption[]>([]);
  const [selectedSize, setSelectedSize] = useState<number | "ALL">("ALL");
  const [selectedType, setSelectedType] = useState<"INLINE" | "QUAD">("QUAD");
  const [selectedShoeId, setSelectedShoeId] = useState<string>("");
  const [hasOwnSkates, setHasOwnSkates] = useState(false);
  const [shoeDropdownOpen, setShoeDropdownOpen] = useState(false);
  const [shoeSearchQuery, setShoeSearchQuery] = useState("");
  const [duration, setDuration] = useState<30 | 60>(30);
  const [customStartTime, setCustomStartTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState<"UNPAID" | "PAID">("UNPAID");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [loggingDemand, setLoggingDemand] = useState(false);
  const [loggedDemandSize, setLoggedDemandSize] = useState<number | "ALL" | null>(null);

  // Swap Modal State
  const [swapSession, setSwapSession] = useState<RentalSessionItem | null>(null);
  const [swapNewShoeId, setSwapNewShoeId] = useState("");
  const [swapReason, setSwapReason] = useState("Customer uncomfortable / fit adjustment");
  const [swapLoading, setSwapLoading] = useState(false);

  // Return & Settle Modal State
  const [returnSession, setReturnSession] = useState<RentalSessionItem | null>(null);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [returnCustomAmount, setReturnCustomAmount] = useState<string>("");
  const [returnLoading, setReturnLoading] = useState(false);

  // Link Payer Modal State (Requirement #5)
  const [linkPayerSession, setLinkPayerSession] = useState<RentalSessionItem | null>(null);
  const [targetPayerId, setTargetPayerId] = useState<string>("");
  const [linkPayerLoading, setLinkPayerLoading] = useState(false);

  // Cancel Rental Modal State
  const [cancelSession, setCancelSession] = useState<RentalSessionItem | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Edit Rental Session Modal State
  const [editSession, setEditSession] = useState<RentalSessionItem | null>(null);
  const [editDuration, setEditDuration] = useState<30 | 60>(30);
  const [editPaymentStatus, setEditPaymentStatus] = useState<"PAID" | "UNPAID">("UNPAID");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Time Adjust & Extend Modal State
  const [timeAdjustSession, setTimeAdjustSession] = useState<RentalSessionItem | null>(null);
  const [adjustMinutes, setAdjustMinutes] = useState<number>(30);
  const [adjustCustomFee, setAdjustCustomFee] = useState<string>("");
  const [adjustPaymentOption, setAdjustPaymentOption] = useState<"PAID" | "UNPAID">("PAID");
  const [adjustPaymentMethod, setAdjustPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Web Audio synthesizer chime and vibration for alerts
  const playAudioCue = (type: "start" | "due" | "overdue" | "chime") => {
    // If sound is muted, neither audio nor vibration should trigger
    if (!soundEnabled) {
      triggerVibration(0);
      return;
    }

    // Mobile haptic vibration alerts (supported on Android/Chrome/PWA)
    if (type === "overdue") {
      triggerVibration([300, 100, 300, 100, 500]);
    } else if (type === "due") {
      triggerVibration([200, 100, 200]);
    }
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
      const res = await fetch("/api/rentals?status=ALL&todayOnly=true");
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

  const handleCancelConfirm = async () => {
    if (!cancelSession) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/rentals/${cancelSession._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voidAttachedTab: true }),
      });
      if (res.ok) {
        showAlert({
          title: t("common.success", "Success"),
          message: `${cancelSession.shoeId} cancelled and released to Available`,
          type: "success",
        });
        setCancelSession(null);
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || "Failed to cancel rental",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: "Network error",
        type: "error",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const openEditModal = (session: RentalSessionItem) => {
    setEditSession(session);
    setEditDuration((session.baseDurationMinutes === 60 ? 60 : 30) as 30 | 60);
    setEditPaymentStatus(session.paymentStatus || "UNPAID");
    setEditPaymentMethod(session.paymentMethod || "CASH");
    setEditCustomerName(session.customerName || "");
    setEditCustomerPhone(session.customerPhone || "");
    setEditStartTime(formatEthiopiaTime24(session.startedAt));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSession) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/rentals/${editSession._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: editDuration,
          paymentStatus: editPaymentStatus,
          paymentMethod: editPaymentMethod,
          customerName: editCustomerName,
          customerPhone: editCustomerPhone,
          startTime: editStartTime.trim() || undefined,
        }),
      });
      if (res.ok) {
        showAlert({
          title: t("common.success", "Success"),
          message: `Rental for ${editSession.shoeId} updated`,
          type: "success",
        });
        setEditSession(null);
        fetchRentals();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || "Failed to update rental",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: "Network error",
        type: "error",
      });
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
    fetchAvailableShoes();
  }, []);

  // Check available skate types (Inline vs Quads) for the currently selected size (or ALL sizes)
  const availableTypesForSelectedSize = useMemo(() => {
    const shoesForSize =
      selectedSize === "ALL"
        ? availableShoes
        : availableShoes.filter(
            (s) => s.size === selectedSize || Boolean(s.isExtended && s.coveredSizes?.includes(selectedSize))
          );
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

  // If a size number only has one type or only one available type, auto-switch to it; otherwise prefer QUAD default
  useEffect(() => {
    if (availableTypesForSelectedSize.onlyInline) {
      setSelectedType("INLINE");
    } else if (availableTypesForSelectedSize.onlyQuad) {
      setSelectedType("QUAD");
    } else if (availableTypesForSelectedSize.quadAvail > 0) {
      setSelectedType("QUAD");
    } else if (availableTypesForSelectedSize.inlineAvail > 0 && availableTypesForSelectedSize.quadAvail === 0) {
      setSelectedType("INLINE");
    }
  }, [
    selectedSize,
    availableTypesForSelectedSize.onlyQuad,
    availableTypesForSelectedSize.onlyInline,
    availableTypesForSelectedSize.inlineAvail,
    availableTypesForSelectedSize.quadAvail,
  ]);

  // Filter available shoes by selected size (or ALL) AND selected skate type
  const shoesForSelectedSizeAndType = useMemo(() => {
    return availableShoes.filter(
      (s) =>
        (selectedSize === "ALL" || s.size === selectedSize || Boolean(s.isExtended && s.coveredSizes?.includes(selectedSize))) &&
        (s.type || "INLINE") === selectedType &&
        s.status === "AVAILABLE"
    );
  }, [availableShoes, selectedSize, selectedType]);

  // Top 3 active rented shoes for selected size AND selected type returning earliest
  const activeSessionsForSelectedSizeAndType = useMemo(() => {
    if (selectedSize === "ALL") return [];
    return sessions
      .filter((s) => {
        const shoeObj = availableShoes.find((sh) => sh.shoeId === s.shoeId);
        const sessionType = shoeObj?.type || s.skateType || "INLINE";
        const matchesSize =
          s.shoeSize === selectedSize ||
          Boolean(shoeObj?.isExtended && shoeObj.coveredSizes?.includes(selectedSize));
        return (
          s.status === "ACTIVE" &&
          matchesSize &&
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
  const standardBasePrice = duration === 30 ? (isWeekend ? 200 : 150) : (isWeekend ? 300 : 250);
  const calculatedPrice = hasOwnSkates
    ? Math.max(0, standardBasePrice - (duration === 30 ? 50 : 100))
    : standardBasePrice;

  // Handle Log Missed Demand when size is out of stock (for owner's bottleneck report)
  const handleLogMissedDemand = async () => {
    setLoggingDemand(true);
    try {
      const res = await fetch("/api/rentals/demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shoeSize: selectedSize, skateType: selectedType }),
      });
      if (res.ok) {
        const json = await res.json();
        setLoggedDemandSize(selectedSize);
        showAlert({
          title: "Customer Demand Logged",
          message: `Recorded 1 customer request for Size #${selectedSize}. Total out-of-stock requests recorded: ${json.totalForSize}. This helps the owner decide which sizes to buy next.`,
          type: "success",
        });
      } else {
        showAlert({
          title: "Logging Failed",
          message: "Could not log customer demand.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Network Error",
        message: "Failed to record customer request.",
        type: "error",
      });
    } finally {
      setLoggingDemand(false);
    }
  };

  // Handle Start Rental
  const handleStartRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasOwnSkates && !selectedShoeId) {
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
          shoeId: hasOwnSkates ? "OWN-SKATES" : selectedShoeId,
          durationMinutes: duration,
          customerName: customerName.trim() || "Skater",
          customerPhone: customerPhone.trim(),
          paymentStatus: paymentOption,
          paymentMethod: paymentOption === "PAID" ? paymentMethod : undefined,
          startTime: customStartTime.trim() || undefined,
          hasOwnSkates,
        }),
      });

      if (res.ok) {
        playAudioCue("start");
        setShowNewModal(false);
        setCustomStartTime("");
        setCustomerName("");
        setCustomerPhone("");
        setHasOwnSkates(false);
        setSelectedSize("ALL");
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

  // Time Adjustment & Extension Handlers
  const openTimeAdjustModal = (session: RentalSessionItem, initialDelta: number = 30) => {
    setTimeAdjustSession(session);
    setAdjustMinutes(initialDelta);
    setAdjustCustomFee("");
    setAdjustPaymentOption(session.paymentStatus === "PAID" ? "PAID" : "UNPAID");
    setAdjustPaymentMethod(session.paymentMethod || "CASH");
  };

  const calculateAdjustFee = (session: RentalSessionItem | null, deltaMinutes: number) => {
    if (!session || deltaMinutes === 0) return 0;
    const isWeekend = session.pricingType === "WEEKEND";
    const absMin = Math.abs(deltaMinutes);
    let fee = 0;
    if (absMin === 30) {
      fee = isWeekend ? 200 : 150;
    } else if (absMin === 60) {
      fee = isWeekend ? 300 : 250;
    } else if (absMin === 15) {
      fee = isWeekend ? 100 : 75;
    } else {
      const base30 = isWeekend ? 200 : 150;
      fee = Math.round((absMin / 30) * base30);
    }
    return deltaMinutes < 0 ? -fee : fee;
  };

  const calculateAdjustedEndTime = (session: RentalSessionItem | null, deltaMinutes: number) => {
    if (!session) return new Date();
    const currentEndMs = new Date(session.expectedEndTime).getTime();
    const nowMs = Date.now();
    if (deltaMinutes > 0) {
      // If overdue, start fresh from now so overdue time is not deducted!
      if (nowMs > currentEndMs) {
        return new Date(nowMs + deltaMinutes * 60 * 1000);
      }
      return new Date(currentEndMs + deltaMinutes * 60 * 1000);
    } else {
      const startMs = new Date(session.startedAt).getTime();
      const minEndMs = startMs + 15 * 60 * 1000;
      const targetEndMs = currentEndMs + deltaMinutes * 60 * 1000;
      return new Date(Math.max(minEndMs, targetEndMs));
    }
  };

  const handleTimeAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeAdjustSession || adjustMinutes === 0) return;
    setAdjustSubmitting(true);
    try {
      const res = await fetch(`/api/rentals/${timeAdjustSession._id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addedMinutes: adjustMinutes,
          paymentStatus: adjustMinutes > 0 ? adjustPaymentOption : "PAID",
          paymentMethod: adjustPaymentMethod,
          customFee: adjustCustomFee ? Number(adjustCustomFee) : undefined,
        }),
      });

      if (res.ok) {
        playAudioCue("chime");
        const data = await res.json();
        showAlert({
          title: t("common.success", "Success"),
          message: data.message || "Rental time updated successfully.",
          type: "success",
        });
        setTimeAdjustSession(null);
        setAdjustCustomFee("");
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: data.error || "Failed to adjust rental time.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Network Error",
        message: "Failed to communicate with the server. Please check connection.",
        type: "error",
      });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleExtend = (session: RentalSessionItem, addedMinutes: number) => {
    openTimeAdjustModal(session, addedMinutes);
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
  const handleReturnSubmit = async (e: React.FormEvent, unpaidInHouse: boolean = false) => {
    e.preventDefault();
    if (!returnSession) return;

    setReturnLoading(true);
    try {
      const res = await fetch(`/api/rentals/${returnSession._id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: returnPaymentMethod,
          unpaidInHouse,
          customSettledAmount: returnCustomAmount ? Number(returnCustomAmount) : undefined,
        }),
      });

      if (res.ok) {
        playAudioCue("chime");
        setReturnSession(null);
        setReturnCustomAmount("");
        fetchRentals();
        fetchAvailableShoes();
      } else {
        const data = await res.json();
        showAlert({
          title: "Return Failed",
          message: data.error || "Failed to process return",
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

  // Handle Link Payer (Requirement #5)
  const handleLinkPayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPayerSession || !targetPayerId) return;

    setLinkPayerLoading(true);
    try {
      const res = await fetch(`/api/rentals/${linkPayerSession._id}/link-payer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payerSessionId: targetPayerId }),
      });

      if (res.ok) {
        playAudioCue("chime");
        setLinkPayerSession(null);
        setTargetPayerId("");
        fetchRentals();
      } else {
        const data = await res.json();
        showAlert({
          title: "Failed to Link Skater",
          message: data.error || "Could not link bill.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Network Error",
        message: "Failed to communicate with server.",
        type: "error",
      });
    } finally {
      setLinkPayerLoading(false);
    }
  };

  const handleUnlinkPayer = async (session: RentalSessionItem) => {
    try {
      const res = await fetch(`/api/rentals/${session._id}/link-payer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNLINK" }),
      });
      if (res.ok) {
        playAudioCue("chime");
        setLinkPayerSession(null);
        fetchRentals();
      }
    } catch (e) {
      console.error(e);
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
        if (statusTab === "UNPAID_RETURNS") {
          return s.status === "RETURNED_UNPAID" || (s.isShoeReturned && s.paymentStatus === "UNPAID");
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
  const unpaidReturnsCount = sessions.filter(
    (s) => s.status === "RETURNED_UNPAID" || (s.isShoeReturned && s.paymentStatus === "UNPAID")
  ).length;
  const completedTodayCount = sessions.filter((s) => s.status === "COMPLETED").length;

  const distinctSizes = useMemo(() => {
    const sizeSet = new Set<number>();
    availableShoes.forEach((s) => {
      if (s.size) sizeSet.add(s.size);
      if (s.isExtended && Array.isArray(s.coveredSizes)) {
        s.coveredSizes.forEach((cs) => sizeSet.add(cs));
      }
    });
    return Array.from(sizeSet).sort((a, b) => a - b);
  }, [availableShoes]);

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        {/* Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="h-6 w-6 text-[#D96827]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                {t("rentals.title", "Rentals")}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-[#8B8179]">
              {t("rentals.subtitle", "Active skate timers and return settlements")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Rental History link for past records */}
            <Link
              href="/rentals/history"
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#29221E] hover:text-[#D96827] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#FFF4E5] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <History className="h-4 w-4 text-[#D96827]" />
              <span className="hidden sm:inline">{t("rentals.historyButton", "Rental History")}</span>
            </Link>

            {/* Audio Toggle & Sound Test */}
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) {
                  playAudioCue("chime");
                } else {
                  triggerVibration(0); // Immediately cancel any active vibration when muted
                }
              }}
              title={soundEnabled ? t("rentals.soundOn", "Sound ON") : t("rentals.muted", "Muted")}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                soundEnabled
                  ? "bg-[#FFF4E5] border-[#E9D9C5] text-[#D96827] hover:bg-[#FCEAD2]"
                  : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-[11px] hidden sm:inline font-semibold">
                {soundEnabled ? t("rentals.soundOn", "Sound ON") : t("rentals.muted", "Muted")}
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
              <span className="hidden sm:inline">{t("common.refresh", "Refresh")}</span>
            </button>

            <button
              onClick={() => {
                setSelectedType("QUAD");
                setCustomStartTime("");
                setShowNewModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t("rentals.issueSkates", "+ Issue Skates")}</span>
            </button>
          </div>
        </div>

        {/* Status Highlight Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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
                {t("rentals.activeTab", "Active")}
              </span>
              <span className="p-1 rounded-lg bg-[#FFE7D1] text-[#D96827]">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#29221E]">{activeCount}</span>
              {dueSoonCount > 0 && (
                <span className="text-[11px] text-[#D96827] font-bold">
                  ({dueSoonCount} {t("rentals.dueIn", "due")})
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
                {t("rentals.overdueTab", "Overdue")}
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
            onClick={() => setStatusTab("UNPAID_RETURNS")}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
              statusTab === "UNPAID_RETURNS"
                ? "bg-gradient-to-br from-[#FFF9E6] to-[#FFF0C2] border-2 border-[#D99B26] shadow-md shadow-[#D99B26]/15 ring-2 ring-[#D99B26]/20"
                : "bg-[#FFFDF7] border border-[#F0E4B8] hover:border-[#D99B26] hover:bg-[#FFF9E6]/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[#9C6D14]">
                {t("rentals.unpaidReturnsTab", "Unpaid Returns")}
              </span>
              <span className="p-1 rounded-lg bg-[#FFF2B8] text-[#9C6D14]">
                <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#9C6D14]">{unpaidReturnsCount}</span>
              {unpaidReturnsCount > 0 && (
                <span className="text-[10px] text-[#9C6D14] font-bold">
                  (in house)
                </span>
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
                {t("rentals.returnedTab", "Returned")}
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
              placeholder={t("rentals.searchPlaceholder", "Search shoe tag, name...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs sm:text-sm text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827] font-mono"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#8B8179]">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#D96827]" />
              <span className="font-semibold text-[#29221E]">{t("common.filter", "Filter")}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "EARLIEST_END" | "SHOE_ID" | "SIZE")}
                className="bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl px-2.5 py-1.5 text-[#29221E] font-medium text-xs focus:outline-none cursor-pointer"
              >
                <option value="EARLIEST_END">{t("rentals.sortByEarly", "Ending Soonest")}</option>
                <option value="SHOE_ID">{t("rentals.sortByShoeId", "Shoe Tag")}</option>
                <option value="SIZE">{t("rentals.sortBySize", "Shoe Size")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Timer Grid */}
        {filteredSessions.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-2xl bg-white border border-[#E9D9C5] text-[#8B8179] shadow-sm">
            <Timer className="h-12 w-12 mx-auto mb-3 opacity-30 text-[#D96827]" />
            <p className="text-base font-bold text-[#29221E]">
              {statusTab === "ACTIVE"
                ? t("rentals.noActiveSessions", "No active skaters currently on the floor")
                : statusTab === "OVERDUE"
                ? t("rentals.noOverdueSessions", "Great! No skaters are currently overdue")
                : t("rentals.noReturnedSessions", "No completed rental sessions yet today")}
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
                          {session.hasOwnSkates ? (
                            <span className="font-mono text-xs sm:text-sm font-black text-[#D96827] bg-[#FFF4E5] px-2 py-0.5 rounded-lg border border-[#D96827]/30 flex items-center gap-1">
                              🛼 {t("rentals.ownSkates", "Own Skates")}
                            </span>
                          ) : (
                            <>
                              <span className="font-mono text-xl sm:text-2xl font-black text-[#29221E] tracking-tight">
                                {session.shoeId}
                              </span>
                              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                                {t("common.size", "Size")} #{session.shoeSize}
                              </span>
                              {session.isExtended && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#FFF4E5] text-[#D96827] border border-[#D96827]/30 whitespace-nowrap">
                                  {session.extendedType === "EXTENDED_SMALL" ? "EXT-S" : session.extendedType === "EXTENDED_LARGE" ? "EXT-L" : "EXT-M"}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  (session.skateType || "INLINE") === "QUAD"
                                    ? "bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]"
                                    : "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]"
                                }`}
                              >
                                {(session.skateType || "INLINE") === "QUAD" ? t("common.quads", "Quads") : t("common.inline", "Inline")}
                              </span>
                            </>
                          )}
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

                        {/* Linked Payer or Paying For Badges (Requirement #5) */}
                        {session.billedToShoeId && (
                          <div
                            className={`mt-1 flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg border ${
                              session.paymentStatus === "PAID"
                                ? "text-[#26845B] bg-[#EBF5F0] border-[#26845B]/30 font-semibold"
                                : "text-[#0369A1] bg-[#E0F2FE] border-[#BAE6FD]"
                            }`}
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span>
                              {session.paymentStatus === "PAID"
                                ? `${t("rentals.paidBy", "Paid by")}: `
                                : `${t("rentals.billedTo", "Billed to")}: `}
                              <strong>#{session.billedToShoeId}</strong> ({session.billedToCustomerName || "Skater"})
                            </span>
                            {isActive && session.paymentStatus !== "PAID" && (
                              <button
                                type="button"
                                onClick={() => handleUnlinkPayer(session)}
                                className="ml-1 text-[10px] text-[#0369A1] hover:text-[#D94B45] font-bold cursor-pointer"
                                title="Unlink payer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                        {session.payingForSessionIds && session.payingForSessionIds.length > 0 && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#26845B] bg-[#EBF5F0] px-2 py-0.5 rounded-lg border border-[#26845B]/30 font-semibold">
                            <UserCheck className="h-3 w-3 shrink-0" />
                            <span>
                              {t("rentals.payingFor", "Paying for")}: {session.payingForSessionIds.length} {t("common.skaters", "skater(s)")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Tag & Card Actions */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {!isActive ? (
                          session.status === "RETURNED_UNPAID" ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FFF9E6] text-[#9C6D14] border border-[#D99B26]/40">
                              {t("rentals.unpaidReturnsTab", "Unpaid Return")}
                            </span>
                          ) : session.status === "CANCELLED" ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FDF0EF] text-[#D94B45] border border-[#D94B45]/30">
                              {t("rentals.cancelledBadge", "CANCELLED")}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]">
                              {t("rentals.returnedTab", "Returned")}
                            </span>
                          )
                        ) : (
                          <>
                            {timer.isOverdue ? (
                              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#D94B45] text-white animate-pulse">
                                {t("rentals.overdueTab", "OVERDUE")} +{timer.minutes}m
                              </span>
                            ) : timer.isDueSoon ? (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#D96827]/40">
                                {t("rentals.dueIn", "Due")} ({timer.minutes}m)
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/40">
                                {t("rentals.activeTab", "Active")}
                              </span>
                            )}

                            {/* Link Payer button */}
                            <button
                              type="button"
                              onClick={() => {
                                setLinkPayerSession(session);
                                setTargetPayerId(session.billedToSessionId || "");
                              }}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                session.billedToSessionId
                                  ? "text-[#0369A1] bg-[#E0F2FE] border-[#BAE6FD]"
                                  : "text-[#8B8179] hover:text-[#0369A1] hover:bg-[#E0F2FE] border-[#E9D9C5]"
                              }`}
                              title={t("rentals.linkPayer", "Bill to Another Skater")}
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Edit session */}
                            <button
                              type="button"
                              onClick={() => openEditModal(session)}
                              className="p-1.5 rounded-lg text-[#8B8179] hover:text-[#D96827] hover:bg-[#FFF4E5] transition-colors cursor-pointer border border-[#E9D9C5]"
                              title={t("rentals.editSession", "Edit Session")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Cancel rental */}
                            <button
                              type="button"
                              onClick={() => setCancelSession(session)}
                              className="p-1.5 rounded-lg text-[#8B8179] hover:text-[#D94B45] hover:bg-[#FDF0EF] transition-colors cursor-pointer border border-[#E9D9C5]"
                              title={t("rentals.cancelRental", "Cancel Rental")}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Countdown Digits */}
                    {isActive ? (
                      <div className="py-3 my-2 text-center rounded-xl bg-[#F7F6F3] border border-[#E9D9C5]">
                        <div className="text-[10px] text-[#8B8179] uppercase tracking-widest font-semibold mb-0.5">
                          {timer.isOverdue ? t("rentals.overdueBy", "Overdue by") : t("rentals.left", "Time Remaining")}
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
                            {t("common.time", "Time")}: {format12HourTime(session.startedAt)}
                          </span>
                          <span>•</span>
                          <span className="text-[#29221E] font-bold">
                            {t("rentals.dueIn", "Due")}: {format12HourTime(session.expectedEndTime)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 my-2 text-center rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs text-[#8B8179]">
                        {t("rentals.returnedTab", "Returned")} {session.actualReturnTime ? format12HourTime(session.actualReturnTime) : ""}
                      </div>
                    )}

                    {/* Financial summary & Snack Tabs */}
                    <div className="mt-2.5 pt-2.5 border-t border-[#E9D9C5] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#8B8179]">{t("rentals.rentalCharge", "Rental Fee")}: </span>
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
                            {t("rentals.paidBadge", "PAID")} ({session.paymentMethod || "CASH"})
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                            {t("rentals.unpaidBadge", "UNPAID")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attached Snack Concession Tab if any */}
                    {session.tabTotal && session.tabTotal > 0 ? (
                      <div className="mt-2 text-[11px] text-[#29221E] bg-[#FFF4E5] p-2 rounded-xl border border-[#E9D9C5] flex items-center justify-between">
                        <span>🍿 {t("rentals.tabBadge", "Snacks Tab")} ({session.tabItemsCount || 0} {t("common.units", "items")})</span>
                        <strong className="font-mono font-bold text-[#D96827]">+{formatETB(session.tabTotal)}</strong>
                      </div>
                    ) : null}

                    {/* Swap notice */}
                    {session.shoeSwaps && session.shoeSwaps.length > 0 && (
                      <div className="mt-2 text-[10px] text-[#8B8179] bg-[#F7F6F3] p-1.5 rounded-lg border border-[#E9D9C5] truncate">
                        🔄 {t("rentals.swapped", "Swapped")} {session.shoeSwaps[0].oldShoeId} &rarr; {session.shoeSwaps[0].newShoeId}
                      </div>
                    )}
                  </div>

                  {/* Bottom Operational Action Buttons */}
                  {isActive && (
                    <div className="mt-3.5 pt-3 border-t border-[#E9D9C5] grid grid-cols-4 gap-1.5 sm:gap-2">
                      {!session.hasOwnSkates ? (
                        <button
                          onClick={() => {
                            setSwapSession(session);
                            setSwapNewShoeId("");
                          }}
                          className="py-2 px-1 rounded-xl bg-[#F7F6F3] hover:bg-[#E9D9C5]/40 border border-[#E9D9C5] text-[11px] sm:text-xs font-semibold text-[#29221E] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title={t("rentals.swapShoe", "Change Shoe")}
                        >
                          <Repeat className="h-3.5 w-3.5 text-[#D96827]" />
                          <span>{t("rentals.swapShoe", "Swap")}</span>
                        </button>
                      ) : (
                        <div className="py-2 px-1 rounded-xl bg-[#F7F6F3] text-[10px] text-[#8B8179] font-medium flex items-center justify-center border border-[#E9D9C5] opacity-60">
                          <span>Own Skates</span>
                        </div>
                      )}

                      <button
                        onClick={() => openTimeAdjustModal(session, -30)}
                        className="py-2 px-1 rounded-xl bg-[#FFF0E6] hover:bg-[#FCD8C2] border border-[#E9D9C5] text-[11px] sm:text-xs font-bold text-[#C2571A] transition-colors flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer"
                        title={t("rentals.decrease30", "-30m")}
                      >
                        <Minus className="h-3 w-3 text-[#C2571A]" />
                        <span>{t("rentals.decrease30", "-30m")}</span>
                      </button>

                      <button
                        onClick={() => openTimeAdjustModal(session, 30)}
                        className="py-2 px-1 rounded-xl bg-[#FFF4E5] hover:bg-[#FCEAD2] border border-[#E9D9C5] text-[11px] sm:text-xs font-bold text-[#D96827] transition-colors flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer"
                        title={t("rentals.extend30", "+30m")}
                      >
                        <Plus className="h-3 w-3 text-[#D96827]" />
                        <span>{t("rentals.extend30", "+30m")}</span>
                      </button>

                      <button
                        onClick={() => {
                          setReturnSession(session);
                          setReturnPaymentMethod(session.paymentMethod || "CASH");
                          setReturnCustomAmount(session.totalRentalFee ? String(session.totalRentalFee) : "");
                        }}
                        className="py-2 px-1 rounded-xl bg-[#D96827] hover:bg-[#C2571A] text-[11px] sm:text-xs font-bold text-white transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        title={t("rentals.returnSettle", "Return & Settle")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{t("rentals.returnSettle", "Return")}</span>
                      </button>
                    </div>
                  )}

                  {/* Settle button for Returned Unpaid sessions (Requirement #4) */}
                  {session.status === "RETURNED_UNPAID" && (
                    <div className="mt-3.5 pt-3 border-t border-[#E9D9C5] flex items-center justify-between gap-2">
                      <div className="text-xs text-[#9C6D14] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-[#D99B26]" />
                        <span>Shoe returned • In house</span>
                      </div>
                      <button
                        onClick={() => {
                          setReturnSession(session);
                          setReturnPaymentMethod(session.paymentMethod || "CASH");
                          setReturnCustomAmount(session.totalRentalFee ? String(session.totalRentalFee) : "");
                        }}
                        className="py-2 px-3 rounded-xl bg-[#D99B26] hover:bg-[#B8801C] text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Check className="h-4 w-4" />
                        <span>{t("rentals.settlePayment", "Settle Payment")}</span>
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
                      {t("rentals.startRentalModalTitle", "Start Skate Rental")}
                    </h3>
                    <p className="text-xs text-[#8B8179]">
                      {t("rentals.startRentalModalSub", "Choose shoes, duration, and customer details")}
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
                {/* Own Skates Option (Requirement #6) */}
                <div className="p-3 rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#29221E] flex items-center gap-1.5">
                      <span>🛼 {t("rentals.ownSkates", "Own Skates (Floor Access Only)")}</span>
                    </div>
                    <div className="text-[10px] text-[#8B8179]">
                      {t("rentals.ownSkatesDesc", "Customer has their own shoes (-50 ETB for 30m, -100 ETB for 1h)")}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasOwnSkates}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasOwnSkates(checked);
                        if (checked) {
                          setSelectedShoeId("OWN-SKATES");
                        } else {
                          setSelectedShoeId("");
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E9D9C5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D96827]"></div>
                  </label>
                </div>

                {!hasOwnSkates ? (
                  <>
                    {/* Step 1: Select Shoe Size */}
                    <div>
                      <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                        {t("rentals.selectSize", "1. Select Shoe Size")}
                      </label>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                        {/* [ ALL ] card (Requirement #2) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSize("ALL");
                            setSelectedShoeId("");
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center min-w-[56px] shrink-0 ${
                            selectedSize === "ALL"
                              ? "bg-[#D96827] text-white shadow-md shadow-[#D96827]/25 scale-105"
                              : "bg-[#F7F6F3] text-[#29221E] border border-[#E9D9C5] hover:border-[#D96827]"
                          }`}
                        >
                          <span className="text-sm">{t("rentals.allSizes", "All")}</span>
                          <span className="text-[10px] font-normal opacity-80">
                            {availableShoes.filter((s) => s.status === "AVAILABLE").length} {t("rentals.left", "left")}
                          </span>
                        </button>

                        {distinctSizes.map((size) => {
                          const avail = availableShoes.filter(
                            (s) =>
                              (s.size === size || Boolean(s.isExtended && s.coveredSizes?.includes(size))) &&
                              s.status === "AVAILABLE"
                          ).length;
                          const hasExtended = availableShoes.some(
                            (s) => s.isExtended && s.coveredSizes?.includes(size) && s.status === "AVAILABLE"
                          );
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setSelectedSize(size);
                                setSelectedShoeId("");
                              }}
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
                                {avail > 0 ? `${avail} ${t("rentals.left", "left")}` : `0 ${t("rentals.left", "left")}`}
                              </span>
                              {hasExtended && (
                                <span className="text-[8px] px-1 bg-[#D96827]/20 text-[#D96827] rounded font-bold uppercase mt-0.5">
                                  Ext
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Skate Type (Inline Skates vs Quads) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider">
                          {t("rentals.selectType", "2. Skate Type")} {selectedSize === "ALL" ? "(All Sizes)" : `(#${selectedSize})`}
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Quads Button (Default) */}
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
                              <div className="text-xs font-bold leading-tight">{t("common.quads", "Quads")}</div>
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  selectedType === "QUAD" ? "text-white/80" : "text-[#8B8179]"
                                }`}
                              >
                                {availableTypesForSelectedSize.hasQuad
                                  ? `${availableTypesForSelectedSize.quadAvail} ${t("common.available", "available")}`
                                  : "0"}
                              </div>
                            </div>
                          </div>
                          {selectedType === "QUAD" && (
                            <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                          )}
                        </button>

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
                              <div className="text-xs font-bold leading-tight">{t("common.inlineSkates", "Inline Skates")}</div>
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  selectedType === "INLINE" ? "text-white/80" : "text-[#8B8179]"
                                }`}
                              >
                                {availableTypesForSelectedSize.hasInline
                                  ? `${availableTypesForSelectedSize.inlineAvail} ${t("common.available", "available")}`
                                  : "0"}
                              </div>
                            </div>
                          </div>
                          {selectedType === "INLINE" && (
                            <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Step 3: Specific Shoe ID Asset (Custom Dropdown) */}
                    <div>
                      <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                        {t("rentals.chooseAsset", "3. Choose Shoe Tag")}
                      </label>
                      {shoesForSelectedSizeAndType.length === 0 ? (
                        <div className="space-y-2.5">
                          <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#D94B45]/30 text-[#D94B45] text-xs flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[#D94B45] mt-0.5" />
                            <div>
                              <strong className="block font-bold">
                                {t("rentals.outOfStockAlert", "No skates of this size are currently available")}
                              </strong>
                              <span className="text-[11px] text-[#D94B45]/90">
                                {t("rentals.noShoesAvailable", "Customer will need to wait for one to be returned.")}
                              </span>
                            </div>
                          </div>

                          {/* Log Missed Demand Button (Owner Bottleneck Report) */}
                          <button
                            type="button"
                            disabled={loggingDemand}
                            onClick={handleLogMissedDemand}
                            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#FDF0EF] border-2 border-[#D94B45] text-[#D94B45] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-[#D94B45]" />
                            <span>
                              {loggedDemandSize === selectedSize
                                ? t("rentals.loggedSuccess", "✓ Logged! Customer Request Recorded")
                                : t("rentals.logTurnaway", "+ Log 1 Turned Away Customer (Out of Stock)")}
                            </span>
                          </button>

                          {/* Helpful tip if alternate type is available */}
                          {selectedType === "INLINE" && availableTypesForSelectedSize.quadAvail > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedType("QUAD")}
                              className="w-full p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-[#D96827] text-xs flex items-center justify-between cursor-pointer hover:bg-[#FFE8CC] transition-colors"
                            >
                              <span className="font-semibold text-left">
                                💡 {t("rentals.quadsAvailable", "Quads are available for Size")} #{selectedSize} ({availableTypesForSelectedSize.quadAvail} {t("rentals.left", "left")})
                              </span>
                              <span className="text-[11px] font-bold underline shrink-0">{t("rentals.switchToQuads", "Switch to Quads")} &rarr;</span>
                            </button>
                          )}

                          {selectedType === "QUAD" && availableTypesForSelectedSize.inlineAvail > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedType("INLINE")}
                              className="w-full p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-[#D96827] text-xs flex items-center justify-between cursor-pointer hover:bg-[#FFE8CC] transition-colors"
                            >
                              <span className="font-semibold text-left">
                                💡 {t("rentals.inlineAvailable", "Inline skates are available for Size")} #{selectedSize} ({availableTypesForSelectedSize.inlineAvail} {t("rentals.left", "left")})
                              </span>
                              <span className="text-[11px] font-bold underline shrink-0">{t("rentals.switchToInline", "Switch to Inline")} &rarr;</span>
                            </button>
                          )}

                          {activeSessionsForSelectedSizeAndType.length > 0 ? (
                            <div className="p-3 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] space-y-2">
                              <div className="flex items-center justify-between text-xs pb-1 border-b border-[#E9D9C5]/60">
                                <span className="font-bold text-[#29221E] flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-[#D96827]" />
                                  {t("rentals.returningSoonest", "Returning Soonest")} (#{selectedSize}):
                                </span>
                                <span className="text-[10px] text-[#8B8179] font-medium">{t("rentals.estWait", "Est. Wait")}</span>
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
                                            {t("rentals.overdueTab", "Overdue")} (+{timer.timeFormatted})
                                          </span>
                                        ) : (
                                          <div className="text-right">
                                            <span className="font-mono font-bold text-[#D96827] text-xs">
                                              ~{timer.timeFormatted} {t("rentals.left", "left")}
                                            </span>
                                            <span className="block text-[10px] text-[#8B8179]">
                                              ({t("rentals.dueIn", "due")} {dueTime})
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Custom Dropdown Trigger */}
                          <button
                            type="button"
                            onClick={() => setShoeDropdownOpen(!shoeDropdownOpen)}
                            className="w-full px-3.5 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-left flex items-center justify-between text-[#29221E] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 hover:border-[#D96827] transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-2 truncate">
                              {selectedShoeId ? (
                                (() => {
                                  const shoe = availableShoes.find((s) => s.shoeId === selectedShoeId);
                                  return shoe ? (
                                    <>
                                      <span className="font-mono font-black text-[#D96827]">{shoe.shoeId}</span>
                                      <span className="text-xs text-[#8B8179]">
                                        ({shoe.isExtended
                                          ? `${shoe.extendedType === "EXTENDED_SMALL" ? "Ext-S" : shoe.extendedType === "EXTENDED_LARGE" ? "Ext-L" : "Ext-M"}`
                                          : `Size #${shoe.size}`}
                                        {" • "}
                                        {shoe.type === "QUAD" ? "Quads" : "Inline"})
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-mono font-bold">{selectedShoeId}</span>
                                  );
                                })()
                              ) : (
                                <span className="text-[#8B8179] font-normal">
                                  {t("rentals.chooseAsset", "Select an available shoe...")}
                                </span>
                              )}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-[#8B8179] transition-transform ${shoeDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          {/* Custom Dropdown Menu */}
                          {shoeDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-[#E9D9C5] rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                              <div className="p-2 border-b border-[#E9D9C5] bg-[#F7F6F3]">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8B8179]" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder={t("rentals.searchShoes", "Search shoe ID or size...")}
                                    value={shoeSearchQuery}
                                    onChange={(e) => setShoeSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E9D9C5] rounded-lg text-xs text-[#29221E] focus:outline-none focus:ring-1 focus:ring-[#D96827]"
                                  />
                                </div>
                              </div>

                              <div className="max-h-52 overflow-y-auto divide-y divide-[#E9D9C5]/50">
                                {shoesForSelectedSizeAndType
                                  .filter((s) => {
                                    if (!shoeSearchQuery.trim()) return true;
                                    const q = shoeSearchQuery.toLowerCase();
                                    return (
                                      s.shoeId.toLowerCase().includes(q) ||
                                      String(s.size).includes(q) ||
                                      (s.type || "").toLowerCase().includes(q) ||
                                      (s.coveredSizes && s.coveredSizes.some((cs) => String(cs).includes(q)))
                                    );
                                  })
                                  .map((s) => {
                                    const isSelected = selectedShoeId === s.shoeId;
                                    return (
                                      <button
                                        key={s._id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedShoeId(s.shoeId);
                                          setShoeDropdownOpen(false);
                                          setShoeSearchQuery("");
                                        }}
                                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                          isSelected
                                            ? "bg-[#FFF4E5] text-[#D96827] font-bold"
                                            : "hover:bg-[#F7F6F3] text-[#29221E]"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-black text-sm">{s.shoeId}</span>
                                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]">
                                            {s.isExtended
                                              ? `${s.extendedType === "EXTENDED_SMALL" ? "Ext-S" : s.extendedType === "EXTENDED_LARGE" ? "Ext-L" : "Ext-M"}`
                                              : `Size #${s.size}`}
                                          </span>
                                          <span className="text-[10px] text-[#8B8179]">
                                            {s.type === "QUAD" ? "Quads" : "Inline"}
                                          </span>
                                        </div>
                                        {isSelected && <Check className="h-4 w-4 text-[#D96827]" />}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#FFF4E5] border border-[#D96827]/30 text-xs text-[#29221E] space-y-1">
                    <span className="font-bold text-[#D96827] flex items-center gap-1.5">
                      🛼 {t("rentals.ownSkates", "Own Skates — Floor Access Only")}
                    </span>
                    <p className="text-[11px] text-[#8B8179]">
                      Customer is using their personal skates. No rental shoes will be reserved from fleet inventory.
                    </p>
                  </div>
                )}

                {/* Step 4: Duration & Pricing */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    {t("rentals.durationTiming", "4. Rental Duration")}
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
                      <div className="font-bold text-sm text-[#29221E]">{t("rentals.min30", "30 Minutes")}</div>
                      <div className="text-[11px] text-[#D96827] font-bold mt-0.5 font-mono">
                        {hasOwnSkates
                          ? `${Math.max(0, (isWeekend ? 200 : 150) - 50)} ${t("common.etb", "ETB")}`
                          : `${isWeekend ? 200 : 150} ${t("common.etb", "ETB")}`}
                      </div>
                      <div className="text-[10px] text-[#8B8179] mt-1 font-mono">
                        +5m buffer = 35m {hasOwnSkates && "(-50 ETB)"}
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
                      <div className="font-bold text-sm text-[#29221E]">{t("rentals.min60", "60 Minutes (1 Hour)")}</div>
                      <div className="text-[11px] text-[#D96827] font-bold mt-0.5 font-mono">
                        {hasOwnSkates
                          ? `${Math.max(0, (isWeekend ? 300 : 250) - 100)} ${t("common.etb", "ETB")}`
                          : `${isWeekend ? 300 : 250} ${t("common.etb", "ETB")}`}
                      </div>
                      <div className="text-[10px] text-[#8B8179] mt-1 font-mono">
                        +5m buffer = 65m {hasOwnSkates && "(-100 ETB)"}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 5: Start Time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider">
                      {t("rentals.startTimeLabel", "5. Start Time")}
                    </label>
                    <span className="text-[10px] text-[#8B8179] font-medium font-mono">
                      {customStartTime
                        ? `Custom: ${formatTimeString12(customStartTime)} (${customStartTime})`
                        : `Default: Now (${format12HourTime(new Date())})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomStartTime("")}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        !customStartTime
                          ? "bg-[#D96827] text-white shadow-xs"
                          : "bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5] hover:text-[#29221E]"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t("rentals.startTimeNow", "Now")}</span>
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 ${
                          customStartTime ? "border-[#D96827] text-[#29221E]" : "border-[#E9D9C5] text-[#8B8179]"
                        }`}
                        placeholder="HH:MM"
                      />
                    </div>
                    {customStartTime && (
                      <button
                        type="button"
                        onClick={() => setCustomStartTime("")}
                        className="p-2 text-xs font-bold text-[#8B8179] hover:text-[#D94B45] cursor-pointer"
                        title="Reset to Now"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8B8179] mt-1">
                    {t("rentals.startTimeDesc", "Leave as 'Now' or enter a custom start time if skater started earlier.")}
                  </p>
                </div>

                {/* Step 6: Customer Details */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    {t("rentals.customerInfo", "6. Customer Details")}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#29221E] mb-1">
                        {t("rentals.customerName", "Customer Name")}
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
                        {t("rentals.customerPhone", "Phone (Optional)")}
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
                </div>

                {/* Step 7: Payment Timing */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase tracking-wider mb-1.5">
                    {t("rentals.paymentSettlement", "7. Payment")}
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
                      {t("rentals.payOnReturn", "Pay on Return")}
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
                      {t("rentals.payNow", "Pay Now")} ({formatETB(calculatedPrice)})
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
                          {method === "CASH" ? t("common.cash", "Cash") : method === "TELEBIRR" ? t("common.telebirr", "Telebirr") : t("common.cbe", "CBE")}
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
                      ? t("common.loading", "Loading...")
                      : `${t("rentals.startSessionButton", "Start Rental")} (${duration + 5}m)`}
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
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E]">
                    {t("rentals.swapModalTitle", "Change Skater's Shoe")}
                  </h3>
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
                  {t("rentals.swapModalSub", "Select replacement shoe for active skater")} (
                  <strong className="text-[#29221E] font-mono">{swapSession.shoeId}</strong>, #{swapSession.shoeSize}).
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    {t("rentals.selectNewShoe", "Select Replacement Shoe")}
                  </label>
                  <select
                    value={swapNewShoeId}
                    onChange={(e) => setSwapNewShoeId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                  >
                    <option value="">-- {t("rentals.selectNewShoe", "Choose replacement shoe")} --</option>
                    {availableShoes
                      .filter((s) => s.status === "AVAILABLE" && s.shoeId !== swapSession.shoeId)
                      .map((s) => (
                        <option key={s._id} value={s.shoeId}>
                          {s.shoeId} (
                          {s.isExtended
                            ? `${t("shoes.extended", "Extended")} ${
                                s.extendedType === "EXTENDED_SMALL"
                                  ? "S"
                                  : s.extendedType === "EXTENDED_LARGE"
                                  ? "L"
                                  : "M"
                              } [${s.coveredSizes?.join(", ")}]`
                            : `${t("common.size", "Size")} #${s.size}`}
                          {" • "}
                          {s.type === "QUAD" ? t("common.quads", "Quads") : t("common.inline", "Inline")})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1">
                    {t("rentals.swapReason", "Reason for Change")}
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
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={swapLoading || !swapNewShoeId}
                    className="px-4 py-2 bg-[#D96827] hover:bg-[#C2571A] text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {swapLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{swapLoading ? t("common.loading", "Loading...") : t("rentals.confirmSwap", "Confirm Shoe Change")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. RETURN & CHECKOUT MODAL */}
        {returnSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#26845B]" />
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E]">
                    {returnSession.status === "RETURNED_UNPAID"
                      ? t("rentals.settlePayment", "Settle Payment")
                      : t("rentals.returnModalTitle", "Return Skates & Settle")}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setReturnSession(null);
                    setReturnCustomAmount("");
                  }}
                  className="p-1 text-[#8B8179] hover:text-[#29221E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => handleReturnSubmit(e, false)} className="mt-4 space-y-4">
                {/* Linked Billed Alert */}
                {returnSession.billedToShoeId && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    returnSession.paymentStatus === "PAID"
                      ? "bg-[#EBF5F0] border-[#26845B]/30 text-[#26845B]"
                      : "bg-[#E0F2FE] border-[#BAE6FD] text-[#0369A1]"
                  }`}>
                    <Link2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">
                        {returnSession.paymentStatus === "PAID" ? "Paid by Friend" : "Mapped to another skater"}
                      </strong>
                      <span>
                        {returnSession.paymentStatus === "PAID"
                          ? `Payment was already settled by #${returnSession.billedToShoeId} (${returnSession.billedToCustomerName || "Skater"}). Just confirm shoe return.`
                          : `This session is billed to #${returnSession.billedToShoeId} (${returnSession.billedToCustomerName || "Skater"}). You can return the shoe now and let them pay, or settle here.`}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-2.5">
                  <div className="flex justify-between text-xs text-[#8B8179]">
                    <span>{t("shoes.title", "Shoe")}:</span>
                    <strong className="text-[#29221E] font-mono">
                      {returnSession.hasOwnSkates
                        ? "Own Skates (Floor Access)"
                        : `${returnSession.shoeId} (${t("common.size", "Size")} #${returnSession.shoeSize})`}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-[#8B8179]">
                    <span>{t("common.name", "Customer")}:</span>
                    <span className="text-[#29221E] font-medium">{returnSession.customerName}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8B8179]">
                    <span>{t("common.time", "Duration")}:</span>
                    <span className="text-[#29221E] font-mono">
                      {returnSession.totalMinutes - returnSession.gracePeriodMinutes}m
                    </span>
                  </div>

                  {/* Cost breakdown */}
                  <div className="pt-2 border-t border-[#E9D9C5] space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[#8B8179]">
                      <span>{t("rentals.rentalCharge", "Rental Fee")}:</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className={returnSession.paymentStatus === "PAID" ? "line-through text-[#8B8179]" : "font-bold text-[#29221E]"}>
                          {formatETB(returnCustomAmount ? Number(returnCustomAmount) : returnSession.totalRentalFee)}
                        </span>
                        {returnSession.paymentStatus === "PAID" && (
                          <span className="text-[10px] font-bold text-[#26845B] bg-[#EBF5F0] px-1.5 py-0.5 rounded border border-[#26845B]/30">
                            ✓ {t("rentals.paidBadge", "PAID")}
                          </span>
                        )}
                      </div>
                    </div>

                    {returnSession.tabTotal && returnSession.tabTotal > 0 ? (
                      <div className="flex justify-between items-center text-[#D96827] font-semibold">
                        <span>{t("rentals.snacksBill", "Shop Bill")}:</span>
                        <span className="font-mono font-bold">+{formatETB(returnSession.tabTotal)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Group Billed Skaters covered by this session (Requirement #5) */}
                  {(() => {
                    if (!returnSession.payingForSessionIds || returnSession.payingForSessionIds.length === 0) return null;
                    const covered = sessions.filter(
                      (s) => returnSession.payingForSessionIds?.includes(s._id) && s.status !== "COMPLETED"
                    );
                    if (covered.length === 0) return null;
                    const coveredTotal = covered.reduce((sum, s) => sum + (s.paymentStatus === "PAID" ? 0 : s.totalRentalFee), 0);

                    return (
                      <div className="mt-2 pt-2 border-t border-[#E9D9C5] space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-[#26845B]">
                          <span>Paying for {covered.length} friend(s):</span>
                          <span className="font-mono">+{formatETB(coveredTotal)}</span>
                        </div>
                        <div className="space-y-1 bg-white p-2 rounded-lg border border-[#E9D9C5]">
                          {covered.map((cs) => (
                            <div key={cs._id} className="flex justify-between items-center text-[11px] font-mono text-[#29221E]">
                              <div className="flex items-center gap-1.5 truncate">
                                <span>{cs.hasOwnSkates ? "Own Skates" : cs.shoeId} ({cs.customerName || "Skater"})</span>
                                <span className={`text-[10px] px-1 py-0.2 rounded font-sans font-medium ${
                                  cs.isShoeReturned
                                    ? "bg-[#FFF9E6] text-[#9C6D14] border border-[#D99B26]/30"
                                    : "bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30"
                                }`}>
                                  {cs.isShoeReturned ? t("rentals.shoeReturnedBadge", "Shoe returned") : t("rentals.stillSkating", "Still skating")}
                                </span>
                              </div>
                              <span className="font-bold">{formatETB(cs.totalRentalFee)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Amount Due to Collect Now */}
                  {(() => {
                    const isSkatePaid = returnSession.paymentStatus === "PAID";
                    const settledFee = returnCustomAmount ? Number(returnCustomAmount) : returnSession.totalRentalFee;
                    const skateDue = isSkatePaid ? 0 : settledFee;
                    const snackDue = returnSession.tabTotal || 0;

                    const covered = sessions.filter(
                      (s) => returnSession.payingForSessionIds?.includes(s._id) && s.status !== "COMPLETED"
                    );
                    const coveredDue = covered.reduce((sum, s) => sum + (s.paymentStatus === "PAID" ? 0 : s.totalRentalFee), 0);

                    const totalDueNow = skateDue + snackDue + coveredDue;

                    return (
                      <div className="pt-2.5 border-t border-[#E9D9C5]">
                        <div className="flex justify-between items-baseline">
                          <div>
                            <span className="text-sm font-bold text-[#29221E] block">
                              {totalDueNow > 0 ? t("rentals.totalDue", "Total To Collect") + ":" : t("common.status", "Status") + ":"}
                            </span>
                          </div>
                          <span className={`text-xl font-black font-mono ${totalDueNow > 0 ? "text-[#D96827]" : "text-[#26845B]"}`}>
                            {formatETB(totalDueNow)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Requirement #3: Custom settled price input if session had extensions/additional time */}
                {returnSession.extensions && returnSession.extensions.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FFF4E5] border border-[#D96827]/30 space-y-1.5">
                    <label className="block text-xs font-bold text-[#D96827] uppercase">
                      {t("rentals.customPrice", "Custom Settled Amount (Optional)")}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={String(returnSession.totalRentalFee)}
                        value={returnCustomAmount}
                        onChange={(e) => setReturnCustomAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                      />
                      <span className="text-xs font-bold font-mono text-[#8B8179]">ETB</span>
                    </div>
                    <p className="text-[10px] text-[#8B8179]">
                      Session had time adjustments. You can override the final fee if negotiated.
                    </p>
                  </div>
                )}

                {/* Payment method selector if balance is owed */}
                {(() => {
                  const isSkatePaid = returnSession.paymentStatus === "PAID";
                  const settledFee = returnCustomAmount ? Number(returnCustomAmount) : returnSession.totalRentalFee;
                  const skateDue = isSkatePaid ? 0 : settledFee;
                  const snackDue = returnSession.tabTotal || 0;
                  const covered = sessions.filter(
                    (s) => returnSession.payingForSessionIds?.includes(s._id) && s.status !== "COMPLETED"
                  );
                  const coveredDue = covered.reduce((sum, s) => sum + (s.paymentStatus === "PAID" ? 0 : s.totalRentalFee), 0);
                  const totalDueNow = skateDue + snackDue + coveredDue;

                  if (totalDueNow <= 0) return null;

                  return (
                    <div>
                      <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                        {t("expenses.channel", "Payment Method")} ({formatETB(totalDueNow)})
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
                            {method === "CASH" ? t("common.cash", "Cash") : method === "TELEBIRR" ? t("common.telebirr", "Telebirr") : t("common.cbe", "CBE")}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => {
                      setReturnSession(null);
                      setReturnCustomAmount("");
                    }}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer text-center"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>

                  {/* Requirement #4: Return Shoe Only (Unpaid / In House) button */}
                  {returnSession.status === "ACTIVE" && !returnSession.hasOwnSkates && returnSession.paymentStatus !== "PAID" && (
                    <button
                      type="button"
                      disabled={returnLoading}
                      onClick={(e) => handleReturnSubmit(e, true)}
                      className="px-3.5 py-2.5 bg-[#FFF9E6] hover:bg-[#FFF0C2] text-[#9C6D14] border border-[#D99B26] font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      title="Shoe is freed to rack for others; customer debt is recorded in Unpaid Returns tab"
                    >
                      {returnLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>
                        {returnSession.billedToShoeId
                          ? t("rentals.returnShoeWaitingFriend", "Return Shoe (Friend Pays Later)")
                          : t("rentals.returnShoeOnly", "Return Shoe Only (In House)")}
                      </span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={returnLoading}
                    className="px-5 py-2.5 bg-[#26845B] hover:bg-[#1f6d4a] text-white font-bold text-xs rounded-xl shadow-md shadow-[#26845B]/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {returnLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {returnLoading
                        ? t("common.loading", "Loading...")
                        : returnSession.status === "RETURNED_UNPAID"
                        ? t("rentals.settlePayment", "Confirm Payment & Settle")
                        : returnSession.paymentStatus === "PAID"
                        ? t("rentals.confirmShoeReturn", "Confirm Shoe Return")
                        : t("rentals.returnAndSettle", "Settle & Return Now")}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. CANCEL RENTAL CONFIRMATION MODAL */}
        {cancelSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E] space-y-3.5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#E9D9C5]">
                <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#29221E]">
                    {t("rentals.cancelModalTitle", "Cancel Rental Session?")}
                  </h3>
                  <p className="text-xs text-[#8B8179]">
                    {t("rentals.cancelModalDesc", "Shoe will be released back to Available.")}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8B8179] font-sans">Shoe:</span>
                  <strong>{cancelSession.shoeId} (#{cancelSession.shoeSize})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8179] font-sans">Customer:</span>
                  <span>{cancelSession.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8179] font-sans">Fee:</span>
                  <span className="text-[#D96827]">{formatETB(cancelSession.totalRentalFee)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                <button
                  type="button"
                  onClick={() => setCancelSession(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleCancelConfirm}
                  className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {cancelLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{cancelLoading ? t("rentals.cancelling", "Cancelling...") : t("rentals.confirmCancel", "Confirm Cancel")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. EDIT RENTAL SESSION MODAL */}
        {editSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">
                      {t("rentals.editRentalModalTitle", "Edit Rental Session")}
                    </h3>
                    <p className="text-xs text-[#8B8179]">
                      {t("rentals.editRentalModalSub", "Change duration, payment status, or customer info")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSession(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Shoe info card */}
                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs flex items-center justify-between font-mono">
                  <span>Shoe: <strong>{editSession.shoeId}</strong> (#{editSession.shoeSize})</span>
                  <span className="text-[#8B8179]">Started: {format12HourTime(editSession.startedAt)}</span>
                </div>

                {/* Duration Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                    {t("rentals.durationTiming", "Duration")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditDuration(30)}
                      className={`p-3 rounded-xl border text-left font-bold text-xs cursor-pointer transition-all ${
                        editDuration === 30
                          ? "bg-[#D96827] text-white border-[#D96827] shadow-sm"
                          : "bg-white text-[#29221E] border-[#E9D9C5]"
                      }`}
                    >
                      <div className="text-sm">30 Minutes</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${editDuration === 30 ? "text-white/90" : "text-[#D96827]"}`}>
                        {editSession.pricingType === "WEEKEND" ? "200 ETB" : "150 ETB"}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDuration(60)}
                      className={`p-3 rounded-xl border text-left font-bold text-xs cursor-pointer transition-all ${
                        editDuration === 60
                          ? "bg-[#D96827] text-white border-[#D96827] shadow-sm"
                          : "bg-white text-[#29221E] border-[#E9D9C5]"
                      }`}
                    >
                      <div className="text-sm">60 Minutes</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${editDuration === 60 ? "text-white/90" : "text-[#D96827]"}`}>
                        {editSession.pricingType === "WEEKEND" ? "300 ETB" : "250 ETB"}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Start Time Editor */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5 flex items-center justify-between">
                    <span>{t("rentals.startTimeLabel", "Start Time")}</span>
                    <span className="text-[10px] text-[#8B8179] font-mono">
                      {editStartTime
                        ? `${formatTimeString12(editStartTime)} (${editStartTime})`
                        : `Current: ${format12HourTime(editSession.startedAt)}`}
                    </span>
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                  />
                </div>

                {/* Payment Status & Channel */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                    {t("rentals.paymentChannel", "Payment Channel")}
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setEditPaymentStatus("UNPAID")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editPaymentStatus === "UNPAID"
                          ? "bg-[#FFF4E5] border-[#D96827] text-[#D96827]"
                          : "bg-white border-[#E9D9C5] text-[#8B8179]"
                      }`}
                    >
                      {t("rentals.unpaidBadge", "UNPAID")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentStatus("PAID")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editPaymentStatus === "PAID"
                          ? "bg-[#EBF5F0] border-[#26845B] text-[#26845B]"
                          : "bg-white border-[#E9D9C5] text-[#8B8179]"
                      }`}
                    >
                      {t("rentals.paidBadge", "PAID")}
                    </button>
                  </div>

                  {editPaymentStatus === "PAID" && (
                    <div className="grid grid-cols-3 gap-2">
                      {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setEditPaymentMethod(method)}
                          className={`py-1.5 px-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            editPaymentMethod === method
                              ? "bg-[#29221E] text-white border-[#29221E]"
                              : "bg-white border-[#E9D9C5] text-[#8B8179]"
                          }`}
                        >
                          {method === "CASH" ? t("common.cash", "Cash") : method === "TELEBIRR" ? t("common.telebirr", "Telebirr") : t("common.cbe", "CBE")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      {t("rentals.customerName", "Customer Name")}
                    </label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      {t("rentals.customerPhone", "Phone")}
                    </label>
                    <input
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setEditSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {editLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editLoading ? t("common.loading", "Saving...") : t("common.saveChanges", "Save Changes")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. ADJUST / EXTEND RENTAL TIME MODAL */}
        {timeAdjustSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E] space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">
                      {t("rentals.adjustTimeModalTitle", "Add or Decrease Rental Time")}
                    </h3>
                    <p className="text-xs text-[#8B8179]">
                      {t("rentals.adjustTimeModalSub", "Extend session duration or reduce time, and select the payment channel.")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTimeAdjustSession(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleTimeAdjustSubmit} className="space-y-4">
                {/* Skater & Shoe Info Banner */}
                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs flex items-center justify-between font-mono">
                  <span>Shoe: <strong>{timeAdjustSession.shoeId}</strong> (#{timeAdjustSession.shoeSize})</span>
                  <span>{timeAdjustSession.customerName || "Skater"}</span>
                </div>

                {/* Overdue Fresh-Start Warning (Requirement #3) */}
                {(() => {
                  const currentEndMs = new Date(timeAdjustSession.expectedEndTime).getTime();
                  const isOverdue = now > currentEndMs;
                  if (!isOverdue || adjustMinutes <= 0) return null;

                  const overdueMinutes = Math.max(1, Math.round((now - currentEndMs) / 60000));
                  return (
                    <div className="p-3 rounded-xl bg-[#FFF4E5] border border-[#D96827]/40 text-xs text-[#29221E] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#D96827]">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{t("rentals.overdueBy", "Overdue by")} {overdueMinutes} min</span>
                      </div>
                      <p className="text-[11px] text-[#8B8179] leading-relaxed">
                        {t("rentals.freshStartNotice", "Overdue skater: Additional time starts fresh from NOW so overdue minutes are not deducted.")}
                      </p>
                    </div>
                  );
                })()}

                {/* Duration Presets (Requirement #2: Increase & Decrease) */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                    {t("rentals.timeAction", "Select Time Adjustment")}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { min: -30, label: "-30m", isSub: true },
                      { min: -15, label: "-15m", isSub: true },
                      { min: 30, label: "+30m", isSub: false },
                      { min: 60, label: "+1h", isSub: false },
                    ].map((item) => {
                      const isSelected = adjustMinutes === item.min;
                      const fee = calculateAdjustFee(timeAdjustSession, item.min);
                      return (
                        <button
                          key={item.min}
                          type="button"
                          onClick={() => setAdjustMinutes(item.min)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? item.isSub
                                ? "bg-[#C2571A] text-white border-[#C2571A] shadow-sm font-bold"
                                : "bg-[#D96827] text-white border-[#D96827] shadow-sm font-bold"
                              : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                          }`}
                        >
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-white/90" : item.isSub ? "text-[#C2571A]" : "text-[#D96827]"}`}>
                            {fee > 0 ? `+${fee}` : fee < 0 ? `${fee}` : "0"} ETB
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Box */}
                {(() => {
                  const fee = adjustCustomFee !== "" && !isNaN(Number(adjustCustomFee))
                    ? Number(adjustCustomFee)
                    : calculateAdjustFee(timeAdjustSession, adjustMinutes);
                  const newEnd = calculateAdjustedEndTime(timeAdjustSession, adjustMinutes);
                  return (
                    <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-[#8B8179] font-sans">
                        <span>{t("rentals.currentDue", "Current Due")}:</span>
                        <strong className="font-mono text-[#29221E]">{format12HourTime(timeAdjustSession.expectedEndTime)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8B8179] font-sans">{t("rentals.newDueTime", "New Due Time")}:</span>
                        <strong className="font-bold text-[#26845B] text-sm">{format12HourTime(newEnd)}</strong>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#E9D9C5] pt-1.5">
                        <span className="text-[#8B8179] font-sans">{t("rentals.feeAdjustment", "Fee Adjustment")}:</span>
                        <strong className={`font-bold ${fee > 0 ? "text-[#D96827]" : fee < 0 ? "text-[#C2571A]" : "text-[#29221E]"}`}>
                          {fee > 0 ? `+${formatETB(fee)}` : fee < 0 ? `${formatETB(fee)}` : "0 ETB"}
                        </strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Requirement #3: Custom Price Override (Optional) */}
                {adjustMinutes > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1 flex items-center justify-between">
                      <span>{t("rentals.customPrice", "Custom Price Override (Optional)")}</span>
                      <span className="text-[10px] text-[#8B8179]">
                        {t("rentals.defaultPrice", "Default")}: {calculateAdjustFee(timeAdjustSession, adjustMinutes)} ETB
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={String(calculateAdjustFee(timeAdjustSession, adjustMinutes))}
                        value={adjustCustomFee}
                        onChange={(e) => setAdjustCustomFee(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                      />
                      <span className="text-xs font-bold font-mono text-[#8B8179]">ETB</span>
                    </div>
                  </div>
                )}

                {/* Payment Channel Selector (Requirement #1) */}
                {adjustMinutes > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                      {t("rentals.paymentChannel", "Payment Channel")}
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setAdjustPaymentOption("PAID")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          adjustPaymentOption === "PAID"
                            ? "bg-[#EBF5F0] border-[#26845B] text-[#26845B]"
                            : "bg-white border-[#E9D9C5] text-[#8B8179]"
                        }`}
                      >
                        {t("rentals.payNow", "Pay Now")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustPaymentOption("UNPAID")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          adjustPaymentOption === "UNPAID"
                            ? "bg-[#FFF4E5] border-[#D96827] text-[#D96827]"
                            : "bg-white border-[#E9D9C5] text-[#8B8179]"
                        }`}
                      >
                        {t("rentals.payOnReturn", "Pay on Return")}
                      </button>
                    </div>

                    {adjustPaymentOption === "PAID" && (
                      <div className="grid grid-cols-3 gap-2">
                        {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setAdjustPaymentMethod(method)}
                            className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                              adjustPaymentMethod === method
                                ? "bg-[#D96827] text-white border-[#D96827] shadow-sm"
                                : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                            }`}
                          >
                            {method === "CASH" ? t("common.cash", "Cash") : method === "TELEBIRR" ? t("common.telebirr", "Telebirr") : t("common.cbe", "CBE")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setTimeAdjustSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={adjustSubmitting || adjustMinutes === 0}
                    className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                      adjustMinutes < 0 ? "bg-[#C2571A] hover:bg-[#a94812]" : "bg-[#D96827] hover:bg-[#C2571A]"
                    }`}
                  >
                    {adjustSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {adjustSubmitting
                        ? t("common.loading", "Updating...")
                        : adjustMinutes > 0
                        ? `Confirm +${adjustMinutes}m`
                        : `Confirm ${adjustMinutes}m`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 7. LINK PAYER MODAL (Requirement #5) */}
        {linkPayerSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E0F2FE] text-[#0369A1]">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#29221E]">
                      {t("rentals.linkPayer", "Bill to Another Skater")}
                    </h3>
                    <p className="text-xs text-[#8B8179]">
                      Map this skater's payment to another active skater
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLinkPayerSession(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8B8179]">Current Skater:</span>
                  <strong className="font-mono text-[#29221E]">
                    {linkPayerSession.hasOwnSkates ? "Own Skates" : linkPayerSession.shoeId} ({linkPayerSession.customerName || "Skater"})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8179]">Session Fee:</span>
                  <strong className="text-[#D96827] font-mono">{formatETB(linkPayerSession.totalRentalFee)}</strong>
                </div>
                {linkPayerSession.billedToShoeId && (
                  <div className="mt-2 pt-2 border-t border-[#E9D9C5] flex items-center justify-between text-[#0369A1]">
                    <span>Currently billed to: <strong>#{linkPayerSession.billedToShoeId}</strong> ({linkPayerSession.billedToCustomerName || "Skater"})</span>
                    <button
                      type="button"
                      onClick={() => handleUnlinkPayer(linkPayerSession)}
                      className="text-[11px] font-bold text-[#D94B45] underline cursor-pointer hover:opacity-80"
                    >
                      Unlink
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleLinkPayerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] uppercase mb-1.5">
                    Select Who Will Pay (Active Skaters)
                  </label>
                  <select
                    value={targetPayerId}
                    onChange={(e) => setTargetPayerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-xs sm:text-sm font-medium text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#0369A1] cursor-pointer"
                  >
                    <option value="">-- Choose payer on the floor --</option>
                    {sessions
                      .filter(
                        (s) =>
                          s._id !== linkPayerSession._id &&
                          s.status === "ACTIVE" &&
                          s.billedToSessionId !== linkPayerSession._id
                      )
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.hasOwnSkates ? "Own Skates" : s.shoeId} - {s.customerName || "Skater"} (Due: {format12HourTime(s.expectedEndTime)})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setLinkPayerSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={linkPayerLoading || !targetPayerId}
                    className="px-5 py-2.5 bg-[#0369A1] hover:bg-[#0284C7] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {linkPayerLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Map to Skater</span>
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
