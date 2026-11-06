"use client";

import { useEffect, useState, useMemo } from "react";
import { ShoeStatus, SkateType } from "@/models/Shoe";
import { useAlertModal } from "@/components/ModalAlertProvider";
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
        title: "Shoe ID Required",
        message: "Please enter a unique Shoe ID barcode or tag.",
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
          title: "Shoe Asset Registered",
          message: `${newType === "QUAD" ? "Quads" : "Inline Skates"} ${newShoeId.toUpperCase()} (Size #${newSize}) added to inventory.`,
          type: "success",
        });
        fetchShoes();
      } else {
        const err = await res.json();
        showAlert({
          title: "Registration Failed",
          message: err.error || "Failed to add shoe asset",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Network error while saving shoe asset",
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
          title: "Status Update Failed",
          message: err.error || "Could not update status",
          type: "error",
        });
      }
    } catch (e) {
      console.error(e);
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
                Skate Shoe Asset Inventory
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#8B8179]">
              Asset registry & live tracking for Inline Skates & Quads across commercial shoe sizes.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchShoes}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
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
              Add Skate Shoe
            </button>
          </div>
        </div>

        {/* 1. Status Highlights Cards (Zero-Overflow on Mobile) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
          {/* Available Card */}
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "AVAILABLE" ? "ALL" : "AVAILABLE")}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between shadow-2xs cursor-pointer overflow-hidden ${
              selectedStatus === "AVAILABLE"
                ? "bg-[#EBF5F0] border-[#26845B] ring-2 ring-inset ring-[#26845B]"
                : "bg-[#EBF5F0]/80 border-[#26845B]/30 hover:bg-[#EBF5F0] hover:border-[#26845B]/60"
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[10px] sm:text-xs text-[#26845B] uppercase font-bold tracking-tight sm:tracking-wider truncate block">
                Available
              </span>
              <p className="text-xl sm:text-3xl font-black text-[#26845B] leading-tight">
                {availableCount}
              </p>
            </div>
            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/80 border border-[#26845B]/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-[#26845B]" />
            </div>
          </button>

          {/* Rented (Active) Card */}
          <button
            type="button"
            onClick={() => setSelectedStatus(selectedStatus === "RENTED" ? "ALL" : "RENTED")}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between shadow-2xs cursor-pointer overflow-hidden ${
              selectedStatus === "RENTED"
                ? "bg-[#FFF4E5] border-[#D96827] ring-2 ring-inset ring-[#D96827]"
                : "bg-[#FFF4E5]/80 border-[#D96827]/30 hover:bg-[#FFF4E5] hover:border-[#D96827]/60"
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[10px] sm:text-xs text-[#D96827] uppercase font-bold tracking-tight sm:tracking-wider truncate block">
                <span className="sm:hidden">Rented</span>
                <span className="hidden sm:inline">Rented (Active)</span>
              </span>
              <p className="text-xl sm:text-3xl font-black text-[#D96827] leading-tight">
                {rentedCount}
              </p>
            </div>
            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/80 border border-[#D96827]/20 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#D96827]" />
            </div>
          </button>

          {/* Maintenance Card */}
          <button
            type="button"
            onClick={() =>
              setSelectedStatus(selectedStatus === "MAINTENANCE" ? "ALL" : "MAINTENANCE")
            }
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left flex items-center justify-between shadow-2xs cursor-pointer overflow-hidden ${
              selectedStatus === "MAINTENANCE"
                ? "bg-[#FDF0EF] border-[#D94B45] ring-2 ring-inset ring-[#D94B45]"
                : "bg-[#FDF0EF]/80 border-[#D94B45]/30 hover:bg-[#FDF0EF] hover:border-[#D94B45]/60"
            }`}
          >
            <div className="min-w-0 pr-1">
              <span className="text-[10px] sm:text-xs text-[#D94B45] uppercase font-bold tracking-tight sm:tracking-wider truncate block">
                <span className="sm:hidden">Maint</span>
                <span className="hidden sm:inline">Maintenance</span>
              </span>
              <p className="text-xl sm:text-3xl font-black text-[#D94B45] leading-tight">
                {maintenanceCount}
              </p>
            </div>
            <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/80 border border-[#D94B45]/20 flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-[#D94B45]" />
            </div>
          </button>
        </div>

        {/* 2. Collapsible Filter & Search Panel */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl shadow-2xs overflow-hidden transition-all">
          {/* Header Bar with Toggle (Removed orange badge per request) */}
          <div className="p-3 sm:p-4 flex items-center justify-between gap-3 border-b border-[#E9D9C5]/60 bg-[#FAF9F6]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#D96827]" />
              <span className="text-xs font-bold text-[#29221E] uppercase tracking-wider">
                Filter Shoes
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-semibold text-[#8B8179] hover:text-[#D94B45] transition-colors cursor-pointer mr-1"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E9D9C5] text-[#29221E] hover:bg-[#FFF4E5] transition-colors cursor-pointer shadow-2xs"
              >
                <span>{filtersOpen ? "Collapse" : "Open Filters"}</span>
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
                    placeholder="Search Shoe ID, size, or notes..."
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
                    Type:
                  </span>
                  <div className="grid grid-cols-3 gap-1 w-full">
                    {[
                      { id: "ALL", label: "All Types" },
                      { id: "INLINE", label: "Inline" },
                      { id: "QUAD", label: "Quads" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedType(t.id)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-center truncate ${
                          selectedType === t.id
                            ? "bg-[#29221E] text-white font-bold shadow-2xs"
                            : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="sm:col-span-12 lg:col-span-3 flex items-center gap-1.5">
                  <span className="text-xs text-[#8B8179] font-semibold whitespace-nowrap">
                    Status:
                  </span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-white border border-[#E9D9C5] rounded-xl text-xs font-semibold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 cursor-pointer"
                  >
                    <option value="ALL">All Statuses ({shoes.length})</option>
                    <option value="AVAILABLE">Available ({availableCount})</option>
                    <option value="RENTED">Rented ({rentedCount})</option>
                    <option value="MAINTENANCE">Maintenance ({maintenanceCount})</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Shoe Size Pills (Horizontal scrollable with whitespace-nowrap) */}
              <div className="pt-2 border-t border-[#E9D9C5]/50">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  <span className="text-xs text-[#8B8179] font-semibold mr-1 whitespace-nowrap">
                    Sizes:
                  </span>

                  {/* All Sizes button */}
                  <button
                    type="button"
                    onClick={() => setSelectedSize("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      selectedSize === "ALL"
                        ? "bg-[#D96827] text-white font-bold shadow-2xs"
                        : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                    }`}
                  >
                    All ({shoes.length})
                  </button>

                  {/* Individual size buttons */}
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
                        Size {size} ({availForSize}/{totalForSize})
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
            Showing <strong className="text-[#29221E]">{filteredShoes.length}</strong> of{" "}
            {shoes.length} total shoes
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-[#D96827] hover:underline font-semibold cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* 3. Shoe Asset Cards Grid (Removed color chips per request) */}
        {filteredShoes.length === 0 ? (
          <div className="p-8 text-center bg-white border border-[#E9D9C5] rounded-2xl shadow-2xs space-y-2">
            <Footprints className="h-8 w-8 text-[#8B8179] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#29221E]">No Skate Shoes Match Current Filters</h4>
            <p className="text-xs text-[#8B8179]">
              Try adjusting your size, status, or type selection.
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 bg-[#D96827] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Reset Filters
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
                        {shoe.status === "MAINTENANCE" ? "Maint" : shoe.status}
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
                        {shoeType === "QUAD" ? "Quads" : "Inline Skates"}
                      </span>
                    </div>

                    {shoe.notes && (
                      <p className="text-[10px] text-[#8B8179] truncate pt-0.5" title={shoe.notes}>
                        {shoe.notes}
                      </p>
                    )}
                  </div>

                  {/* Quick Status Dropdown Changer */}
                  <div className="mt-3 pt-2 border-t border-[#E9D9C5]/60">
                    <select
                      value={shoe.status}
                      onChange={(e) =>
                        handleStatusChange(shoe._id, e.target.value as ShoeStatus)
                      }
                      className="w-full py-1.5 px-2 bg-white border border-[#E9D9C5] rounded-xl text-[11px] font-bold text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 cursor-pointer shadow-2xs"
                    >
                      <option value="AVAILABLE">✓ Available</option>
                      <option value="RENTED">⏱ Rented</option>
                      <option value="MAINTENANCE">🔧 Maintenance</option>
                      <option value="RETIRED">⛔ Retired</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Add Shoe Asset Modal (No colors) */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[#29221E] space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-lg font-bold text-[#29221E]">Add Skate Shoe Asset</h3>
                  <p className="text-xs text-[#8B8179]">
                    Register a new physical skate shoe into the rental fleet.
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
                    Skate Type
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
                      <span>Inline Skates</span>
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
                      <span>Quads</span>
                    </button>
                  </div>
                </div>

                {/* Shoe Size */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Shoe Size (Commercial #)
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
                    Unique Shoe ID (Barcode / Asset Tag)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SK-40-05"
                    value={newShoeId}
                    onChange={(e) => setNewShoeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 uppercase font-mono font-bold"
                  />
                  <span className="text-[10px] text-[#8B8179] mt-0.5 block">
                    Must be unique across all shoe sizes.
                  </span>
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brand, wheel hardness, condition..."
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl transition-colors cursor-pointer shadow-md shadow-[#D96827]/25"
                  >
                    {submitting ? "Adding..." : "Add to Fleet"}
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
