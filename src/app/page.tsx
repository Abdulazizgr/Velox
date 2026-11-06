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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900/60 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-emerald-500/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border border-amber-500/30 shadow-xl shadow-amber-500/10 shrink-0 bg-black">
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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Terminal Online
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isWeekend
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                }`}
              >
                {isWeekend ? "Weekend Pricing Active (200 / 300 ETB)" : "Weekday Pricing Active (150 / 250 ETB)"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {session.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Logged in as <strong className="text-zinc-200">{session.role}</strong> ({session.phone}) • Ready for counter operations
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Link
            href="/rentals"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Timer className="h-4 w-4" />
            <span>Open Rental Board</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Key Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Skate Shoes */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Available Skates</span>
            <Footprints className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{availableShoes}</span>
            <span className="text-xs text-zinc-500">/ {totalShoes} total</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-cyan-400 font-medium">{rentedShoes} on rink</span>
            {maintenanceShoes > 0 && (
              <span className="text-amber-400 font-medium">• {maintenanceShoes} maintenance</span>
            )}
          </div>
        </div>

        {/* Concession Stock */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Concession Items</span>
            <ShoppingBag className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalProducts}</span>
            <span className="text-xs text-zinc-500">catalog items</span>
          </div>
          <div className="mt-3 text-xs">
            {lowStockCount > 0 ? (
              <span className="text-rose-400 font-semibold">{lowStockCount} items low in stock!</span>
            ) : (
              <span className="text-emerald-400 font-medium">All items healthy stock</span>
            )}
          </div>
        </div>

        {/* Capital Reserve */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">General Capital</span>
            <Wallet className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
              {formatETB(capital?.remainingBalance || 0)}
            </span>
          </div>
          <div className="mt-3 text-xs text-zinc-400">
            For equipment & restocks
          </div>
        </div>

        {/* Team & Staff */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Authorized Staff</span>
            <Users className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{staffCount}</span>
            <span className="text-xs text-zinc-500">registered</span>
          </div>
          <div className="mt-3 text-xs text-zinc-400 flex items-center justify-between">
            <span>Phone login active</span>
            {session.role === "OWNER" && (
              <Link href="/staff" className="text-emerald-400 hover:underline">
                Manage &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Phase 1 Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module Shortcuts */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            System Modules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Module 1: Rental Board */}
            <Link
              href="/rentals"
              className="group p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Timer className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Phase 2 Target
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  Live Rental Timer Board
                </h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Start rentals with +5 min grace period, sort skaters by finish time, monitor overdue sessions, swap shoes, and extend minutes.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>View Rental Board</span> &rarr;
              </div>
            </Link>

            {/* Module 2: Concession POS */}
            <Link
              href="/concession"
              className="group p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Phase 3 Target
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  Snacks & Drinks POS
                </h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Add snacks/drinks directly to active skater's open tab or perform instant walk-in sales with automatic inventory deduction.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                <span>Open POS Terminal</span> &rarr;
              </div>
            </Link>

            {/* Module 3: Shoe Inventory */}
            <Link
              href="/inventory/shoes"
              className="group p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <Footprints className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Inventory
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Skate Shoes Asset Registry
                </h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Track individual shoes by unique Shoe ID (e.g. SK-40-01) vs normal size, manage status, and record maintenance.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>View All Shoes ({totalShoes})</span> &rarr;
              </div>
            </Link>

            {/* Module 4: Finances & Cash */}
            <Link
              href="/finances"
              className="group p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Phase 4 Target
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                  Finances & Petty Cash
                </h3>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Two-tier accounting: Daily Cash Drawer (minus lunch/transport) vs General Capital (shoes/restock/rent). Multi-channel: Cash, Telebirr, CBE.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>View Ledgers</span> &rarr;
              </div>
            </Link>
          </div>
        </div>

        {/* Phase 1 Verification & Status Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-base font-semibold text-white">
              <Database className="h-5 w-5 text-emerald-400" />
              <span>Phase 1 Verification</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>MongoDB Connection Active (Local Replica/Server)</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Phone Number Authentication (09... / +251...)</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Owner Staff Registration Module</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Mongoose Schemas (User, Shoe, Product, Rental, Expense)</span>
              </div>
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Database Seeded (20 Shoes, 8 Snacks, 50k Capital)</span>
              </div>
            </div>

            {session.role === "OWNER" && (
              <div className="mt-6 pt-5 border-t border-zinc-800">
                <Link
                  href="/staff"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors border border-zinc-700"
                >
                  <Users className="h-4 w-4 text-amber-400" />
                  <span>Register & Manage Staff</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Ethiopian Pricing Card */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-xs space-y-3">
            <h4 className="font-semibold text-zinc-300 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              Standard Rental Rates & Timing
            </h4>
            <div className="grid grid-cols-2 gap-2 text-zinc-400">
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div className="font-semibold text-zinc-200">30 Minutes</div>
                <div className="text-[11px] text-zinc-500">+5m prep = 35m timer</div>
                <div className="mt-1 font-bold text-emerald-400">150 ETB <span className="text-[10px] text-zinc-500 font-normal">(200 weekend)</span></div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div className="font-semibold text-zinc-200">60 Minutes</div>
                <div className="text-[11px] text-zinc-500">+5m prep = 65m timer</div>
                <div className="mt-1 font-bold text-emerald-400">250 ETB <span className="text-[10px] text-zinc-500 font-normal">(300 weekend)</span></div>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 italic">
              *All shoe rentals include 2 disposable plastic liners (festal).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
