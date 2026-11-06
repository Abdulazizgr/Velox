"use client";

import { useEffect, useState, useMemo } from "react";
import { formatETB, exportToCSV } from "@/lib/utils";
import { useAlertModal } from "@/components/ModalAlertProvider";
import {
  Package,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Search,
  SlidersHorizontal,
  PlusCircle,
  FolderPlus,
  Tag,
  ArrowRight,
  X,
} from "lucide-react";

interface ProductItem {
  _id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockAlert: number;
}

interface CategoryItem {
  _id?: string;
  name: string;
  displayName: string;
}

export default function StockInventoryPage() {
  const { showAlert } = useAlertModal();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewTab, setViewTab] = useState<"ALL" | "LOW_STOCK">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Add New Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("SNACK");
  const [customNewCategory, setCustomNewCategory] = useState("");
  const [isCreatingInlineCat, setIsCreatingInlineCat] = useState(false);
  const [costPrice, setCostPrice] = useState("30");
  const [sellingPrice, setSellingPrice] = useState("45");
  const [currentStock, setCurrentStock] = useState("24");
  const [minStockAlert, setMinStockAlert] = useState("8");
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // 2. Add Stock Modal State
  const [restockProduct, setRestockProduct] = useState<ProductItem | null>(null);
  const [restockQty, setRestockQty] = useState<string>("12");
  const [restockCostPrice, setRestockCostPrice] = useState<string>("");
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // 3. Stock Adjustment Modal State
  const [adjustProduct, setAdjustProduct] = useState<ProductItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<"SET_COUNT" | "DEDUCT">("SET_COUNT");
  const [adjustTargetCount, setAdjustTargetCount] = useState<string>("");
  const [adjustDeductCount, setAdjustDeductCount] = useState<string>("1");
  const [adjustReason, setAdjustReason] = useState<string>("Physical Inventory Count");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // 4. Create Category Modal State
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [submittingCat, setSubmittingCat] = useState(false);

  // Data fetching
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

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Compute merged list of categories from API and distinct product categories
  const allCategoryList = useMemo(() => {
    const map = new Map<string, string>();
    // Pre-populate standard defaults
    map.set("BEVERAGE", "Drinks & Water");
    map.set("SNACK", "Snacks & Food");
    map.set("OTHER", "Other Items");

    // Add API categories
    categories.forEach((c) => {
      map.set(c.name, c.displayName || c.name);
    });

    // Add any category directly from products
    products.forEach((p) => {
      if (p.category && !map.has(p.category)) {
        map.set(p.category, p.category.replace(/_/g, " "));
      }
    });

    return Array.from(map.entries()).map(([name, displayName]) => ({
      name,
      displayName,
    }));
  }, [categories, products]);

  // Handle New Product Creation
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmittingProduct(true);
    try {
      let finalCategory = category;
      // If user typed an inline custom category
      if (isCreatingInlineCat && customNewCategory.trim()) {
        const catRes = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customNewCategory.trim() }),
        });
        if (catRes.ok) {
          const catData = await catRes.json();
          finalCategory = catData.category.name;
          fetchCategories();
        }
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: finalCategory,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          currentStock: Number(currentStock) || 0,
          minStockAlert: Number(minStockAlert) || 5,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName("");
        setCustomNewCategory("");
        setIsCreatingInlineCat(false);
        showAlert({
          title: "Product Registered",
          message: `${name.trim()} has been registered in the catalog.`,
          type: "success",
        });
        fetchProducts();
      } else {
        const err = await res.json();
        showAlert({
          title: "Failed to Add Product",
          message: err.error || "Please verify input fields.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Handle Create Standalone Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmittingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateCategoryModal(false);
        setNewCatName("");
        setCategoryFilter(data.category.name);
        showAlert({
          title: "Category Created",
          message: `Category "${data.category.displayName}" added successfully.`,
          type: "success",
        });
        fetchCategories();
      } else {
        const err = await res.json();
        showAlert({
          title: "Failed to Create Category",
          message: err.error || "Could not save category.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Could not reach server.",
        type: "error",
      });
    } finally {
      setSubmittingCat(false);
    }
  };

  // Handle Add Stock (Restock) Submission
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const qty = Number(restockQty);
    if (isNaN(qty) || qty <= 0) {
      showAlert({
        title: "Invalid Quantity",
        message: "Please enter a valid stock addition quantity (> 0).",
        type: "warning",
      });
      return;
    }

    setRestockSubmitting(true);
    try {
      const payload: { addStock: number; costPrice?: number } = { addStock: qty };
      if (restockCostPrice && !isNaN(Number(restockCostPrice))) {
        payload.costPrice = Number(restockCostPrice);
      }

      const res = await fetch(`/api/products/${restockProduct._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        showAlert({
          title: "Stock Added",
          message: `Added +${qty} units to ${restockProduct.name}. New total: ${updated.product.currentStock} units.`,
          type: "success",
        });
        setRestockProduct(null);
        fetchProducts();
      } else {
        const err = await res.json();
        showAlert({
          title: "Restock Failed",
          message: err.error || "Could not update stock.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Network error while restocking product.",
        type: "error",
      });
    } finally {
      setRestockSubmitting(false);
    }
  };

  // Handle Inventory Adjustment Submission
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;

    let targetStock = adjustProduct.currentStock;

    if (adjustMode === "SET_COUNT") {
      const val = Number(adjustTargetCount);
      if (isNaN(val) || val < 0) {
        showAlert({
          title: "Invalid Count",
          message: "Please enter a valid non-negative physical count.",
          type: "warning",
        });
        return;
      }
      targetStock = val;
    } else {
      const deduct = Number(adjustDeductCount);
      if (isNaN(deduct) || deduct <= 0) {
        showAlert({
          title: "Invalid Deduction",
          message: "Please enter units to deduct (> 0).",
          type: "warning",
        });
        return;
      }
      targetStock = Math.max(0, adjustProduct.currentStock - deduct);
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch(`/api/products/${adjustProduct._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: targetStock }),
      });

      if (res.ok) {
        const updated = await res.json();
        showAlert({
          title: "Inventory Adjusted",
          message: `${adjustProduct.name} stock updated to ${updated.product.currentStock} units (${adjustReason}).`,
          type: "success",
        });
        setAdjustProduct(null);
        fetchProducts();
      } else {
        const err = await res.json();
        showAlert({
          title: "Adjustment Failed",
          message: err.error || "Could not adjust stock.",
          type: "error",
        });
      }
    } catch {
      showAlert({
        title: "Connection Error",
        message: "Network error while saving adjustment.",
        type: "error",
      });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Filtered Products computation
  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentStock <= p.minStockAlert).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Low stock tab filter
      if (viewTab === "LOW_STOCK" && p.currentStock > p.minStockAlert) {
        return false;
      }

      // 2. Category filter
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      return true;
    });
  }, [products, viewTab, categoryFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] pb-28 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-[#D96827]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#29221E]">
                Snacks & Beverages Stock Control
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#8B8179]">
              Concession inventory catalog, stock replenishment, and inventory adjustments.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#F7F6F3] transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateCategoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#29221E] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#FFF4E5] transition-colors shadow-2xs cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5 text-[#D96827]" />
              + Category
            </button>
            <button
              onClick={() => {
                setName("");
                setCostPrice("30");
                setSellingPrice("45");
                setCurrentStock("24");
                setMinStockAlert("8");
                setIsCreatingInlineCat(false);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#D96827] hover:bg-[#C2571A] rounded-xl transition-all shadow-md shadow-[#D96827]/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              + Add New Product
            </button>
          </div>
        </div>

        {/* 1. Low Stock Quick Tab & View Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewTab("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewTab === "ALL"
                ? "bg-[#29221E] text-white shadow-xs"
                : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
            }`}
          >
            <span>All Catalog</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab("LOW_STOCK")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewTab === "LOW_STOCK"
                ? "bg-[#D94B45] text-white shadow-xs"
                : lowStockCount > 0
                ? "bg-[#FDF0EF] text-[#D94B45] border border-[#D94B45]/40 hover:bg-[#FBE4E2]"
                : "bg-white text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Low Stock</span>
            {lowStockCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white text-[#D94B45] font-black font-mono">
                {lowStockCount}
              </span>
            )}
          </button>
        </div>

        {/* 2. Scrollable Category Pills Bar & Search Box */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-3 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Horizontal Scrollable Categories Container */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin whitespace-nowrap pb-1.5 pt-0.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === "ALL"
                    ? "bg-[#D96827] text-white font-bold shadow-2xs"
                    : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                }`}
              >
                All Categories ({products.length})
              </button>

              {allCategoryList.map((cat) => {
                const count = products.filter((p) => p.category === cat.name).length;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategoryFilter(cat.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      categoryFilter === cat.name
                        ? "bg-[#D96827] text-white font-bold shadow-2xs"
                        : "bg-[#F7F6F3] text-[#8B8179] hover:text-[#29221E] border border-[#E9D9C5]"
                    }`}
                  >
                    {cat.displayName} ({count})
                  </button>
                );
              })}

              {/* Quick + Add Category pill at the end of the scroll list */}
              <button
                type="button"
                onClick={() => setShowCreateCategoryModal(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#D96827] bg-[#FFF4E5] hover:bg-[#FFE8CC] border border-[#D96827]/40 cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                title="Create a new custom category"
              >
                <Plus className="h-3 w-3" />
                <span>New Category</span>
              </button>
            </div>

            {/* Search Box & CSV Export */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8B8179]" />
                <input
                  type="text"
                  placeholder="Search product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-[#8B8179] hover:text-[#29221E]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {filteredProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    exportToCSV(
                      "Velox_Stock_Inventory",
                      [
                        "Product Name",
                        "Category",
                        "Cost Price",
                        "Selling Price",
                        "Profit Margin",
                        "Current Stock",
                        "Alert Level",
                      ],
                      filteredProducts.map((p) => [
                        p.name,
                        p.category,
                        p.costPrice,
                        p.sellingPrice,
                        p.sellingPrice - p.costPrice,
                        p.currentStock,
                        p.minStockAlert,
                      ])
                    )
                  }
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white border border-[#E9D9C5] text-xs font-semibold text-[#29221E] hover:text-[#D96827] hover:bg-[#FFF4E5] transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Export to CSV"
                >
                  <Download className="h-3.5 w-3.5 text-[#D96827]" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Products List / Cards with Restock & Adjust Buttons */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E9D9C5] rounded-2xl p-8 text-center space-y-2 shadow-2xs">
            <Package className="h-8 w-8 text-[#8B8179] mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-[#29221E]">No Products Match Current Criteria</h4>
            <p className="text-xs text-[#8B8179]">
              {viewTab === "LOW_STOCK"
                ? "Great news! There are no products currently at or below their low-stock replenishment alert level."
                : "Try clearing your category or search query."}
            </p>
            {viewTab === "LOW_STOCK" && (
              <button
                type="button"
                onClick={() => setViewTab("ALL")}
                className="mt-2 px-4 py-2 bg-[#D96827] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                View All Products
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-2xs">
            {/* Mobile Card View (md:hidden) */}
            <div className="md:hidden divide-y divide-[#E9D9C5]">
              {filteredProducts.map((p) => {
                const isLow = p.currentStock <= p.minStockAlert;
                const profit = p.sellingPrice - p.costPrice;
                return (
                  <div key={p._id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-[#29221E] leading-snug">{p.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5] font-semibold mt-1 inline-block">
                          {p.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div>
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#D94B45] font-bold bg-[#FDF0EF] px-2 py-0.5 rounded-lg border border-[#D94B45]/30">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#26845B] font-semibold bg-[#EBF5F0] px-2 py-0.5 rounded-lg border border-[#26845B]/30">
                            <CheckCircle2 className="h-3 w-3" /> In Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-[#F7F6F3] p-2 rounded-xl border border-[#E9D9C5]/60 font-mono">
                      <div>
                        <span className="text-[10px] text-[#8B8179] block font-sans">Selling:</span>
                        <strong className="text-[#D96827]">{formatETB(p.sellingPrice)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8B8179] block font-sans">Cost:</span>
                        <span className="text-[#8B8179]">{formatETB(p.costPrice)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8B8179] block font-sans">Margin:</span>
                        <span className="text-[#26845B] font-bold">+{formatETB(profit)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                      <span className="text-[#8B8179] font-sans">Available Units:</span>
                      <span className={`font-bold ${isLow ? "text-[#D94B45]" : "text-[#29221E]"}`}>
                        {p.currentStock} units{" "}
                        <span className="text-[10px] text-[#8B8179] font-normal">
                          (alert at {p.minStockAlert})
                        </span>
                      </span>
                    </div>

                    {/* Action Buttons on Mobile Card: + Add Stock & Adjust */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#E9D9C5]/50">
                      <button
                        type="button"
                        onClick={() => {
                          setRestockProduct(p);
                          setRestockQty("12");
                          setRestockCostPrice(p.costPrice.toString());
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#EBF5F0] text-[#26845B] hover:bg-[#D5EFE3] font-bold text-xs border border-[#26845B]/30 cursor-pointer transition-colors shadow-2xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>+ Add Stock</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAdjustProduct(p);
                          setAdjustMode("SET_COUNT");
                          setAdjustTargetCount(p.currentStock.toString());
                          setAdjustDeductCount("1");
                          setAdjustReason("Physical Inventory Count");
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F7F6F3] text-[#29221E] hover:bg-[#E9D9C5]/50 font-semibold text-xs border border-[#E9D9C5] cursor-pointer transition-colors shadow-2xs"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-[#8B8179]" />
                        <span>Adjust</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F7F6F3] text-xs uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                  <tr>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Cost Price</th>
                    <th className="px-4 py-3">Selling Price</th>
                    <th className="px-4 py-3">Profit Margin</th>
                    <th className="px-4 py-3">Current Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9D9C5]">
                  {filteredProducts.map((p) => {
                    const isLow = p.currentStock <= p.minStockAlert;
                    const profit = p.sellingPrice - p.costPrice;
                    return (
                      <tr key={p._id} className="hover:bg-[#FFF4E5]/20 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-[#29221E]">{p.name}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5] font-semibold">
                            {p.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[#8B8179] text-xs">
                          {formatETB(p.costPrice)}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-black text-[#D96827] text-sm">
                          {formatETB(p.sellingPrice)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-[#26845B] font-bold">
                          +{formatETB(profit)}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold">
                          <span className={isLow ? "text-[#D94B45] font-black" : "text-[#29221E]"}>
                            {p.currentStock} units
                          </span>
                          <span className="text-[10px] text-[#8B8179] block font-sans">
                            Alert min: {p.minStockAlert}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-xs text-[#D94B45] font-bold">
                              <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-[#26845B] font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRestockProduct(p);
                                setRestockQty("12");
                                setRestockCostPrice(p.costPrice.toString());
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EBF5F0] text-[#26845B] hover:bg-[#D5EFE3] font-bold text-xs border border-[#26845B]/30 cursor-pointer transition-colors shadow-2xs"
                              title="Add more stock units for this product"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>+ Add Stock</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAdjustProduct(p);
                                setAdjustMode("SET_COUNT");
                                setAdjustTargetCount(p.currentStock.toString());
                                setAdjustDeductCount("1");
                                setAdjustReason("Physical Inventory Count");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F7F6F3] text-[#29221E] hover:bg-[#E9D9C5]/50 font-semibold text-xs border border-[#E9D9C5] cursor-pointer transition-colors shadow-2xs"
                              title="Stock adjustment (spoilage, breakage, count correction)"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-[#8B8179]" />
                              <span>Adjust</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL 1: ADD NEW PRODUCT MODAL ("add product is for new product") */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-[#29221E] relative my-auto">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <h3 className="text-lg font-bold text-[#29221E]">Register New Product</h3>
                  <p className="text-xs text-[#8B8179]">
                    Register a brand new item into the concession catalog.
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

              <form onSubmit={handleAddProduct} className="space-y-3.5 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sprite 500ml, Popcorn Large"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                  />
                </div>

                {/* Category Selection with Inline Create */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#29221E]">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingInlineCat(!isCreatingInlineCat)}
                      className="text-[11px] text-[#D96827] hover:underline font-bold cursor-pointer"
                    >
                      {isCreatingInlineCat ? "Choose existing" : "+ New Category"}
                    </button>
                  </div>

                  {isCreatingInlineCat ? (
                    <input
                      type="text"
                      required
                      placeholder="Type new category name (e.g. Ice Cream, Candy)..."
                      value={customNewCategory}
                      onChange={(e) => setCustomNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FFF4E5]/40 border border-[#D96827] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                    />
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 cursor-pointer"
                    >
                      {allCategoryList.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.displayName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Cost Price (ETB)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Selling Price (ETB)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 font-mono font-bold text-[#D96827]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Initial Stock (Units)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Min. Alert Level
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 font-mono"
                    />
                  </div>
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
                    disabled={submittingProduct}
                    className="px-4 py-2 text-xs font-bold bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl transition-colors cursor-pointer shadow-md shadow-[#D96827]/25"
                  >
                    {submittingProduct ? "Saving..." : "Register Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: ADD STOCK / RESTOCK MODAL */}
        {restockProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-[#29221E] relative my-auto">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#26845B] font-bold">
                    <PlusCircle className="h-4 w-4" />
                    <span>Restock Product</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E] mt-0.5">
                    {restockProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRestockSubmit} className="space-y-3.5 mt-3">
                {/* Current Stock Badge */}
                <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between text-xs">
                  <span className="text-[#8B8179]">Current Inventory:</span>
                  <strong className="text-sm font-mono text-[#29221E]">
                    {restockProduct.currentStock} units
                  </strong>
                </div>

                {/* Additional Units to Add */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Units to Add (+Qty)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#26845B]/30"
                  />
                  {/* Quick increment chips */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[6, 12, 24, 48].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setRestockQty(q.toString())}
                        className="px-2 py-1 rounded-lg bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30 text-xs font-mono font-bold cursor-pointer hover:bg-[#D5EFE3]"
                      >
                        +{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Calculation */}
                <div className="p-2.5 rounded-xl bg-[#EBF5F0] border border-[#26845B]/30 text-xs flex items-center justify-between font-mono">
                  <span className="text-[#26845B] font-semibold">New Total Stock:</span>
                  <strong className="text-[#26845B] text-sm">
                    {restockProduct.currentStock + (Number(restockQty) || 0)} units
                  </strong>
                </div>

                {/* Optional updated Cost Price */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Supplier Cost Price per Unit (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={restockCostPrice}
                    onChange={(e) => setRestockCostPrice(e.target.value)}
                    placeholder={`Current: ${restockProduct.costPrice} ETB`}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setRestockProduct(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={restockSubmitting}
                    className="px-4 py-2 text-xs font-bold bg-[#26845B] hover:bg-[#1E6B49] text-white rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    {restockSubmitting ? "Adding..." : "Confirm Stock Addition"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: INVENTORY ADJUSTMENT MODAL */}
        {adjustProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-[#29221E] relative my-auto">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8B8179] font-bold">
                    <SlidersHorizontal className="h-4 w-4 text-[#D96827]" />
                    <span>Inventory Adjustment</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E] mt-0.5">
                    {adjustProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustProduct(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-3.5 mt-3">
                {/* Current Stock */}
                <div className="p-2.5 rounded-xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between text-xs">
                  <span className="text-[#8B8179]">Current Stock on Record:</span>
                  <strong className="text-sm font-mono text-[#29221E]">
                    {adjustProduct.currentStock} units
                  </strong>
                </div>

                {/* Adjustment Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Adjustment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustMode("SET_COUNT")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        adjustMode === "SET_COUNT"
                          ? "bg-[#29221E] text-white border-[#29221E]"
                          : "bg-white text-[#8B8179] border-[#E9D9C5] hover:text-[#29221E]"
                      }`}
                    >
                      Set Actual Count
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode("DEDUCT")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        adjustMode === "DEDUCT"
                          ? "bg-[#D94B45] text-white border-[#D94B45]"
                          : "bg-white text-[#8B8179] border-[#E9D9C5] hover:text-[#29221E]"
                      }`}
                    >
                      Deduct Damaged / Lost
                    </button>
                  </div>
                </div>

                {adjustMode === "SET_COUNT" ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      New Physical Count (Units)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={adjustTargetCount}
                      onChange={(e) => setAdjustTargetCount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#29221E] mb-1">
                      Units to Deduct (-Qty)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={adjustProduct.currentStock}
                      value={adjustDeductCount}
                      onChange={(e) => setAdjustDeductCount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D94B45]/40 rounded-xl text-[#D94B45] text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D94B45]/30"
                    />
                  </div>
                )}

                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Audit Reason
                  </label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 cursor-pointer"
                  >
                    <option value="Physical Inventory Count">Physical Inventory Count</option>
                    <option value="Broken / Damaged Product">Broken / Damaged Bottle or Pack</option>
                    <option value="Expired / Spoilage">Expired / Spoilage</option>
                    <option value="Internal / Staff Consumption">Internal / Staff Consumption</option>
                    <option value="Entry Correction / Refund">Entry Correction / Mistake</option>
                    <option value="Loss / Unexplained Discrepancy">Other Discrepancy</option>
                  </select>
                </div>

                {/* Resulting Count Preview */}
                <div className="p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5] text-xs flex items-center justify-between font-mono">
                  <span className="text-[#8B8179]">Resulting Stock:</span>
                  <strong className="text-[#D96827] text-sm">
                    {adjustMode === "SET_COUNT"
                      ? `${Number(adjustTargetCount) || 0} units`
                      : `${Math.max(0, adjustProduct.currentStock - (Number(adjustDeductCount) || 0))} units`}
                  </strong>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setAdjustProduct(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustSubmitting}
                    className="px-4 py-2 text-xs font-bold bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    {adjustSubmitting ? "Applying..." : "Apply Adjustment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: CREATE STANDALONE CATEGORY MODAL */}
        {showCreateCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-[#29221E] relative my-auto">
              <div className="flex items-start justify-between pb-3 border-b border-[#E9D9C5]">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#D96827] font-bold">
                    <FolderPlus className="h-4 w-4" />
                    <span>Inventory Categories</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#29221E] mt-0.5">
                    Create New Category
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-3.5 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ice Cream, Fresh Juices, Pastries..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30"
                  />
                  <span className="text-[10px] text-[#8B8179] mt-1 block">
                    This category will immediately become available in POS, stock lists, and product forms.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setShowCreateCategoryModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCat}
                    className="px-4 py-2 text-xs font-bold bg-[#D96827] hover:bg-[#C2571A] text-white rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    {submittingCat ? "Creating..." : "Save Category"}
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
