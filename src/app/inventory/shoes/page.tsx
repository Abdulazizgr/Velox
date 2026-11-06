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
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Footprints className="h-6 w-6 text-emerald-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Skate Shoe Asset Inventory
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Unique asset tracking by Shoe ID (e.g. SK-40-01) across commercial shoe sizes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchShoes}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Skate Shoe
            </button>
          </div>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 uppercase font-medium">Available</span>
              <p className="text-2xl font-extrabold text-emerald-400">{availableCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500/30" />
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 uppercase font-medium">Rented (On Rink)</span>
              <p className="text-2xl font-extrabold text-cyan-400">{rentedCount}</p>
            </div>
            <Clock className="h-8 w-8 text-cyan-500/30" />
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 uppercase font-medium">Maintenance / Repairs</span>
              <p className="text-2xl font-extrabold text-amber-400">{maintenanceCount}</p>
            </div>
            <Wrench className="h-8 w-8 text-amber-500/30" />
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          {/* Size Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <span className="text-xs text-zinc-500 flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" /> Size:
            </span>
            <button
              onClick={() => setSelectedSize("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedSize === "ALL"
                  ? "bg-emerald-500 text-zinc-950"
                  : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    selectedSize === size.toString()
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800"
                  }`}
                >
                  Size {size} ({avail}/{count})
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Shoe ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Shoes Grid / Table */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredShoes.map((shoe) => (
            <div
              key={shoe._id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                shoe.status === "AVAILABLE"
                  ? "bg-zinc-900/60 border-emerald-500/30 hover:border-emerald-500"
                  : shoe.status === "RENTED"
                  ? "bg-zinc-900/40 border-cyan-500/30 opacity-90"
                  : "bg-zinc-900/40 border-amber-500/30 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-black text-white">#{shoe.size}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      shoe.status === "AVAILABLE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : shoe.status === "RENTED"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {shoe.status}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-zinc-300">
                  {shoe.shoeId}
                </div>
                {shoe.notes && (
                  <p className="text-[11px] text-zinc-500 truncate mt-1">{shoe.notes}</p>
                )}
              </div>

              {/* Status Switcher */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <select
                  value={shoe.status}
                  onChange={(e) => handleStatusChange(shoe._id, e.target.value as ShoeStatus)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1">Add Skate Shoe Asset</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Register a new physical shoe into the rental fleet with a unique asset ID.
              </p>

              <form onSubmit={handleAddShoe} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Unique Shoe ID (Barcode / Tag)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SK-40-05"
                    value={newShoeId}
                    onChange={(e) => setNewShoeId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Shoe Size
                  </label>
                  <input
                    type="number"
                    required
                    min={28}
                    max={50}
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Color, Brand, Wheels type"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer"
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

