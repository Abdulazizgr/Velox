"use client";

import { useEffect, useState } from "react";
import { ShoeStatus } from "@/models/Shoe";
import {
  Footprints,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
} from "lucide-react";

interface ShoeItem {
  _id: string;
  shoeId: string;
  size: number;
  status: ShoeStatus;
  notes?: string;
  updatedAt: string;
}

export default function ShoesInventoryPage() {
  const [shoes, setShoes] = useState<ShoeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Add shoe form
  const [newShoeId, setNewShoeId] = useState("");
  const [newSize, setNewSize] = useState("40");
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shoeId: newShoeId.toUpperCase(),
          size: Number(newSize),
          notes: newNotes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewShoeId("");
        setNewNotes("");
        fetchShoes();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add shoe");
      }
    } catch {
      alert("Error adding shoe");
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredShoes = shoes.filter((shoe) => {
    const matchesSize = selectedSize === "ALL" || shoe.size.toString() === selectedSize;
    const matchesQuery =
      searchQuery === "" ||
      shoe.shoeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shoe.size.toString().includes(searchQuery);
    return matchesSize && matchesQuery;
  });

  const availableCount = shoes.filter((s) => s.status === "AVAILABLE").length;
  const rentedCount = shoes.filter((s) => s.status === "RENTED").length;
  const maintenanceCount = shoes.filter((s) => s.status === "MAINTENANCE").length;

  const allSizes = Array.from(new Set(shoes.map((s) => s.size))).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="h-6 w-6 text-[#D96827]" />
              <h1 className="text-2xl font-bold tracking-tight text-[#29221E]">
                Skate Shoe Asset Inventory
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#8B8179]">
              Unique asset tracking by Shoe ID (e.g. SK-40-01) across commercial shoe sizes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchShoes}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Skate Shoe
            </button>
          </div>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-[#E9D9C5] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-[#8B8179] uppercase font-semibold">Available</span>
              <p className="text-2xl font-black text-[#26845B]">{availableCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-[#26845B]/20" />
          </div>
          <div className="bg-white border border-[#E9D9C5] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-[#8B8179] uppercase font-semibold">Rented (Active)</span>
              <p className="text-2xl font-black text-[#D96827]">{rentedCount}</p>
            </div>
            <Clock className="h-8 w-8 text-[#D96827]/20" />
          </div>
          <div className="bg-white border border-[#E9D9C5] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs text-[#8B8179] uppercase font-semibold">Maintenance</span>
              <p className="text-2xl font-black text-[#D94B45]">{maintenanceCount}</p>
            </div>
            <Wrench className="h-8 w-8 text-[#D94B45]/20" />
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-[#E9D9C5] rounded-2xl p-4 shadow-sm">
          {/* Size Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <span className="text-xs text-[#8B8179] flex items-center gap-1 mr-1 font-semibold">
              <Filter className="h-3.5 w-3.5 text-[#D96827]" /> Size:
            </span>
            <button
              onClick={() => setSelectedSize("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                selectedSize === "ALL"
                  ? "bg-[#D96827] text-white font-bold shadow-sm"
                  : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
              }`}
            >
              All ({shoes.length})
            </button>
            {allSizes.map((size) => {
              const count = shoes.filter((s) => s.size === size).length;
              const avail = shoes.filter((s) => s.size === size && s.status === "AVAILABLE").length;
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size.toString())}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    selectedSize === size.toString()
                      ? "bg-[#D96827] text-white font-bold shadow-sm"
                      : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                  }`}
                >
                  Size {size} ({avail}/{count})
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B8179]" />
            <input
              type="text"
              placeholder="Search Shoe ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
            />
          </div>
        </div>

        {/* Shoes Grid / Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredShoes.map((shoe) => (
            <div
              key={shoe._id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between bg-white shadow-sm ${
                shoe.status === "AVAILABLE"
                  ? "border-[#E9D9C5] hover:border-[#26845B]"
                  : shoe.status === "RENTED"
                  ? "border-[#E9D9C5] bg-[#FFF4E5]/30"
                  : "border-[#E9D9C5] bg-[#FDF0EF]/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-black text-[#29221E]">#{shoe.size}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      shoe.status === "AVAILABLE"
                        ? "bg-[#EBF5F0] text-[#26845B] border-[#26845B]/30"
                        : shoe.status === "RENTED"
                        ? "bg-[#FFF4E5] text-[#D96827] border-[#E9D9C5]"
                        : "bg-[#FDF0EF] text-[#D94B45] border-[#D94B45]/30"
                    }`}
                  >
                    {shoe.status}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#29221E]">
                  {shoe.shoeId}
                </div>
                {shoe.notes && (
                  <p className="text-[11px] text-[#8B8179] truncate mt-1">{shoe.notes}</p>
                )}
              </div>

              {/* Status Switcher */}
              <div className="mt-3 pt-2.5 border-t border-[#E9D9C5] flex items-center justify-between text-[11px]">
                <select
                  value={shoe.status}
                  onChange={(e) => handleStatusChange(shoe._id, e.target.value as ShoeStatus)}
                  className="bg-[#F7F6F3] border border-[#E9D9C5] text-[#29221E] text-[11px] rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="RENTED">Rented</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Add Shoe Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[#29221E]">
              <h3 className="text-lg font-bold text-[#29221E] mb-1">Add Skate Shoe Asset</h3>
              <p className="text-xs text-[#8B8179] mb-4">
                Register a new physical shoe into the rental fleet with a unique asset ID.
              </p>

              <form onSubmit={handleAddShoe} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Unique Shoe ID (Barcode / Tag)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SK-40-05"
                    value={newShoeId}
                    onChange={(e) => setNewShoeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Shoe Size
                  </label>
                  <input
                    type="number"
                    required
                    min={28}
                    max={50}
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Color, Brand, Wheels type"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
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
                    className="px-4 py-2 text-xs font-bold bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl transition-colors cursor-pointer shadow-sm"
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

