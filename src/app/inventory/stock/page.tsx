"use client";

import { useEffect, useState } from "react";
import { formatETB } from "@/lib/utils";
import { ProductCategory } from "@/models/Product";
import {
  Package,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  ShoppingBag,
} from "lucide-react";

interface ProductItem {
  _id: string;
  name: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockAlert: number;
}

export default function StockInventoryPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("BEVERAGE");
  const [costPrice, setCostPrice] = useState("30");
  const [sellingPrice, setSellingPrice] = useState("45");
  const [currentStock, setCurrentStock] = useState("24");
  const [minStockAlert, setMinStockAlert] = useState("8");
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          currentStock: Number(currentStock),
          minStockAlert: Number(minStockAlert),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName("");
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add product");
      }
    } catch {
      alert("Error adding product");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter === "ALL") return true;
    return p.category === categoryFilter;
  });

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockAlert).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Snacks & Beverages Stock Control
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Concession inventory with low-stock warnings and real-time sales deduction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors shadow-lg shadow-cyan-600/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Low Stock Alert Banner if any */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">Low Stock Warning:</span> {lowStockCount} items have reached or fallen below their minimum replenishment threshold!
            </div>
          </div>
        )}

        {/* Categories Tab */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          {(["ALL", "BEVERAGE", "SNACK", "OTHER"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? "bg-cyan-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              {cat === "ALL" ? "All Items" : cat === "BEVERAGE" ? "Drinks & Water" : "Snacks & Food"}
            </button>
          ))}
        </div>

        {/* Products Table */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Cost Price</th>
                  <th className="px-6 py-3">Selling Price</th>
                  <th className="px-6 py-3">Profit Margin</th>
                  <th className="px-6 py-3">Current Stock</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  const profit = p.sellingPrice - p.costPrice;
                  return (
                    <tr key={p._id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">
                        {p.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-400 text-xs">
                        {formatETB(p.costPrice)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-xs">
                        {formatETB(p.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                        +{formatETB(profit)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        <span className={isLow ? "text-rose-400" : "text-white"}>
                          {p.currentStock} units
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          Alert min: {p.minStockAlert}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1">Add Concession Product</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Register a new snack or soft drink item into the inventory catalog.
              </p>

              <form onSubmit={handleAddProduct} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mirinda Apple 500ml"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none"
                  >
                    <option value="BEVERAGE">Beverage (Soft Drink / Water)</option>
                    <option value="SNACK">Snack (Chips / Biscuits)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Cost Price (ETB)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Selling Price (ETB)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Initial Stock Qty</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Min. Alert Level</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
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
                    className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Add Product"}
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
