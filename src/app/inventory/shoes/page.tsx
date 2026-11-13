"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ShoeStatus, SkateType } from "@/models/Shoe";
import { useAlertModal } from "@/components/ModalAlertProvider";
import { useLanguage } from "@/lib/i18n";
import {
  Footprints,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Wrench,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react";

interface ShoeItem {
  _id: string;
  shoeId: string;
  size: number;
  type?: SkateType;
  status: ShoeStatus;
  notes?: string;
  updatedAt: string;
}

export default function ShoesInventoryPage() {
  const { showAlert } = useAlertModal();
  const { t } = useLanguage();
  const [shoes, setShoes] = useState<ShoeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedSize, setSelectedSize] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Add shoe modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShoeId, setNewShoeId] = useState("");
  const [newSize, setNewSize] = useState("40");
  const [newType, setNewType] = useState<SkateType>("INLINE");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit shoe modal
  const [editingShoe, setEditingShoe] = useState<ShoeItem | null>(null);
  const [editShoeId, setEditShoeId] = useState("");
  const [editSize, setEditSize] = useState("40");
  const [editType, setEditType] = useState<SkateType>("INLINE");
  const [editStatus, setEditStatus] = useState<ShoeStatus>("AVAILABLE");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete shoe confirmation
  const [shoeToDelete, setShoeToDelete] = useState<ShoeItem | null>(null);
  const [deletingShoe, setDeletingShoe] = useState(false);

  const fetchShoes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shoes");
      if (res.ok) {
        const data = await res.json();
        setShoes(data.shoes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShoes();
  }, []);

  const handleAddShoe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoeId.trim()) {
      showAlert({
        title: t("common.warning", "Warning"),
        message: t("shoes.shoeIdLabel", "Shoe ID Tag") + ": " + t("common.error", "Required"),
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoeId: newShoeId.trim().toUpperCase(),
          size: Number(newSize),
          type: newType,
          notes: newNotes.trim(),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewShoeId("");
        setNewNotes("");
        showAlert({
          title: t("common.success", "Success"),
          message: `${newShoeId.toUpperCase()} (#${newSize})`,
          type: "success",
        });
        fetchShoes();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || t("common.error", "Failed to add shoe"),
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: t("common.error", "Network error"),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ShoeStatus) => {
    try {
      const res = await fetch(`/api/shoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchShoes();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || t("common.error", "Could not update status"),
          type: "error",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (shoe: ShoeItem) => {
    setEditingShoe(shoe);
    setEditShoeId(shoe.shoeId);
    setEditSize(shoe.size.toString());
    setEditType(shoe.type || "INLINE");
    setEditStatus(shoe.status);
    setEditNotes(shoe.notes || "");
  };

  const handleEditShoe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShoe || !editShoeId.trim()) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/shoes/${editingShoe._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoeId: editShoeId.trim().toUpperCase(),
          size: Number(editSize),
          type: editType,
          status: editStatus,
          notes: editNotes.trim(),
        }),
      });
      if (res.ok) {
        setEditingShoe(null);
        showAlert({
          title: t("common.success", "Success"),
          message: `${editShoeId.toUpperCase()}`,
          type: "success",
        });
        fetchShoes();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || t("common.error", "Failed to update shoe"),
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: t("common.error", "Failed to connect"),
        type: "error",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteShoe = async () => {
    if (!shoeToDelete) return;
    setDeletingShoe(true);
    try {
      const res = await fetch(`/api/shoes/${shoeToDelete._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShoeToDelete(null);
        showAlert({
          title: t("common.success", "Success"),
          message: `${shoeToDelete.shoeId}`,
          type: "success",
        });
        fetchShoes();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || t("common.error", "Failed to delete"),
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: t("common.error", "Failed to delete shoe"),
        type: "error",
      });
    } finally {
      setDeletingShoe(false);
    }
  };

  // Filtered shoes
  const filteredShoes = useMemo(() => {
    return shoes.filter((shoe) => {
      const matchesSize = selectedSize === "ALL" || shoe.size.toString() === selectedSize;
      const matchesStatus = selectedStatus === "ALL" || shoe.status === selectedStatus;
      const shoeType = shoe.type || "INLINE";
      const matchesType = selectedType === "ALL" || shoeType === selectedType;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        q === "" ||
        shoe.shoeId.toLowerCase().includes(q) ||
        shoe.size.toString().includes(q) ||
        (shoe.notes && shoe.notes.toLowerCase().includes(q));

      return matchesSize && matchesStatus && matchesType && matchesQuery;
    });
  }, [shoes, selectedSize, selectedStatus, selectedType, searchQuery]);

  const availableCount = shoes.filter((s) => s.status === "AVAILABLE").length;
  const rentedCount = shoes.filter((s) => s.status === "RENTED").length;
  const maintenanceCount = shoes.filter((s) => s.status === "MAINTENANCE").length;

  const allSizes = useMemo(
    () => Array.from(new Set(shoes.map((s) => s.size))).sort((a, b) => a - b),
    [shoes]
  );

  const activeFiltersCount =
    (selectedSize !== "ALL" ? 1 : 0) +
    (selectedStatus !== "ALL" ? 1 : 0) +
    (selectedType !== "ALL" ? 1 : 0) +
    (searchQuery.trim() !== "" ? 1 : 0);

  const resetFilters = () => {
    setSelectedSize("ALL");
    setSelectedStatus("ALL");
    setSelectedType("ALL");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] pb-28 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="h-5 w-5 sm:h-6 sm:w-6 text-[#D96827]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                {t("shoes.title", "Skate Shoes")}
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#8B8179]">
              {t("shoes.subtitle", "Track physical skates by size and condition")}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchShoes}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh", "Refresh")}
            </button>
            <button
              onClick={() => {
                const currentSameSize = shoes.filter((s) => s.size === Number(newSize));
                const nextNum = String(currentSameSize.length + 1).padStart(2, "0");
                setNewShoeId(`SK-${newSize}-${nextNum}`);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t("shoes.addShoe", "+ Add Skate Shoe")}
            </button>
          </div>
        </div>

        {/* 1. Status Highlights Cards (Zero-Overflow on Mobile) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4 w-full min-w-0">
          {/* Available Card */}
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "AVAILABLE" ? "ALL" : "AVAILABLE")}
            className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between shadow-2xs cursor-pointer overflow-hidden min-w-0 ${
              selectedStatus === "AVAILABLE"
                ? "bg-[#EBF5F0] border-[#26845B] ring-2 ring-inset ring-[#26845B]"
                : "bg-[#EBF5F0]/80 border-[#26845B]/30 hover:bg-[#EBF5F0] hover:border-[#26845B]/60"
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-[#26845B] uppercase font-bold tracking-tight truncate block">
                {t("shoes.availableStat", "Available")}
              </span>
              <p className="text-lg sm:text-3xl font-black text-[#26845B] leading-tight">
                {availableCount}
              </p>
            </div>
            <div className="h-6 w-6 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/80 border border-[#26845B]/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-[#26845B]" />
            </div>
          </button>

          {/* Rented (Active) Card */}
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "RENTED" ? "ALL" : "RENTED")}
            className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between shadow-2xs cursor-pointer overflow-hidden min-w-0 ${
              selectedStatus === "RENTED"
                ? "bg-[#FFF4E5] border-[#D96827] ring-2 ring-inset ring-[#D96827]"
                : "bg-[#FFF4E5]/80 border-[#D96827]/30 hover:bg-[#FFF4E5] hover:border-[#D96827]/60"
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-[#D96827] uppercase font-bold tracking-tight truncate block">
                <span className="sm:hidden">{t("common.rented", "Rented")}</span>
                <span className="hidden sm:inline">{t("shoes.rentedStat", "Rented (Active)")}</span>
              </span>
              <p className="text-lg sm:text-3xl font-black text-[#D96827] leading-tight">
                {rentedCount}
              </p>
            </div>
            <div className="h-6 w-6 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/80 border border-[#D96827]/20 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-[#D96827]" />
            </div>
          </button>

          {/* Maintenance Card */}
          <button
            type="button"
            onClick={() =>
              setSelectedStatus(selectedStatus === "MAINTENANCE" ? "ALL" : "MAINTENANCE")
            }
            className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between shadow-2xs cursor-pointer overflow-hidden min-w-0 ${
              selectedStatus === "MAINTENANCE"
                ? "bg-[#FDF0EF] border-[#D94B45] ring-2 ring-inset ring-[#D94B45]"
                : "bg-[#FDF0EF]/80 border-[#D94B45]/30 hover:bg-[#FDF0EF] hover:border-[#D94B45]/60"
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs text-[#D94B45] uppercase font-bold tracking-tight truncate block">
                <span className="sm:hidden">{t("shoes.maintStat", "Maint")}</span>
                <span className="hidden sm:inline">{t("shoes.maintStat", "Maintenance")}</span>
              </span>
              <p className="text-lg sm:text-3xl font-black text-[#D94B45] leading-tight">
                {maintenanceCount}
              </p>
            </div>
            <div className="h-6 w-6 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/80 border border-[#D94B45]/20 flex items-center justify-center shrink-0">
              <Wrench className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-[#D94B45]" />
            </div>
          </button>
        </div>

        {/* 2. Collapsible Filter & Search Panel */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl shadow-2xs overflow-hidden transition-all">
          <div className="p-3 sm:p-4 flex items-center justify-between gap-3 border-b border-[#E9D9C5]/60 bg-[#FAF9F6]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#D96827]" />
              <span className="text-xs font-bold text-[#29221E] uppercase tracking-wider">
                {t("shoes.filterTitle", "Filter Shoes")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-semibold text-[#8B8179] hover:text-[#D94B45] transition-colors cursor-pointer mr-1"
                >
                  {t("common.reset", "Reset")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E9D9C5] text-[#29221E] hover:bg-[#FFF4E5] transition-colors cursor-pointer shadow-2xs"
              >
                <span>{filtersOpen ? t("common.collapse", "Collapse") : t("common.openFilters", "Open Filters")}</span>
                {filtersOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-[#8B8179]" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-[#8B8179]" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {filtersOpen && (
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Row 1: Search & Type Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                {/* Search Bar */}
                <div className="relative sm:col-span-6 lg:col-span-5">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B8179]" />
                  <input
                    type="text"
                    placeholder={t("shoes.searchPlaceholder", "Search shoe ID, size, or notes...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-[#8B8179] hover:text-[#29221E]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Skate Type Selector (Inline vs Quads) */}
                <div className="sm:col-span-6 lg:col-span-4 flex items-center gap-1.5">
                  <span className="text-xs text-[#8B8179] font-semibold whitespace-nowrap">
                    {t("shoes.shoeTypeLabel", "Type:")}
                  </span>
                  <div className="grid grid-cols-3 gap-1 w-full">
                    {[
                      { id: "ALL", label: t("shoes.typeAll", "All Types") },
                      { id: "INLINE", label: t("common.inline", "Inline") },
                      { id: "QUAD", label: t("common.quads", "Quads") },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedType(item.id)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center truncate ${
                          selectedType === item.id
                            ? "bg-[#29221E] text-white font-bold shadow-2xs"
                            : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="sm:col-span-12 lg:col-span-3 flex items-center gap-1.5">
                  <span className="text-xs text-[#8B8179] font-semibold whitespace-nowrap">
                    {t("common.status", "Status:")}
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-semibold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 cursor-pointer"
                  >
                    <option value="ALL">{t("shoes.statusAll", "All Statuses")} ({shoes.length})</option>
                    <option value="AVAILABLE">{t("shoes.availableStat", "Available")} ({availableCount})</option>
                    <option value="RENTED">{t("shoes.rentedStat", "Rented")} ({rentedCount})</option>
                    <option value="MAINTENANCE">{t("shoes.maintStat", "Maintenance")} ({maintenanceCount})</option>
                    <option value="RETIRED">{t("shoes.retired", "Retired")}</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Shoe Size Pills */}
              <div className="pt-2 border-t border-[#E9D9C5]/50">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  <span className="text-xs text-[#8B8179] font-semibold mr-1 whitespace-nowrap">
                    {t("shoes.sizes", "Sizes:")}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedSize("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      selectedSize === "ALL"
                        ? "bg-[#D96827] text-white font-bold shadow-2xs"
                        : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                    }`}
                  >
                    {t("common.all", "All")} ({shoes.length})
                  </button>

                  {allSizes.map((size) => {
                    const totalForSize = shoes.filter((s) => s.size === size).length;
                    const availForSize = shoes.filter(
                      (s) => s.size === size && s.status === "AVAILABLE"
                    ).length;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                          selectedSize === size.toString()
                            ? "bg-[#D96827] text-white font-bold shadow-2xs"
                            : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                        }`}
                      >
                        {t("common.size", "Size")} #{size} ({availForSize}/{totalForSize})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-[#8B8179] px-1">
          <span>
            {t("common.showing", "Showing")} <strong className="text-[#29221E]">{filteredShoes.length}</strong> {t("common.of", "of")}{" "}
            {shoes.length} {t("shoes.ofTotalShoes", "total shoes")}
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-[#D96827] hover:underline font-semibold cursor-pointer"
            >
              {t("shoes.clearFilters", "Clear all filters")}
            </button>
          )}
        </div>

        {/* 3. Shoe Asset Cards Grid */}
        {filteredShoes.length === 0 ? (
          <div className="p-8 text-center bg-white border border-[#E9D9C5] rounded-2xl shadow-2xs space-y-2">
            <Footprints className="h-8 w-8 text-[#8B8179] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#29221E]">{t("shoes.noShoesFound", "No skate shoes match current filters")}</h4>
            <p className="text-xs text-[#8B8179]">
              {t("shoes.clearFilters", "Try adjusting your size, status, or type selection.")}
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 bg-[#D96827] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {t("common.reset", "Reset Filters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {filteredShoes.map((shoe) => {
              const shoeType = shoe.type || "INLINE";
              return (
                <div
                  key={shoe._id}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs ${
                    shoe.status === "AVAILABLE"
                      ? "bg-white border-[#E9D9C5] hover:border-[#26845B]"
                      : shoe.status === "RENTED"
                      ? "bg-[#FFF4E5]/40 border-[#D96827]/40"
                      : shoe.status === "MAINTENANCE"
                      ? "bg-[#FDF0EF]/60 border-[#D94B45]/40"
                      : "bg-[#F7F6F3] border-[#E9D9C5] opacity-60"
                  }`}
                >
                  <div className="space-y-1.5">
                    {/* Top Row: Size + Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-[#29221E]">#{shoe.size}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                          shoe.status === "AVAILABLE"
                            ? "bg-[#EBF5F0] text-[#26845B] border-[#26845B]/30"
                            : shoe.status === "RENTED"
                            ? "bg-[#FFF4E5] text-[#D96827] border-[#D96827]/30"
                            : shoe.status === "MAINTENANCE"
                            ? "bg-[#FDF0EF] text-[#D94B45] border-[#D94B45]/30"
                            : "bg-[#F7F6F3] text-[#8B8179] border-[#E9D9C5]"
                        }`}
                      >
                        {shoe.status === "AVAILABLE"
                          ? t("common.available", "Available")
                          : shoe.status === "RENTED"
                          ? t("common.rented", "Rented")
                          : shoe.status === "MAINTENANCE"
                          ? t("shoes.maintStat", "Maint")
                          : t("shoes.retired", "Retired")}
                      </span>
                    </div>

                    {/* Shoe ID */}
                    <div className="font-mono text-xs font-black text-[#29221E] tracking-tight">
                      {shoe.shoeId}
                    </div>

                    {/* Skate Type Pill */}
                    <div className="pt-0.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold inline-block ${
                          shoeType === "QUAD"
                            ? "bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]"
                            : "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]"
                        }`}
                      >
                        {shoeType === "QUAD" ? t("common.quads", "Quads") : t("common.inlineSkates", "Inline Skates")}
                      </span>
                    </div>

                    {shoe.notes && (
                      <p className="text-[10px] text-[#8B8179] truncate pt-0.5" title={shoe.notes}>
                        {shoe.notes}
                      </p>
                    )}
                  </div>

                  {/* Quick Status Changer & Actions */}
                  <div className="mt-3 pt-2 border-t border-[#E9D9C5]/60 space-y-1.5">
                    {shoe.status === "RENTED" ? (
                      <div className="bg-[#FFF4E5] border border-[#D96827]/40 rounded-xl p-1.5 text-center">
                        <span className="text-[10px] font-bold text-[#D96827] block">
                          ⏱ {t("shoes.rentedLocked", "Rented (Active)")}
                        </span>
                        <Link
                          href="/rentals"
                          className="inline-flex items-center gap-1 text-[10px] text-[#D96827] font-extrabold hover:underline pt-0.5"
                        >
                          <span>{t("shoes.viewOnBoard", "View Rental")}</span> &rarr;
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={shoe.status}
                        onChange={(e) =>
                          handleStatusChange(shoe._id, e.target.value as ShoeStatus)
                        }
                        className="w-full py-1.5 px-2 bg-white border border-[#E9D9C5] rounded-xl text-[11px] font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 cursor-pointer shadow-2xs"
                      >
                        <option value="AVAILABLE">✓ {t("common.available", "Available")}</option>
                        <option value="MAINTENANCE">🔧 {t("shoes.maintStat", "Maintenance")}</option>
                        <option value="RETIRED">⛔ {t("shoes.retired", "Retired")}</option>
                      </select>
                    )}

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(shoe)}
                        className="p-1 text-[#8B8179] hover:text-[#D96827] rounded-md hover:bg-[#FFF4E5] transition-colors cursor-pointer"
                        title={t("common.edit", "Edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShoeToDelete(shoe)}
                        className="p-1 text-[#8B8179] hover:text-[#D94B45] rounded-md hover:bg-[#FDF0EF] transition-colors cursor-pointer"
                        title={t("common.delete", "Delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Add Shoe Asset Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[#29221E] space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-lg font-bold text-[#29221E]">{t("shoes.addModalTitle", "Add New Skate Shoe")}</h3>
                  <p className="text-xs text-[#8B8179]">
                    {t("shoes.addModalSub", "Register a new shoe into the rental fleet")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddShoe} className="space-y-4">
                {/* Skate Type Selector (Inline vs Quads) */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1.5 uppercase tracking-wider">
                    {t("shoes.shoeTypeLabel", "Skate Type")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType("INLINE")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        newType === "INLINE"
                          ? "bg-[#D96827] text-white border-[#D96827] shadow-sm"
                          : "bg-white text-[#29221E] border-[#E9D9C5] hover:bg-[#FFF4E5]"
                      }`}
                    >
                      <Footprints className="h-4 w-4" />
                      <span>{t("common.inlineSkates", "Inline Skates")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType("QUAD")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        newType === "QUAD"
                          ? "bg-[#6D28D9] text-white border-[#6D28D9] shadow-sm"
                          : "bg-white text-[#29221E] border-[#E9D9C5] hover:bg-[#EDE9FE]"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{t("common.quads", "Quads")}</span>
                    </button>
                  </div>
                </div>

                {/* Shoe Size */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("shoes.shoeSizeLabel", "Shoe Size")}
                  </label>
                  <input
                    type="number"
                    required
                    min={26}
                    max={52}
                    value={newSize}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSize(val);
                      if (val) {
                        const sameSize = shoes.filter((s) => s.size === Number(val));
                        const nextNum = String(sameSize.length + 1).padStart(2, "0");
                        setNewShoeId(`SK-${val}-${nextNum}`);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                {/* Unique Shoe ID */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("shoes.shoeIdLabel", "Shoe Tag ID (Barcode)")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SK-40-05"
                    value={newShoeId}
                    onChange={(e) => setNewShoeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 uppercase font-mono font-bold"
                  />
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("common.notes", "Notes")} ({t("common.optional", "Optional")})
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brand, condition..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] rounded-xl cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl transition-colors cursor-pointer shadow-md shadow-[#D96827]/25"
                  >
                    {submitting ? t("common.loading", "Adding...") : t("shoes.addToFleet", "Add to Fleet")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Edit Shoe Asset Modal */}
        {editingShoe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-[#29221E] space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">{t("shoes.editModalTitle", "Edit Skate Shoe")}</h3>
                    <p className="text-xs text-[#8B8179]">{t("shoes.editModalSub", "Update asset details")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingShoe(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditShoe} className="space-y-3.5">
                {/* Skate Type */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("shoes.shoeTypeLabel", "Skate Type")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditType("INLINE")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        editType === "INLINE"
                          ? "bg-[#29221E] text-white border-[#29221E] shadow-2xs"
                          : "bg-[#F7F6F3] text-[#8B8179] border-[#E9D9C5] hover:text-[#29221E]"
                      }`}
                    >
                      {t("common.inlineSkates", "Inline Skates")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType("QUAD")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        editType === "QUAD"
                          ? "bg-[#D96827] text-white border-[#D96827] shadow-2xs"
                          : "bg-[#F7F6F3] text-[#8B8179] border-[#E9D9C5] hover:text-[#29221E]"
                      }`}
                    >
                      {t("common.quads", "Quads")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      {t("shoes.shoeIdLabel", "Shoe ID Tag")}
                    </label>
                    <input
                      type="text"
                      required
                      value={editShoeId}
                      onChange={(e) => setEditShoeId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono font-bold text-[#29221E] uppercase focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      {t("shoes.shoeSizeLabel", "Shoe Size")}
                    </label>
                    <select
                      value={editSize}
                      onChange={(e) => setEditSize(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    >
                      {Array.from({ length: 18 }, (_, i) => 30 + i).map((sz) => (
                        <option key={sz} value={sz}>
                          {t("common.size", "Size")} #{sz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("common.status", "Status")}
                  </label>
                  {editingShoe?.status === "RENTED" ? (
                    <div className="p-2.5 rounded-xl bg-[#FFF4E5] border border-[#D96827]/40 text-xs text-[#D96827] font-semibold">
                      ⏱ {t("shoes.rentedLockedNotice", "This shoe is currently out on an active rental session. Status cannot be changed manually here.")}
                    </div>
                  ) : (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as ShoeStatus)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs font-semibold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                    >
                      <option value="AVAILABLE">{t("common.available", "Available")}</option>
                      <option value="MAINTENANCE">{t("shoes.maintStat", "Maintenance")}</option>
                      <option value="RETIRED">{t("shoes.retired", "Retired")}</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    {t("common.notes", "Notes")} ({t("common.optional", "Optional")})
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Brand, condition..."
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E9D9C5] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingShoe(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    {editSubmitting ? t("common.loading", "Saving...") : t("common.saveChanges", "Save Changes")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. Delete Shoe Modal */}
        {shoeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#29221E]">{t("shoes.deleteModalTitle", "Delete Skate Shoe?")}</h3>
                  <p className="text-xs text-[#8B8179]">{t("shoes.deleteModalSub", "This permanently deletes this shoe asset.")}</p>
                </div>
              </div>

              <div className="bg-[#F7F6F3] p-3 rounded-xl border border-[#E9D9C5] my-3 text-xs space-y-1">
                <div className="font-bold text-[#29221E]">
                  {t("shoes.shoeIdLabel", "Shoe Tag")}: {shoeToDelete.shoeId}
                </div>
                <div className="text-[11px] text-[#8B8179]">
                  {t("common.size", "Size")} #{shoeToDelete.size} • {shoeToDelete.type === "QUAD" ? t("common.quads", "Quads") : t("common.inlineSkates", "Inline Skates")}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                <button
                  type="button"
                  onClick={() => setShoeToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={deletingShoe}
                  onClick={handleDeleteShoe}
                  className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {deletingShoe ? t("common.loading", "Deleting...") : t("common.delete", "Confirm Delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
