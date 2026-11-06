import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  RentalSession,
  Sale,
  Expense,
  Shoe,
  Product,
  DailyRegister,
  MissedDemand,
  StockAdjustment,
} from "@/models";
import { getSession } from "@/lib/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "7days"; // "today" | "yesterday" | "7days" | "30days" | "all"

    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date = endOfDay(now);

    if (range === "today") {
      rangeStart = startOfDay(now);
    } else if (range === "yesterday") {
      rangeStart = startOfDay(subDays(now, 1));
      rangeEnd = endOfDay(subDays(now, 1));
    } else if (range === "30days") {
      rangeStart = startOfDay(subDays(now, 29));
    } else if (range === "all") {
      rangeStart = new Date(0);
    } else {
      // Default: 7days
      rangeStart = startOfDay(subDays(now, 6));
    }

    // 1. Fetch Rentals in Range
    const rentals = await RentalSession.find({
      startedAt: { $gte: rangeStart, $lte: rangeEnd },
      paymentStatus: "PAID",
    }).lean();

    // 2. Fetch Sales in Range
    const sales = await Sale.find({
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      paymentStatus: "PAID",
    }).lean();

    // 3. Fetch Expenses in Range
    const expenses = await Expense.find({
      date: { $gte: rangeStart, $lte: rangeEnd },
    }).lean();

    // 4. Fetch All Shoes Fleet
    const allShoes = await Shoe.find({}).lean();

    // 5. Fetch All Catalog Products
    const allProducts = await Product.find({}).lean();
    const productPriceMap: Record<string, { costPrice: number; sellingPrice: number; category: string }> = {};
    allProducts.forEach((p) => {
      productPriceMap[p.name] = {
        costPrice: p.costPrice || 0,
        sellingPrice: p.sellingPrice || 0,
        category: p.category || "OTHER",
      };
    });

    // 6. Fetch Missed Customer Demand in Range
    const missedDemandLogs = await MissedDemand.find({
      date: { $gte: rangeStart, $lte: rangeEnd },
    }).lean();

    // 7. Fetch Stock Adjustments / Shrinkage in Range
    const stockAdjustments = await StockAdjustment.find({
      date: { $gte: rangeStart, $lte: rangeEnd },
    }).sort({ date: -1 }).lean();

    // --- COMPUTATION 1: SHOE SIZE DEMAND & BOTTLENECK REPORT ---
    const sizeDemandMap: Record<number, { rentalsCount: number; revenue: number; inlineCount: number; quadCount: number }> = {};
    for (let s = 36; s <= 45; s++) {
      sizeDemandMap[s] = { rentalsCount: 0, revenue: 0, inlineCount: 0, quadCount: 0 };
    }

    rentals.forEach((r) => {
      const sz = r.shoeSize || 40;
      if (!sizeDemandMap[sz]) {
        sizeDemandMap[sz] = { rentalsCount: 0, revenue: 0, inlineCount: 0, quadCount: 0 };
      }
      sizeDemandMap[sz].rentalsCount++;
      sizeDemandMap[sz].revenue += r.totalRentalFee || 0;
      if (r.skateType === "QUAD") sizeDemandMap[sz].quadCount++;
      else sizeDemandMap[sz].inlineCount++;
    });

    const missedBySizesMap: Record<number, number> = {};
    missedDemandLogs.forEach((m) => {
      missedBySizesMap[m.shoeSize] = (missedBySizesMap[m.shoeSize] || 0) + 1;
    });

    const fleetBySizeMap: Record<number, number> = {};
    allShoes.forEach((sh) => {
      fleetBySizeMap[sh.size] = (fleetBySizeMap[sh.size] || 0) + 1;
    });

    const sizeReports = Object.keys(sizeDemandMap).map((szStr) => {
      const sz = Number(szStr);
      const data = sizeDemandMap[sz];
      const fleetCount = fleetBySizeMap[sz] || 0;
      const missedCount = missedBySizesMap[sz] || 0;
      return {
        size: sz,
        rentalsCount: data.rentalsCount,
        revenue: data.revenue,
        inlineCount: data.inlineCount,
        quadCount: data.quadCount,
        fleetCount,
        missedDemandCount: missedCount,
        estimatedLostRevenue: missedCount * 150,
        recommendation: missedCount > 3 ? `Urgent: Buy +${Math.ceil(missedCount / 2)} pairs` : missedCount > 0 ? "Consider adding 1-2 pairs" : "Fleet sufficient",
      };
    }).sort((a, b) => b.rentalsCount - a.rentalsCount);

    const totalMissedCount = missedDemandLogs.length;
    const totalLostRevenue = totalMissedCount * 150;

    // --- COMPUTATION 2: SESSION DURATION & EXTENSION BREAKDOWN ---
    let count30m = 0;
    let rev30m = 0;
    let count60m = 0;
    let rev60m = 0;
    let countExtensions = 0;
    let revExtensions = 0;

    rentals.forEach((r) => {
      if ((r.extensionPrice || 0) > 0) {
        countExtensions++;
        revExtensions += r.extensionPrice || 0;
      }
      if (r.baseDurationMinutes === 60) {
        count60m++;
        rev60m += r.basePrice || r.totalRentalFee || 0;
      } else {
        count30m++;
        rev30m += r.basePrice || r.totalRentalFee || 0;
      }
    });

    const totalDurationSessions = rentals.length || 1;
    const durationBreakdown = {
      duration30: {
        count: count30m,
        revenue: rev30m,
        percentage: Math.round((count30m / totalDurationSessions) * 100),
      },
      duration60: {
        count: count60m,
        revenue: rev60m,
        percentage: Math.round((count60m / totalDurationSessions) * 100),
      },
      extensions: {
        count: countExtensions,
        revenue: revExtensions,
        percentage: Math.round((countExtensions / totalDurationSessions) * 100),
      },
      totalRentals: rentals.length,
    };

    // --- COMPUTATION 3: TOP-SELLING CONCESSION PRODUCTS & PROFIT MARGINS ---
    const productStatsMap: Record<string, { unitsSold: number; grossRevenue: number; costPrice: number; sellingPrice: number; category: string }> = {};

    sales.forEach((s) => {
      (s.items || []).forEach((item: any) => {
        const pName = item.productName || "Unknown Item";
        const qty = item.quantity || 1;
        const sub = item.subtotal || item.unitPrice * qty || 0;

        if (!productStatsMap[pName]) {
          const catalogInfo = productPriceMap[pName] || { costPrice: Math.round((item.unitPrice || 40) * 0.6), sellingPrice: item.unitPrice || 40, category: "SNACK" };
          productStatsMap[pName] = {
            unitsSold: 0,
            grossRevenue: 0,
            costPrice: catalogInfo.costPrice,
            sellingPrice: catalogInfo.sellingPrice || item.unitPrice || 0,
            category: catalogInfo.category,
          };
        }
        productStatsMap[pName].unitsSold += qty;
        productStatsMap[pName].grossRevenue += sub;
      });
    });

    const topSellingProducts = Object.keys(productStatsMap).map((name) => {
      const p = productStatsMap[name];
      const totalCost = p.unitsSold * p.costPrice;
      const grossProfit = Math.max(0, p.grossRevenue - totalCost);
      const marginPct = p.grossRevenue > 0 ? Math.round((grossProfit / p.grossRevenue) * 100) : 0;
      return {
        productName: name,
        category: p.category,
        unitsSold: p.unitsSold,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice,
        grossRevenue: p.grossRevenue,
        totalCost,
        grossProfit,
        marginPct,
      };
    }).sort((a, b) => b.grossRevenue - a.grossRevenue);

    // Tab vs Walk-in Concession
    let tabSalesCount = 0;
    let tabRevenue = 0;
    let walkinSalesCount = 0;
    let walkinRevenue = 0;

    sales.forEach((s) => {
      if (s.saleType === "TAB" || (s as any).destination === "TAB") {
        tabSalesCount++;
        tabRevenue += s.totalAmount || 0;
      } else {
        walkinSalesCount++;
        walkinRevenue += s.totalAmount || 0;
      }
    });

    const totalSalesCount = sales.length || 1;
    const tabVsWalkin = {
      tabSalesCount,
      tabRevenue,
      tabPercentage: Math.round((tabSalesCount / totalSalesCount) * 100),
      walkinSalesCount,
      walkinRevenue,
      walkinPercentage: Math.round((walkinSalesCount / totalSalesCount) * 100),
      attachmentRatePct: rentals.length > 0 ? Math.round((tabSalesCount / rentals.length) * 100) : 0,
    };

    // --- COMPUTATION 4: STOCK SHRINKAGE, SPOILAGE & ADJUSTMENTS REPORT ---
    let totalUnitsShrinkage = 0;
    let totalCostShrinkage = 0;
    const shrinkageByReason: Record<string, { units: number; cost: number; label: string }> = {
      DAMAGE: { units: 0, cost: 0, label: "Damaged / Broken" },
      EXPIRED: { units: 0, cost: 0, label: "Expired / Spoilage" },
      INTERNAL_USE: { units: 0, cost: 0, label: "Staff Consumption" },
      INVENTORY_COUNT: { units: 0, cost: 0, label: "Physical Count Variance" },
      CORRECTION: { units: 0, cost: 0, label: "Entry Mistake Correction" },
      OTHER: { units: 0, cost: 0, label: "Other Discrepancies" },
    };

    stockAdjustments.forEach((adj) => {
      if (adj.delta < 0) {
        const unitsLost = Math.abs(adj.delta);
        totalUnitsShrinkage += unitsLost;
        totalCostShrinkage += adj.costValueLost || 0;
        const rKey = adj.reason || "OTHER";
        if (shrinkageByReason[rKey]) {
          shrinkageByReason[rKey].units += unitsLost;
          shrinkageByReason[rKey].cost += adj.costValueLost || 0;
        }
      }
    });

    // --- COMPUTATION 5: INVENTORY RESTOCK OUTLAY ---
    const restockExpenses = expenses.filter(
      (e) => e.category === "SNACK_RESTOCK" || e.fundSource === "CAPITAL"
    );
    const totalRestockOutlay = restockExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // --- COMPUTATION 6: FINANCIAL RECONCILIATION & MULTI-CHANNEL ---
    let rentalCash = 0;
    let rentalTelebirr = 0;
    let rentalCbe = 0;
    rentals.forEach((r) => {
      const f = r.totalRentalFee || 0;
      if (r.paymentMethod === "TELEBIRR") rentalTelebirr += f;
      else if (r.paymentMethod === "CBE") rentalCbe += f;
      else rentalCash += f;
    });

    let concessionCash = 0;
    let concessionTelebirr = 0;
    let concessionCbe = 0;
    sales.forEach((s) => {
      const amt = s.totalAmount || 0;
      if (s.paymentMethod === "TELEBIRR") concessionTelebirr += amt;
      else if (s.paymentMethod === "CBE") concessionCbe += amt;
      else concessionCash += amt;
    });

    const grossRentalRev = rentals.reduce((acc, r) => acc + (r.totalRentalFee || 0), 0);
    const grossConcessionRev = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const grossTotalRevenue = grossRentalRev + grossConcessionRev;

    const dailyCashOpEx = expenses
      .filter((e) => e.fundSource === "DAILY_CASH")
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const netOperatingCashFlow = grossTotalRevenue - dailyCashOpEx;

    const channelTotals = {
      cash: rentalCash + concessionCash,
      telebirr: rentalTelebirr + concessionTelebirr,
      cbe: rentalCbe + concessionCbe,
      total: grossTotalRevenue || 1,
    };

    const channelPercentages = {
      cash: Math.round((channelTotals.cash / channelTotals.total) * 100),
      telebirr: Math.round((channelTotals.telebirr / channelTotals.total) * 100),
      cbe: Math.max(0, 100 - Math.round((channelTotals.cash / channelTotals.total) * 100) - Math.round((channelTotals.telebirr / channelTotals.total) * 100)),
    };

    // Today's register state
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRegister = await DailyRegister.findOne({ date: todayStr });

    // --- COMPUTATION 7: PEAK HOURS & CUSTOMER TRAFFIC ---
    const hoursMap: Record<number, { skaters: number; revenue: number }> = {};
    for (let h = 10; h <= 21; h++) {
      hoursMap[h] = { skaters: 0, revenue: 0 };
    }

    rentals.forEach((r) => {
      const h = new Date(r.startedAt).getHours();
      if (hoursMap[h]) {
        hoursMap[h].skaters++;
        hoursMap[h].revenue += r.totalRentalFee || 0;
      }
    });

    const maxHourlySkaters = Math.max(...Object.values(hoursMap).map((v) => v.skaters), 1);
    const hourlyTraffic = Object.keys(hoursMap).map((hStr) => {
      const h = Number(hStr);
      const data = hoursMap[h];
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const pct = Math.round((data.skaters / maxHourlySkaters) * 100);
      return {
        hour: h,
        hourLabel: `${hour12}:00 ${period}`,
        skaters: data.skaters,
        revenue: data.revenue,
        trafficLevel: pct >= 70 ? ("PEAK" as const) : pct >= 30 ? ("STEADY" as const) : ("SLOW" as const),
        intensityPct: pct,
      };
    });

    return NextResponse.json({
      range,
      dateRange: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
      shoeSizeReport: {
        sizes: sizeReports,
        totalMissedCount,
        totalLostRevenue,
      },
      durationReport: durationBreakdown,
      topSellingProducts,
      tabVsWalkin,
      shrinkageReport: {
        totalUnitsShrinkage,
        totalCostShrinkage,
        byReason: Object.entries(shrinkageByReason).map(([k, v]) => ({
          key: k,
          label: v.label,
          units: v.units,
          cost: v.cost,
        })),
        recentAdjustments: stockAdjustments.slice(0, 8),
      },
      restockOutlay: {
        totalOutlay: totalRestockOutlay,
        recentRestocks: restockExpenses.slice(0, 6),
      },
      financialSummary: {
        grossRentalRev,
        grossConcessionRev,
        grossTotalRevenue,
        dailyCashOpEx,
        netOperatingCashFlow,
        operatingMarginPct: grossTotalRevenue > 0 ? Math.round((netOperatingCashFlow / grossTotalRevenue) * 100) : 100,
        channels: {
          amounts: channelTotals,
          percentages: channelPercentages,
        },
        todayRegister: todayRegister ? {
          status: todayRegister.status,
          openingCash: todayRegister.openingCash,
          expectedClosingCash: todayRegister.expectedClosingCash,
          actualClosingCash: todayRegister.actualClosingCash,
          discrepancy: todayRegister.discrepancy,
        } : null,
      },
      hourlyTraffic,
    });
  } catch (error) {
    console.error("Reports analytics API error:", error);
    return NextResponse.json({ error: "Failed to generate analytics report" }, { status: 500 });
  }
}
