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
      alert("Please select an active skater to charge their tab.");
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
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-[#D96827]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                Snacks & Drinks POS
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                Counter POS
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8B8179]">
              Charge snacks to active skater tabs or conduct instant walk-in sales. Stock decreases in real-time.
            </p>
          </div>

          {/* Tab Switcher: POS vs History */}
          <div className="flex items-center gap-2">
            <div className="flex bg-white border border-[#E9D9C5] rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("POS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "POS"
                    ? "bg-[#D96827] text-white shadow-sm"
                    : "text-[#8B8179] hover:text-[#29221E]"
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>POS Register</span>
              </button>

              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "HISTORY"
                    ? "bg-[#D96827] text-white shadow-sm"
                    : "text-[#8B8179] hover:text-[#29221E]"
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
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading || historyLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* TAB 1: POS REGISTER */}
        {activeTab === "POS" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Catalog Grid */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#E9D9C5] rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(["ALL", "BEVERAGE", "SNACK"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        categoryFilter === cat
                          ? "bg-[#D96827] text-white font-bold shadow-sm"
                          : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
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
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8B8179]" />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
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
                          ? "bg-[#F7F6F3] border-[#E9D9C5] opacity-40 cursor-not-allowed"
                          : inCart
                          ? "bg-[#FFF4E5]/50 border-2 border-[#D96827] shadow-sm"
                          : "bg-white border-[#E9D9C5] hover:border-[#D96827]/60 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-[#29221E] line-clamp-2 leading-tight">
                            {product.name}
                          </span>
                          {inCart && (
                            <span className="shrink-0 h-5 w-5 rounded-full bg-[#D96827] text-white font-black text-[10px] flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8B8179] uppercase font-semibold">
                          {product.category}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#E9D9C5] flex items-baseline justify-between">
                        <span className="text-sm font-black text-[#D96827] font-mono">
                          {formatETB(product.sellingPrice)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            isOutOfStock
                              ? "text-[#D94B45]"
                              : isLowStock
                              ? "text-[#D94B45] font-bold"
                              : "text-[#8B8179]"
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

            {/* POS Cart Sidebar */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-16">
              <div className="bg-white border border-[#E9D9C5] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between text-[#29221E]">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5] mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-[#D96827]" />
                      <h2 className="text-sm sm:text-base font-bold text-[#29221E]">Current Order</h2>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-xs font-semibold text-[#8B8179] hover:text-[#D94B45] transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Billing Mode Toggle: Skater Tab vs Walk-in */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-[#8B8179] uppercase tracking-wider mb-1.5">
                      Destination / Bill Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSaleType("WALK_IN")}
                        className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          saleType === "WALK_IN"
                            ? "bg-[#D96827] text-white font-bold shadow-sm"
                            : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
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
                            ? "bg-[#29221E] text-white font-bold shadow-sm"
                            : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                        }`}
                      >
                        <Footprints className="h-3.5 w-3.5" />
                        <span>Skater&apos;s Tab</span>
                      </button>
                    </div>
                  </div>

                  {/* Skater Selection for TAB sales */}
                  {saleType === "TAB" && (
                    <div className="mb-3 p-3 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-xs">
                      <label className="block text-[10px] font-bold text-[#D96827] uppercase mb-1">
                        Select Skater (Active Shoe ID)
                      </label>
                      {activeSkaters.length === 0 ? (
                        <p className="text-[#8B8179] text-xs">
                          No skaters currently active. Switch to Walk-in to sell.
                        </p>
                      ) : (
                        <select
                          value={selectedSkaterId}
                          onChange={(e) => setSelectedSkaterId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                        >
                          {activeSkaters.map((s) => (
                            <option key={s._id} value={s._id}>
                              Shoe {s.shoeId} (Size #{s.shoeSize}) — {s.customerName}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="text-[10px] text-[#8B8179] mt-1 italic">
                        *Will be paid when customer returns their shoes at checkout.
                      </p>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#E9D9C5] my-2 pr-1">
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-[#8B8179] text-xs">
                        Order is empty. Tap items to add.
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.product._id}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div className="overflow-hidden pr-2">
                            <div className="font-semibold text-[#29221E] truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-[#8B8179] font-mono">
                              {formatETB(item.product.sellingPrice)} each
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1 bg-[#F7F6F3] border border-[#E9D9C5] rounded-lg p-0.5">
                              <button
                                onClick={() => updateQuantity(item.product._id, -1)}
                                className="p-1 text-[#8B8179] hover:text-[#29221E]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-[#29221E] text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product._id, 1)}
                                className="p-1 text-[#8B8179] hover:text-[#29221E]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="font-mono font-bold text-[#D96827] w-16 text-right">
                              {formatETB(item.product.sellingPrice * item.quantity)}
                            </span>

                            <button
                              onClick={() => removeFromCart(item.product._id)}
                              className="p-1 text-[#8B8179] hover:text-[#D94B45]"
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
                <div className="pt-3 border-t border-[#E9D9C5] mt-2 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase font-bold text-[#8B8179]">Total Due</span>
                    <span className="text-xl sm:text-2xl font-black text-[#D96827] font-mono">
                      {formatETB(totalAmount)}
                    </span>
                  </div>

                  {/* Payment method selector for Walk-in */}
                  {saleType === "WALK_IN" && cart.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8B8179] uppercase mb-1">
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
                                ? "bg-[#D96827] text-white shadow-sm"
                                : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
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
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#D96827]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-[#D96827] hover:bg-[#C2571A] text-white"
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
          <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E9D9C5] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#29221E]">Concession Transaction Log</h3>
                <p className="text-xs text-[#8B8179]">All recent snack and drink orders</p>
              </div>
              <span className="text-xs text-[#8B8179]">Total: {salesHistory.length} orders</span>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center text-[#8B8179]">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#D96827]" />
                <p className="text-xs">Loading sales history...</p>
              </div>
            ) : salesHistory.length === 0 ? (
              <div className="p-12 text-center text-[#8B8179]">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#D96827]" />
                <p className="text-xs">No sales recorded yet today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                    <tr>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Type / Destination</th>
                      <th className="px-5 py-3">Items Sold</th>
                      <th className="px-5 py-3">Total Amount</th>
                      <th className="px-5 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9D9C5]">
                    {salesHistory.map((sale) => (
                      <tr key={sale._id} className="hover:bg-[#FFF4E5]/30 transition-colors">
                        <td className="px-5 py-3 text-[#8B8179] font-mono">
                          {new Date(sale.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          {sale.saleType === "TAB" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] font-semibold border border-[#E9D9C5]">
                              <Footprints className="h-3 w-3" />
                              Shoe {sale.shoeId || "Tab"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F7F6F3] text-[#29221E] font-semibold border border-[#E9D9C5]">
                              <User className="h-3 w-3" />
                              Walk-in Sale
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#29221E]">
                          {sale.items.map((i, idx) => (
                            <span key={idx} className="mr-2">
                              {i.quantity}x {i.productName}
                              {idx < sale.items.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-[#29221E]">
                          {formatETB(sale.totalAmount)}
                        </td>
                        <td className="px-5 py-3">
                          {sale.paymentStatus === "PAID" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                              PAID ({sale.paymentMethod || "CASH"})
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="text-center pb-3 border-b border-[#E9D9C5]">
                <div className="h-10 w-10 rounded-full bg-[#EBF5F0] text-[#26845B] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#29221E]">Order Recorded!</h3>
                <p className="text-xs text-[#8B8179]">
                  {completedSale.saleType === "TAB"
                    ? `Charged to Shoe ${completedSale.shoeId}'s Tab`
                    : `Settled via ${completedSale.paymentMethod || "CASH"}`}
                </p>
              </div>

              {/* Receipt Item List */}
              <div className="py-3 space-y-2 text-xs border-b border-[#E9D9C5] font-mono">
                {completedSale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-[#29221E]">
                    <span>
                      {i.quantity}x {i.productName}
                    </span>
                    <span>{formatETB(i.subtotal)}</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-[#E9D9C5] flex justify-between font-bold text-sm text-[#29221E]">
                  <span>Total Amount:</span>
                  <span className="text-[#D96827] font-black">{formatETB(completedSale.totalAmount)}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCompletedSale(null)}
                  className="w-full py-2.5 px-4 bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
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
