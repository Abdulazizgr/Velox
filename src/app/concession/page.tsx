"use client";

import { useEffect, useState, useMemo } from "react";
import { formatETB } from "@/lib/utils";
import { ProductCategory } from "@/models/Product";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  User,
  Footprints,
  Receipt,
  X,
  Printer,
  History,
  Tag,
  ArrowRight,
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

interface ActiveSkater {
  _id: string;
  shoeId: string;
  shoeSize: number;
  customerName: string;
  startedAt: string;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

interface SaleRecordItem {
  _id: string;
  shoeId?: string;
  saleType: "TAB" | "WALK_IN";
  totalAmount: number;
  paymentStatus: "PAID" | "UNPAID";
  paymentMethod?: "CASH" | "TELEBIRR" | "CBE";
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  createdAt: string;
}

export default function ConcessionPage() {
  const [activeTab, setActiveTab] = useState<"POS" | "HISTORY">("POS");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeSkaters, setActiveSkaters] = useState<ActiveSkater[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<"TAB" | "WALK_IN">("WALK_IN");
  const [selectedSkaterId, setSelectedSkaterId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [submitting, setSubmitting] = useState(false);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<SaleRecordItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, rentRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/rentals?status=ACTIVE"),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (rentRes.ok) {
        const rentData = await rentRes.json();
        const skaters = rentData.sessions || [];
        setActiveSkaters(skaters);
        if (skaters.length > 0 && !selectedSkaterId) {
          setSelectedSkaterId(skaters[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/concession/sales");
      if (res.ok) {
        const data = await res.json();
        setSalesHistory(data.sales || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "HISTORY") {
      fetchHistory();
    }
  }, [activeTab]);

  // Cart operations
  const addToCart = (product: ProductItem) => {
    if (product.currentStock <= 0) {
      alert("This item is currently out of stock!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          alert(`Cannot add more. Only ${product.currentStock} units available in inventory.`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.currentStock) {
              alert(`Maximum available stock is ${item.product.currentStock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => setCart([]);

  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (saleType === "TAB" && !selectedSkaterId) {
      alert("Please select an active skater from the rink to charge their tab.");
      return;
    }

    setSubmitting(true);

    try {
      const selectedSkater = activeSkaters.find((s) => s._id === selectedSkaterId);
      const res = await fetch("/api/concession/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleType,
          rentalSessionId: saleType === "TAB" ? selectedSkaterId : undefined,
          shoeId: saleType === "TAB" ? selectedSkater?.shoeId : undefined,
          items: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
          paymentMethod: saleType === "WALK_IN" ? paymentMethod : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCompletedSale(data.sale);
        clearCart();
        fetchData();
      } else {
        alert(data.error || "Failed to process sale");
      }
    } catch {
      alert("Network error during checkout");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === "ALL" || p.category === categoryFilter;
      const matchesQuery =
        searchQuery === "" || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, categoryFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-cyan-400" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Snacks & Drinks POS
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Phase 3
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-400">
              Charge snacks to active skater tabs or conduct instant walk-in sales. Stock decreases in real-time.
            </p>
          </div>

          {/* Tab Switcher: POS vs History */}
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("POS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "POS"
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>POS Register</span>
              </button>

              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "HISTORY"
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Sales Log</span>
              </button>
            </div>

            <button
              onClick={() => {
                fetchData();
                if (activeTab === "HISTORY") fetchHistory();
              }}
              disabled={loading || historyLoading}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading || historyLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* TAB 1: POS REGISTER */}
        {activeTab === "POS" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Catalog Grid (7 Columns on desktop) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {(["ALL", "BEVERAGE", "SNACK"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        categoryFilter === cat
                          ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                          : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {cat === "ALL"
                        ? "All Items"
                        : cat === "BEVERAGE"
                        ? "Drinks & Water"
                        : "Snacks & Food"}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.currentStock <= 0;
                  const isLowStock =
                    product.currentStock > 0 && product.currentStock <= product.minStockAlert;
                  const inCart = cart.find((i) => i.product._id === product._id);

                  return (
                    <button
                      key={product._id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer select-none min-h-[125px] ${
                        isOutOfStock
                          ? "bg-zinc-950 border-zinc-900 opacity-40 cursor-not-allowed"
                          : inCart
                          ? "bg-cyan-950/25 border-cyan-500 shadow-md shadow-cyan-950/20"
                          : "bg-zinc-900/80 border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                            {product.name}
                          </span>
                          {inCart && (
                            <span className="shrink-0 h-5 w-5 rounded-full bg-cyan-500 text-zinc-950 font-black text-[10px] flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase font-medium">
                          {product.category}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
                        <span className="text-sm font-extrabold text-cyan-400 font-mono">
                          {formatETB(product.sellingPrice)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            isOutOfStock
                              ? "text-rose-500"
                              : isLowStock
                              ? "text-amber-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {isOutOfStock ? "Out of stock" : `${product.currentStock} left`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* POS Cart Sidebar (5 Columns on desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-16">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-sm sm:text-base font-bold text-white">Current Order</h2>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Billing Mode Toggle: Skater Tab vs Walk-in */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Destination / Bill Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSaleType("WALK_IN")}
                        className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          saleType === "WALK_IN"
                            ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>Walk-in</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSaleType("TAB")}
                        className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          saleType === "TAB"
                            ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Footprints className="h-3.5 w-3.5" />
                        <span>Skater&apos;s Tab</span>
                      </button>
                    </div>
                  </div>

                  {/* Skater Selection for TAB sales */}
                  {saleType === "TAB" && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                      <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">
                        Select Skater (Active Shoe ID)
                      </label>
                      {activeSkaters.length === 0 ? (
                        <p className="text-zinc-400 text-xs">
                          No skaters currently on the rink. Switch to Walk-in to sell.
                        </p>
                      ) : (
                        <select
                          value={selectedSkaterId}
                          onChange={(e) => setSelectedSkaterId(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {activeSkaters.map((s) => (
                            <option key={s._id} value={s._id}>
                              Shoe {s.shoeId} (Size #{s.shoeSize}) — {s.customerName}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="text-[10px] text-zinc-500 mt-1 italic">
                        *Will be paid when customer returns their shoes at checkout.
                      </p>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/80 my-2 pr-1">
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 text-xs">
                        Order is empty. Tap items to add.
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.product._id}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div className="overflow-hidden pr-2">
                            <div className="font-semibold text-white truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {formatETB(item.product.sellingPrice)} each
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                              <button
                                onClick={() => updateQuantity(item.product._id, -1)}
                                className="p-1 text-zinc-400 hover:text-white"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-white text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product._id, 1)}
                                className="p-1 text-zinc-400 hover:text-white"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="font-mono font-bold text-cyan-400 w-16 text-right">
                              {formatETB(item.product.sellingPrice * item.quantity)}
                            </span>

                            <button
                              onClick={() => removeFromCart(item.product._id)}
                              className="p-1 text-zinc-500 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cart Footer */}
                <div className="pt-3 border-t border-zinc-800 mt-2 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase font-semibold text-zinc-400">Total Due</span>
                    <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                      {formatETB(totalAmount)}
                    </span>
                  </div>

                  {/* Payment method selector for Walk-in */}
                  {saleType === "WALK_IN" && cart.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">
                        Settlement Method
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              paymentMethod === method
                                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={
                      submitting || cart.length === 0 || (saleType === "TAB" && !selectedSkaterId)
                    }
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      saleType === "TAB"
                        ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
                        : "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-cyan-600/30"
                    }`}
                  >
                    {submitting
                      ? "Recording..."
                      : saleType === "TAB"
                      ? `Charge to Tab (${formatETB(totalAmount)})`
                      : `Settle Walk-in (${formatETB(totalAmount)})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: CONCESSION SALES HISTORY */
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Concession Transaction Log</h3>
                <p className="text-xs text-zinc-400">All recent snack and drink orders</p>
              </div>
              <span className="text-xs text-zinc-400">Total: {salesHistory.length} orders</span>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center text-zinc-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading sales history...</p>
              </div>
            ) : salesHistory.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No sales recorded yet today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/60 uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Type / Destination</th>
                      <th className="px-5 py-3">Items Sold</th>
                      <th className="px-5 py-3">Total Amount</th>
                      <th className="px-5 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {salesHistory.map((sale) => (
                      <tr key={sale._id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3 text-zinc-400 font-mono">
                          {new Date(sale.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          {sale.saleType === "TAB" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                              <Footprints className="h-3 w-3" />
                              Shoe {sale.shoeId || "Tab"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20">
                              <User className="h-3 w-3" />
                              Walk-in Sale
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-zinc-300">
                          {sale.items.map((i, idx) => (
                            <span key={idx} className="mr-2">
                              {i.quantity}x {i.productName}
                              {idx < sale.items.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-white">
                          {formatETB(sale.totalAmount)}
                        </td>
                        <td className="px-5 py-3">
                          {sale.paymentStatus === "PAID" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              PAID ({sale.paymentMethod || "CASH"})
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              OPEN TAB
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. INSTANT RECEIPT MODAL UPON SALE COMPLETION */}
        {completedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto animate-fade-in">
              <div className="text-center pb-3 border-b border-zinc-800">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">Order Recorded!</h3>
                <p className="text-xs text-zinc-400">
                  {completedSale.saleType === "TAB"
                    ? `Charged to Shoe ${completedSale.shoeId}'s Tab`
                    : `Settled via ${completedSale.paymentMethod || "CASH"}`}
                </p>
              </div>

              {/* Receipt Item List */}
              <div className="py-3 space-y-2 text-xs border-b border-zinc-800 font-mono">
                {completedSale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-300">
                    <span>
                      {i.quantity}x {i.productName}
                    </span>
                    <span>{formatETB(i.subtotal)}</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-zinc-800/80 flex justify-between font-bold text-sm text-white">
                  <span>Total Amount:</span>
                  <span className="text-emerald-400">{formatETB(completedSale.totalAmount)}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCompletedSale(null)}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Done / Next Order
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
