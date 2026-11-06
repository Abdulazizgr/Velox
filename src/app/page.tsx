import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Shoe, Product, CapitalFund, DailyRegister, User } from "@/models";
import { formatETB } from "@/lib/utils";
import {
  Timer,
  ShoppingBag,
  Footprints,
  Package,
  Wallet,
  Users,
  CheckCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  await connectDB();

  // Aggregate current stats
  const totalShoes = await Shoe.countDocuments();
  const availableShoes = await Shoe.countDocuments({ status: "AVAILABLE" });
  const rentedShoes = await Shoe.countDocuments({ status: "RENTED" });
  const maintenanceShoes = await Shoe.countDocuments({ status: "MAINTENANCE" });

  const totalProducts = await Product.countDocuments();
  const lowStockCount = await Product.countDocuments({
    $expr: { $lte: ["$currentStock", "$minStockAlert"] },
  });

  const capital = await CapitalFund.findOne();
  const staffCount = await User.countDocuments();

  const isWeekend = [0, 6].includes(new Date().getDay());

  return (
    <div className="min-h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 rounded-2xl bg-white border border-[#E9D9C5] shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-[#E9D9C5] shadow-sm shrink-0 bg-black">
            <Image
              src="/logo.jpg"
              alt="Velox Skate Logo"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[#26845B] border border-[#26845B]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26845B] animate-pulse" />
                Terminal Online
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isWeekend
                    ? "bg-[#FFF4E5] text-[#D96827] border-[#E9D9C5]"
                    : "bg-[#F7F6F3] text-[#29221E] border-[#E9D9C5]"
                }`}
              >
                {isWeekend ? "Weekend Pricing Active (200 / 300 ETB)" : "Weekday Pricing Active (150 / 250 ETB)"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#29221E]">
              Welcome back, {session.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#8B8179] mt-1">
              Logged in as <strong className="text-[#29221E]">{session.role}</strong> ({session.phone}) • Ready for counter operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/rentals"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D96827] hover:bg-[#C2571A] text-white font-semibold text-sm shadow-md shadow-[#D96827]/20 transition-all cursor-pointer shrink-0"
          >
            <Timer className="h-4 w-4" />
            <span>Open Rental Board</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Key Metric Counters (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Skate Shoes */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#8B8179] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Skates</span>
            <Footprints className="h-5 w-5 text-[#D96827]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#29221E]">{availableShoes}</span>
            <span className="text-xs text-[#8B8179]">/ {totalShoes} total</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-[#26845B] font-semibold">{rentedShoes} active</span>
            {maintenanceShoes > 0 && (
              <span className="text-[#D94B45] font-semibold">• {maintenanceShoes} maintenance</span>
            )}
          </div>
        </div>

        {/* Concession Stock */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#8B8179] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Concession Items</span>
            <ShoppingBag className="h-5 w-5 text-[#D96827]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#29221E]">{totalProducts}</span>
            <span className="text-xs text-[#8B8179]">catalog items</span>
          </div>
          <div className="mt-3 text-xs">
            {lowStockCount > 0 ? (
              <span className="text-[#D94B45] font-bold">{lowStockCount} items low in stock!</span>
            ) : (
              <span className="text-[#26845B] font-medium">All items healthy stock</span>
            )}
          </div>
        </div>

        {/* Capital Reserve */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#8B8179] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">General Capital</span>
            <Wallet className="h-5 w-5 text-[#D96827]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#29221E]">
              {formatETB(capital?.remainingBalance || 0)}
            </span>
          </div>
          <div className="mt-3 text-xs text-[#8B8179]">
            For equipment & restocks
          </div>
        </div>

        {/* Team & Staff */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#8B8179] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Authorized Staff</span>
            <Users className="h-5 w-5 text-[#29221E]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#29221E]">{staffCount}</span>
            <span className="text-xs text-[#8B8179]">registered</span>
          </div>
          <div className="mt-3 text-xs text-[#8B8179] flex items-center justify-between">
            <span>Phone login active</span>
            {session.role === "OWNER" && (
              <Link href="/staff" className="text-[#D96827] font-semibold hover:underline">
                Manage &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Module Shortcuts & Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Shortcuts */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-[#29221E] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#D96827]" />
            Operational Modules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Module 1: Rental Board */}
            <Link
              href="/rentals"
              className="group p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <Timer className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                    Live Board
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Live Rental Timer Board
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Start rentals with +5 min grace period, sort skaters by finish time, monitor overdue sessions, swap shoes, and extend minutes.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>View Rental Board</span> &rarr;
              </div>
            </Link>

            {/* Module 2: Concession POS */}
            <Link
              href="/concession"
              className="group p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                    Counter POS
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Snacks & Drinks POS
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Add snacks/drinks directly to active skater's open tab or perform instant walk-in sales with automatic inventory deduction.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>Open POS Terminal</span> &rarr;
              </div>
            </Link>

            {/* Module 3: Shoe Inventory */}
            <Link
              href="/inventory/shoes"
              className="group p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <Footprints className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F7F6F3] text-[#8B8179] border border-[#E9D9C5]">
                    Inventory
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Skate Shoes Asset Registry
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Track individual shoes by unique Shoe ID (e.g. SK-40-01) vs normal size, manage status, and record maintenance.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>View All Shoes ({totalShoes})</span> &rarr;
              </div>
            </Link>

            {/* Module 4: Finances & Cash */}
            <Link
              href="/finances"
              className="group p-5 rounded-2xl bg-white border border-[#E9D9C5] hover:border-[#D96827] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-[#FFF4E5] text-[#D96827] group-hover:scale-105 transition-transform">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                    Ledgers
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#29221E] group-hover:text-[#D96827] transition-colors">
                  Finances & Petty Cash
                </h3>
                <p className="mt-1 text-xs text-[#8B8179] leading-relaxed">
                  Two-tier accounting: Daily Cash Drawer (minus lunch/transport) vs General Capital (shoes/restock/rent). Multi-channel: Cash, Telebirr, CBE.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#D96827] group-hover:translate-x-1 transition-transform">
                <span>View Ledgers</span> &rarr;
              </div>
            </Link>
          </div>
        </div>

        {/* Status & Pricing Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#E9D9C5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-base font-bold text-[#29221E]">
              <Database className="h-5 w-5 text-[#26845B]" />
              <span>System Verification</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-[#29221E]">
                <CheckCircle className="h-4 w-4 text-[#26845B] shrink-0" />
                <span>MongoDB Connection Active</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#29221E]">
                <CheckCircle className="h-4 w-4 text-[#26845B] shrink-0" />
                <span>Phone Auth (09... / +251...)</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#29221E]">
                <CheckCircle className="h-4 w-4 text-[#26845B] shrink-0" />
                <span>Owner Staff Registration Active</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#29221E]">
                <CheckCircle className="h-4 w-4 text-[#26845B] shrink-0" />
                <span>Dual Shoe ID & Asset Registry</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#29221E]">
                <CheckCircle className="h-4 w-4 text-[#26845B] shrink-0" />
                <span>End-of-Day Cash Drawer Closing</span>
              </div>
            </div>

            {session.role === "OWNER" && (
              <div className="mt-5 pt-4 border-t border-[#E9D9C5]">
                <Link
                  href="/staff"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F7F6F3] hover:bg-[#E9D9C5]/40 text-[#29221E] font-semibold text-xs transition-colors border border-[#E9D9C5]"
                >
                  <Users className="h-4 w-4 text-[#D96827]" />
                  <span>Register & Manage Staff</span>
                </Link>
              </div>
            )}
          </div>

          {/* Ethiopian Pricing Card */}
          <div className="bg-[#FFF4E5]/60 border border-[#E9D9C5] rounded-2xl p-5 text-xs space-y-3 shadow-sm">
            <h4 className="font-bold text-[#29221E] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#D96827]" />
              Standard Rental Rates & Timing
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[#29221E]">
              <div className="p-3 rounded-xl bg-white border border-[#E9D9C5]">
                <div className="font-bold text-[#29221E]">30 Minutes</div>
                <div className="text-[11px] text-[#8B8179]">+5m prep = 35m</div>
                <div className="mt-1 font-black text-[#D96827]">150 ETB <span className="text-[10px] text-[#8B8179] font-normal">(200 weekend)</span></div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E9D9C5]">
                <div className="font-bold text-[#29221E]">60 Minutes</div>
                <div className="text-[11px] text-[#8B8179]">+5m prep = 65m</div>
                <div className="mt-1 font-black text-[#D96827]">250 ETB <span className="text-[10px] text-[#8B8179] font-normal">(300 weekend)</span></div>
              </div>
            </div>
            <p className="text-[11px] text-[#8B8179] italic">
              *All shoe rentals include 2 disposable plastic liners (festal).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
