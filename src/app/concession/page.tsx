"use client";

import { useEffect, useState, useMemo } from "react";
import { formatETB, format12HourTime } from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import { useLanguage } from "@/lib/i18n";
import { ProductCategory } from "@/models/Product";
import { subDays, startOfMonth, format } from "date-fns";
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
  Clock,
  Pencil,
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
  skateType?: string;
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
  items: {
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  createdAt: string;
}

type HistoryPeriod = "today" | "yesterday" | "7days" | "month" | "custom" | "all";

export default function ConcessionPage() {
  const { showAlert } = useAlertModal();
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"POS" | "HISTORY">("POS");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeSkaters, setActiveSkaters] = useState<ActiveSkater[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("today");
  const [historyStartDate, setHistoryStartDate] = useState<string>("");
  const [historyEndDate, setHistoryEndDate] = useState<string>("");
  const [historySearch, setHistorySearch] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<"TAB" | "WALK_IN">("WALK_IN");
  const [paymentTiming, setPaymentTiming] = useState<"PAY_NOW" | "PAY_LATER">("PAY_NOW");
  const [selectedSkaterId, setSelectedSkaterId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [submitting, setSubmitting] = useState(false);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<SaleRecordItem | null>(null);

  // Void/Delete Sale Confirmation
  const [saleToDelete, setSaleToDelete] = useState<SaleRecordItem | null>(null);
  const [deletingSale, setDeletingSale] = useState(false);

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState<SaleRecordItem | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<"CASH" | "TELEBIRR" | "CBE">("CASH");
  const [editPaymentStatus, setEditPaymentStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [editItems, setEditItems] = useState<{ productId?: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[]>([]);
  const [editSaleSubmitting, setEditSaleSubmitting] = useState(false);

  const openEditSale = (sale: SaleRecordItem) => {
    setEditingSale(sale);
    setEditPaymentMethod(sale.paymentMethod || "CASH");
    setEditPaymentStatus(sale.paymentStatus);
    setEditItems(
      sale.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal || i.quantity * i.unitPrice,
      }))
    );
  };

  const updateEditItemQty = (index: number, delta: number) => {
    setEditItems((prev) => {
      const updated = [...prev];
      const newQty = Math.max(1, updated[index].quantity + delta);
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        subtotal: newQty * updated[index].unitPrice,
      };
      return updated;
    });
  };

  const editTotalAmount = useMemo(() => {
    return editItems.reduce((acc, item) => acc + item.subtotal, 0);
  }, [editItems]);

  const handleEditSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    setEditSaleSubmitting(true);
    try {
      const res = await fetch("/api/concession/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSale._id,
          paymentMethod: editPaymentMethod,
          paymentStatus: editPaymentStatus,
          items: editItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });

      if (res.ok) {
        showAlert({
          title: t("common.success", "Success"),
          message: t("concession.orderSuccess", "Order recorded successfully!"),
          type: "success",
        });
        setEditingSale(null);
        fetchHistory();
        fetchData();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || "Failed to update sale",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setEditSaleSubmitting(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    setDeletingSale(true);
    try {
      const res = await fetch(`/api/concession/sales?id=${saleToDelete._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSaleToDelete(null);
        showAlert({
          title: t("concession.voidOrder", "Order Voided"),
          message: t("concession.voidModalDesc", "Product stock will be returned to inventory."),
          type: "success",
        });
        fetchHistory();
        fetchData();
      } else {
        const err = await res.json();
        showAlert({
          title: t("common.error", "Error"),
          message: err.error || "Failed to void sale",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: t("common.error", "Error"),
        message: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setDeletingSale(false);
    }
  };

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
      const params = new URLSearchParams();
      if (historyStatusFilter !== "ALL") {
        params.set("paymentStatus", historyStatusFilter);
      }
      if (historySearch.trim()) {
        params.set("search", historySearch.trim());
      }

      const now = new Date();
      if (historyPeriod === "today") {
        const todayStr = format(now, "yyyy-MM-dd");
        params.set("startDate", todayStr);
        params.set("endDate", todayStr);
      } else if (historyPeriod === "yesterday") {
        const yStr = format(subDays(now, 1), "yyyy-MM-dd");
        params.set("startDate", yStr);
        params.set("endDate", yStr);
      } else if (historyPeriod === "7days") {
        params.set("startDate", format(subDays(now, 7), "yyyy-MM-dd"));
        params.set("endDate", format(now, "yyyy-MM-dd"));
      } else if (historyPeriod === "month") {
        params.set("startDate", format(startOfMonth(now), "yyyy-MM-dd"));
        params.set("endDate", format(now, "yyyy-MM-dd"));
      } else if (historyPeriod === "custom") {
        if (historyStartDate) params.set("startDate", historyStartDate);
        if (historyEndDate) params.set("endDate", historyEndDate);
      }

      const res = await fetch(`/api/concession/sales?${params.toString()}`);
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
  }, [activeTab, historyPeriod, historyStatusFilter]);

  // Cart operations
  const addToCart = (product: ProductItem) => {
    if (product.currentStock <= 0) {
      showAlert({
        title: "Out of Stock",
        message: `${product.name} is currently out of stock.`,
        type: "warning",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          showAlert({
            title: "Stock Limit",
            message: `Only ${product.currentStock} units available for ${product.name}.`,
            type: "warning",
          });
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
              showAlert({
                title: "Stock Limit",
                message: `Maximum available inventory is ${item.product.currentStock} units.`,
                type: "warning",
              });
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

  const paidSalesCount = useMemo(
    () => salesHistory.filter((s) => s.paymentStatus === "PAID").length,
    [salesHistory]
  );
  const openTabsCount = useMemo(
    () => salesHistory.filter((s) => s.paymentStatus === "UNPAID").length,
    [salesHistory]
  );

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    const standard = ["BEVERAGE", "SNACK"];
    standard.forEach((s) => {
      if (!cats.includes(s)) cats.push(s);
    });
    return ["ALL", ...cats];
  }, [products]);

  const filteredSalesHistory = useMemo(() => {
    if (historyStatusFilter === "PAID") {
      return salesHistory.filter((s) => s.paymentStatus === "PAID");
    }
    if (historyStatusFilter === "UNPAID") {
      return salesHistory.filter((s) => s.paymentStatus === "UNPAID");
    }
    return salesHistory;
  }, [salesHistory, historyStatusFilter]);

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (saleType === "TAB" && !selectedSkaterId) {
      showAlert({
        title: "Skater Required",
        message: "Please select an active skater shoe ID to attach this order.",
        type: "warning",
      });
      return;
    }

    setSubmitting(true);

    try {
      const selectedSkater = activeSkaters.find((s) => s._id === selectedSkaterId);
      const isPayNow = paymentTiming === "PAY_NOW" || saleType === "WALK_IN";

      const res = await fetch("/api/concession/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleType,
          rentalSessionId: saleType === "TAB" ? selectedSkaterId : undefined,
          shoeId: saleType === "TAB" ? selectedSkater?.shoeId : undefined,
          items: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
          paymentStatus: isPayNow ? "PAID" : "UNPAID",
          paymentMethod: isPayNow ? paymentMethod : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCompletedSale(data.sale);
        clearCart();
        fetchData();
      } else {
        showAlert({
          title: "Order Failed",
          message: data.error || "Failed to process sale.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Network error occurred during checkout.",
        type: "error",
      });
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
                {t("concession.title", "Shop & Snacks")}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                {t("nav.pos", "Shop")}
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#8B8179]">
              {t("concession.subtitle", "Quick counter sales and skater tab charges")}
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
                <span>{t("concession.newOrderTab", "New Sale")}</span>
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
                <span>{t("concession.salesHistoryTab", "Sales History")}</span>
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
              <span className="hidden sm:inline">{t("common.refresh", "Refresh")}</span>
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin whitespace-nowrap">
                  {dynamicCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        categoryFilter === cat
                          ? "bg-[#D96827] text-white font-bold shadow-sm"
                          : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                      }`}
                    >
                      {cat === "ALL"
                        ? t("concession.allCategories", "All Items")
                        : cat === "BEVERAGE"
                        ? (lang === "am" ? "መጠጥ እና ውሃ" : "Drinks & Water")
                        : cat === "SNACK"
                        ? (lang === "am" ? "መክሰስ እና ምግብ" : "Snacks & Food")
                        : cat.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8B8179]" />
                  <input
                    type="text"
                    placeholder={t("concession.searchProduct", "Search snacks, drinks...")}
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
                    <div
                      key={product._id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative select-none min-h-[125px] ${
                        isOutOfStock
                          ? "bg-[#F7F6F3] border-[#E9D9C5] opacity-40 cursor-not-allowed"
                          : inCart
                          ? "bg-[#FFF4E5]/50 border-2 border-[#D96827] shadow-sm cursor-pointer"
                          : "bg-white border-[#E9D9C5] hover:border-[#D96827]/60 hover:shadow-sm cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-[#29221E] line-clamp-2 leading-tight">
                            {product.name}
                          </span>
                          {inCart && (
                            <div
                              className="shrink-0 flex items-center gap-1 bg-white p-0.5 rounded-full border border-[#D96827] shadow-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => updateQuantity(product._id, -1)}
                                className="h-5 w-5 rounded-full bg-[#FDF0EF] hover:bg-[#D94B45] text-[#D94B45] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Decrease or remove"
                              >
                                <Minus className="h-3 w-3 stroke-[2.5]" />
                              </button>
                              <span className="font-mono font-bold text-[11px] text-[#D96827] px-1 min-w-[16px] text-center">
                                {inCart.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                className="h-5 w-5 rounded-full bg-[#FFF4E5] hover:bg-[#D96827] text-[#D96827] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Add one more"
                              >
                                <Plus className="h-3 w-3 stroke-[2.5]" />
                              </button>
                            </div>
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
                          {isOutOfStock ? t("concession.outOfStock", "Out of stock") : `${product.currentStock} ${t("concession.leftInStock", "left")}`}
                        </span>
                      </div>
                    </div>
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
                      <h2 className="text-sm sm:text-base font-bold text-[#29221E]">{t("concession.cartTitle", "Current Order")}</h2>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-xs font-semibold text-[#8B8179] hover:text-[#D94B45] transition-colors cursor-pointer"
                      >
                        {t("concession.clearCart", "Clear Order")}
                      </button>
                    )}
                  </div>

                  {/* Billing Mode Toggle: Skater vs Counter */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-[#8B8179] uppercase tracking-wider mb-1.5">
                      {t("concession.destination", "Charge To:")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSaleType("WALK_IN");
                          setPaymentTiming("PAY_NOW");
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          saleType === "WALK_IN"
                            ? "bg-[#D96827] text-white font-bold shadow-sm"
                            : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                        }`}
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>{t("concession.walkInCustomer", "Walk-in Counter")}</span>
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
                        <span>{t("concession.skaterTab", "Skater Shoe Tab")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Skater Selection for Skater Orders */}
                  {saleType === "TAB" && (
                    <div className="mb-3 p-3 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-xs">
                      <label className="block text-[10px] font-bold text-[#D96827] uppercase mb-1">
                        {t("concession.selectActiveSkater", "Select Active Skater")}
                      </label>
                      {activeSkaters.length === 0 ? (
                        <p className="text-[#8B8179] text-xs">
                          {t("rentals.noActiveSessions", "No skaters currently active.")}
                        </p>
                      ) : (
                        <select
                          value={selectedSkaterId}
                          onChange={(e) => setSelectedSkaterId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                        >
                          {activeSkaters.map((s) => {
                            const hasRealName =
                              s.customerName &&
                              !s.customerName.toLowerCase().includes("walk-in") &&
                              s.customerName.trim().length > 0;
                            const typeLabel = s.skateType === "QUAD" ? t("common.quads", "Quads") : t("common.inline", "Inline");
                            const label = hasRealName
                              ? `${s.shoeId} (${t("common.size", "Size")} #${s.shoeSize} • ${typeLabel}) — ${s.customerName}`
                              : `${s.shoeId} (${t("common.size", "Size")} #${s.shoeSize} • ${typeLabel})`;

                            return (
                              <option key={s._id} value={s._id}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Payment Timing: Pay Now vs Pay Later (Tab) */}
                  {saleType === "TAB" && (
                    <div className="mb-3">
                      <label className="block text-[10px] font-semibold text-[#8B8179] uppercase mb-1">
                        {t("concession.paymentTiming", "Payment Timing:")}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentTiming("PAY_NOW")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            paymentTiming === "PAY_NOW"
                              ? "bg-[#26845B] text-white shadow-sm"
                              : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{t("concession.payNow", "Pay Now")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentTiming("PAY_LATER")}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            paymentTiming === "PAY_LATER"
                              ? "bg-[#D96827] text-white shadow-sm"
                              : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>{t("concession.payLater", "Pay Later (Add to Tab)")}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#E9D9C5] my-2 pr-1">
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-[#8B8179] text-xs">
                        {t("concession.cartEmpty", "Your order is empty. Click items to add.")}
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
                              {formatETB(item.product.sellingPrice)}
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
                    <span className="text-xs uppercase font-bold text-[#8B8179]">{t("common.total", "Total")}</span>
                    <span className="text-xl sm:text-2xl font-black text-[#D96827] font-mono">
                      {formatETB(totalAmount)}
                    </span>
                  </div>

                  {/* Payment method selector when paying now */}
                  {(saleType === "WALK_IN" || paymentTiming === "PAY_NOW") && cart.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8B8179] uppercase mb-1">
                        {t("expenses.channel", "Payment Method")}
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
                            {method === "CASH" ? t("common.cash", "Cash") : method === "TELEBIRR" ? t("common.telebirr", "Telebirr") : t("common.cbe", "CBE")}
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
                      ? t("common.loading", "Recording...")
                      : `${t("concession.checkoutButton", "Charge & Complete")} (${formatETB(totalAmount)})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: CONCESSION SALES HISTORY */
          <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E9D9C5] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#29221E]">{t("concession.salesHistoryTab", "Sales History")}</h3>
                  <p className="text-xs text-[#8B8179]">{t("concession.subtitle", "All recent snack and drink orders")}</p>
                </div>

                {/* Status Filter Tabs: All, Paid, Open Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-[#F7F6F3] rounded-xl border border-[#E9D9C5] text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setHistoryStatusFilter("ALL")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      historyStatusFilter === "ALL"
                        ? "bg-white text-[#29221E] shadow-xs"
                        : "text-[#8B8179] hover:text-[#29221E]"
                    }`}
                  >
                    {t("common.all", "All")} ({salesHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryStatusFilter("PAID")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      historyStatusFilter === "PAID"
                        ? "bg-[#26845B] text-white shadow-xs"
                        : "text-[#8B8179] hover:text-[#26845B]"
                    }`}
                  >
                    {t("concession.paid", "PAID")} ({paidSalesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryStatusFilter("UNPAID")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      historyStatusFilter === "UNPAID"
                        ? "bg-[#D96827] text-white shadow-xs"
                        : "text-[#8B8179] hover:text-[#D96827]"
                    }`}
                  >
                    {t("concession.openTab", "OPEN TAB")} ({openTabsCount})
                  </button>
                </div>
              </div>

              {/* Date Period Filter Pills & Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-[#E9D9C5]/60">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {(
                    [
                      { id: "today", label: lang === "am" ? "ዛሬ" : "Today" },
                      { id: "yesterday", label: lang === "am" ? "ትናንት" : "Yesterday" },
                      { id: "7days", label: lang === "am" ? "7 ቀናት" : "7 Days" },
                      { id: "month", label: lang === "am" ? "ይህ ወር" : "This Month" },
                      { id: "custom", label: t("concession.customRange", "Custom Range") },
                      { id: "all", label: t("reports.allTime", "All Time") },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setHistoryPeriod(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        historyPeriod === p.id
                          ? "bg-[#D96827] text-white shadow-xs"
                          : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B8179]" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fetchHistory();
                      }}
                      placeholder={t("concession.searchProduct", "Search items, shoe #...")}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] focus:outline-none focus:border-[#D96827]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchHistory}
                    className="p-1.5 rounded-xl border border-[#E9D9C5] bg-white text-[#8B8179] hover:text-[#D96827] cursor-pointer"
                    title={t("common.refresh", "Refresh")}
                  >
                    <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin text-[#D96827]" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Custom Date Inputs if selected */}
              {historyPeriod === "custom" && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#8B8179]">{t("concession.startDate", "Start")}:</span>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] text-xs focus:outline-none focus:border-[#D96827]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#8B8179]">{t("concession.endDate", "End")}:</span>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-[#E9D9C5] bg-[#F7F6F3] text-[#29221E] text-xs focus:outline-none focus:border-[#D96827]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchHistory}
                    className="px-3 py-1 rounded-lg bg-[#D96827] text-white font-bold text-xs cursor-pointer hover:bg-[#C2571A]"
                  >
                    {t("concession.applyFilter", "Apply Filter")}
                  </button>
                </div>
              )}
            </div>

            {historyLoading ? (
              <div className="p-12 text-center text-[#8B8179]">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#D96827]" />
                <p className="text-xs">{t("common.loading", "Loading...")}</p>
              </div>
            ) : filteredSalesHistory.length === 0 ? (
              <div className="p-12 text-center text-[#8B8179]">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#D96827]" />
                <p className="text-xs">
                  {historyStatusFilter === "ALL"
                    ? (lang === "am" ? "ዛሬ እስካሁን የተመዘገበ ሽያጭ የለም" : "No sales recorded yet today.")
                    : (lang === "am" ? "ምንም የተገኘ መረጃ የለም" : "No matching sales found.")}
                </p>
              </div>
            ) : (
              <div>
                {/* 1. Mobile Card View */}
                <div className="md:hidden divide-y divide-[#E9D9C5]">
                  {filteredSalesHistory.map((sale) => (
                    <div key={sale._id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {sale.saleType === "TAB" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFF4E5] text-[#D96827] font-bold text-xs border border-[#E9D9C5]">
                                <Footprints className="h-3 w-3" />
                                {t("shoes.title", "Shoe")} {sale.shoeId || "Tab"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F7F6F3] text-[#29221E] font-bold text-xs border border-[#E9D9C5]">
                                <User className="h-3 w-3" />
                                {t("concession.walkInCustomer", "Counter Sale")}
                              </span>
                            )}
                            <span className="text-[11px] text-[#8B8179] font-mono">
                              {format12HourTime(sale.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-black text-sm text-[#29221E]">
                            {formatETB(sale.totalAmount)}
                          </div>
                          {sale.paymentStatus === "PAID" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30 inline-block mt-0.5">
                              {t("concession.paid", "PAID")} ({sale.paymentMethod || "CASH"})
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5] inline-block mt-0.5">
                              {t("concession.openTab", "OPEN TAB")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-[#8B8179] bg-[#F7F6F3] p-2 rounded-xl border border-[#E9D9C5]/60 flex-1">
                          {sale.items.map((i, idx) => (
                            <span key={idx} className="mr-2 inline-block">
                              <strong>{i.quantity}x</strong> {i.productName}
                              {idx < sale.items.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditSale(sale)}
                            className="p-2 text-[#8B8179] hover:text-[#D96827] rounded-xl hover:bg-[#FFF4E5] transition-colors cursor-pointer"
                            title={t("common.edit", "Edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaleToDelete(sale)}
                            className="p-2 text-[#8B8179] hover:text-[#D94B45] rounded-xl hover:bg-[#FDF0EF] transition-colors cursor-pointer"
                            title={t("concession.voidOrder", "Void Order")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F6F3] uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                      <tr>
                        <th className="px-5 py-3">{t("common.time", "Time")}</th>
                        <th className="px-5 py-3">{t("concession.destinationLabel", "Destination")}</th>
                        <th className="px-5 py-3">{t("concession.itemsSold", "Items Sold")}</th>
                        <th className="px-5 py-3">{t("common.total", "Total")}</th>
                        <th className="px-5 py-3">{t("expenses.channel", "Payment")}</th>
                        <th className="px-4 py-3 text-center">{t("common.action", "Action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9D9C5]">
                      {filteredSalesHistory.map((sale) => (
                        <tr key={sale._id} className="hover:bg-[#FFF4E5]/30 transition-colors">
                          <td className="px-5 py-3 text-[#8B8179] font-mono">
                            {format12HourTime(sale.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            {sale.saleType === "TAB" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] font-semibold border border-[#E9D9C5]">
                                <Footprints className="h-3 w-3" />
                                {t("shoes.title", "Shoe")} {sale.shoeId || "Tab"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F7F6F3] text-[#29221E] font-semibold border border-[#E9D9C5]">
                                <User className="h-3 w-3" />
                                {t("concession.walkInCustomer", "Counter Sale")}
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
                                {t("concession.paid", "PAID")} ({sale.paymentMethod || "CASH"})
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                                {t("concession.openTab", "OPEN TAB")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditSale(sale)}
                                className="p-1.5 text-[#8B8179] hover:text-[#D96827] rounded-lg hover:bg-[#FFF4E5] transition-colors cursor-pointer"
                                title={t("common.edit", "Edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSaleToDelete(sale)}
                                className="p-1.5 text-[#8B8179] hover:text-[#D94B45] rounded-lg hover:bg-[#FDF0EF] transition-colors cursor-pointer"
                                title={t("concession.voidOrder", "Void Order")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. INSTANT RECEIPT MODAL UPON SALE COMPLETION */}
        {completedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              {/* Top Close Button (X to back) */}
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                title={t("common.close", "Close")}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center pb-3 border-b border-[#E9D9C5] pr-6">
                <div className="h-10 w-10 rounded-full bg-[#EBF5F0] text-[#26845B] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#29221E]">{t("concession.orderRecorded", "Order Recorded!")}</h3>
                <p className="text-xs text-[#8B8179]">
                  {completedSale.saleType === "TAB"
                    ? completedSale.paymentStatus === "PAID"
                      ? `${t("concession.paid", "PAID")} (#${completedSale.shoeId})`
                      : `${t("concession.openTab", "OPEN TAB")} (#${completedSale.shoeId})`
                    : `${t("concession.paid", "PAID")} (${completedSale.paymentMethod || "CASH"})`}
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
                  <span>{t("common.total", "Total")}:</span>
                  <span className="text-[#D96827] font-black">{formatETB(completedSale.totalAmount)}</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setCompletedSale(null)}
                  className="w-full py-2.5 px-4 bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  {t("common.done", "Done")} / {t("concession.newSale", "New Sale")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. VOID / DELETE SALE CONFIRMATION MODAL */}
        {saleToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#29221E]">{t("concession.voidModalTitle", "Void this Order?")}</h3>
                  <p className="text-xs text-[#8B8179]">{t("concession.voidModalDesc", "Product stock will be returned to inventory.")}</p>
                </div>
              </div>

              <div className="bg-[#F7F6F3] p-3 rounded-xl border border-[#E9D9C5] my-3 text-xs space-y-1">
                <div className="font-bold text-[#29221E]">
                  {t("common.total", "Total")}: {formatETB(saleToDelete.totalAmount)}
                </div>
                <div className="text-[11px] text-[#8B8179]">
                  {saleToDelete.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                <button
                  type="button"
                  onClick={() => setSaleToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={deletingSale}
                  onClick={handleDeleteSale}
                  className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {deletingSale ? t("common.loading", "Loading...") : t("concession.confirmVoid", "Confirm Void")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. EDIT SALE MODAL */}
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-base font-bold text-[#29221E]">
                    {t("concession.editSaleModalTitle", "Edit Sale Order")}
                  </h3>
                  <p className="text-xs text-[#8B8179]">
                    {editingSale.saleType === "TAB"
                      ? `${t("shoes.title", "Shoe")} #${editingSale.shoeId || "Tab"}`
                      : t("concession.walkInCustomer", "Counter Sale")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="p-1 rounded-lg text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSaleSubmit} className="space-y-4 pt-3 text-xs">
                {/* Payment Status */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("common.status", "Payment Status")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPaymentStatus("PAID")}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editPaymentStatus === "PAID"
                          ? "bg-[#26845B] text-white shadow-xs border-[#26845B]"
                          : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      {t("concession.paid", "PAID")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentStatus("UNPAID")}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editPaymentStatus === "UNPAID"
                          ? "bg-[#D96827] text-white shadow-xs border-[#D96827]"
                          : "bg-[#F7F6F3] border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      {t("concession.openTab", "OPEN TAB")}
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("expenses.channel", "Payment Method")}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["CASH", "TELEBIRR", "CBE"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setEditPaymentMethod(method)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          editPaymentMethod === method
                            ? "bg-[#D96827] text-white shadow-xs border-[#D96827]"
                            : "bg-[#F7F6F3] border-[#E9D9C5] text-[#29221E] hover:border-[#D96827]"
                        }`}
                      >
                        {method === "CASH"
                          ? t("common.cash", "Cash")
                          : method === "TELEBIRR"
                          ? t("common.telebirr", "Telebirr")
                          : t("common.cbe", "CBE")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items & Quantities */}
                <div>
                  <label className="block text-[11px] font-bold text-[#8B8179] uppercase mb-1">
                    {t("concession.updateStock", "Quantities & Stock")}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-[#E9D9C5]/60 pr-1">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="pt-2 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#29221E]">{item.productName}</div>
                          <div className="text-[11px] text-[#8B8179] font-mono">
                            {formatETB(item.unitPrice)} each
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-[#F7F6F3] border border-[#E9D9C5] rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateEditItemQty(idx, -1)}
                              className="p-1 text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-[#29221E] text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateEditItemQty(idx, 1)}
                              className="p-1 text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-mono font-bold text-[#D96827] w-14 text-right">
                            {formatETB(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotal Recalculation */}
                <div className="pt-3 border-t border-[#E9D9C5] flex items-center justify-between">
                  <span className="font-bold text-[#8B8179] uppercase text-xs">
                    {t("common.total", "Total")}:
                  </span>
                  <span className="text-xl font-mono font-black text-[#D96827]">
                    {formatETB(editTotalAmount)}
                  </span>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setEditingSale(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={editSaleSubmitting}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {editSaleSubmitting ? t("common.loading", "Saving...") : t("common.saveChanges", "Save Changes")}
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
