"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/auth";
import {
  Sparkles,
  Timer,
  ShoppingBag,
  Footprints,
  Package,
  Wallet,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";

interface AppShellProps {
  user: SessionUser | null;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on login page or unauthenticated, render raw content
  const isLoginPage = pathname === "/login";
  if (isLoginPage || !user) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Sparkles },
    { href: "/rentals", label: "Rental Board", icon: Timer, badge: "Phase 2" },
    { href: "/concession", label: "Snacks & Drinks", icon: ShoppingBag, badge: "Phase 3" },
    { href: "/inventory/shoes", label: "Skate Shoes", icon: Footprints },
    { href: "/inventory/stock", label: "Stock Control", icon: Package },
    { href: "/finances", label: "Finances & Cash", icon: Wallet, badge: "Phase 4" },
  ];

  if (user?.role === "OWNER") {
    navLinks.push({ href: "/staff", label: "Staff Management", icon: Users, badge: "Owner" });
  }

  // Primary 4 quick links for mobile bottom bar
  const bottomBarLinks = [
    { href: "/", label: "Home", icon: Sparkles },
    { href: "/rentals", label: "Rentals", icon: Timer },
    { href: "/concession", label: "POS", icon: ShoppingBag },
    { href: "/inventory/shoes", label: "Shoes", icon: Footprints },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row">
      {/* 1. DESKTOP SIDEBAR (Visible md and up) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 bg-zinc-950 border-r border-zinc-800">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/20">
            ⚡
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              VELOX <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">POS</span>
            </div>
            <p className="text-[10px] text-zinc-400">Skate Rink Terminal</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{user.name}</div>
            <div className="text-[11px] font-mono text-zinc-400 truncate">{user.phone}</div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0 ${
              user.role === "OWNER"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
            }`}
          >
            {user.role}
          </span>
        </div>

        {/* Nav list */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-inner font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      link.badge === "Owner"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out at bottom of sidebar */}
        <div className="p-3 border-t border-zinc-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP HEADER (Hidden on desktop) */}
      <header className="md:hidden sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-emerald-500 text-zinc-950 font-black text-xs">
            ⚡
          </div>
          <span className="text-sm font-bold tracking-tight text-white">VELOX</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border ${
              user.role === "OWNER"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
            }`}
          >
            {user.role}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-20 md:pb-6">
        {children}
      </div>

      {/* 4. MOBILE BOTTOM QUICK NAVIGATION BAR (Fixed at bottom on mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 px-2 py-1.5 flex items-center justify-around">
        {bottomBarLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "text-emerald-400 font-bold scale-105"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{link.label}</span>
            </Link>
          );
        })}

        {/* 5th slot: More Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            mobileMenuOpen ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* 5. MOBILE "MORE" SLIDE-OVER DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-72 max-w-full bg-zinc-900 border-l border-zinc-800 h-full p-5 flex flex-col justify-between shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Velox POS</h3>
                    <p className="text-[11px] text-zinc-400">{user.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* All links in drawer */}
              <div className="mt-4 space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-zinc-800 text-white font-bold"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                        <span>{link.label}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Logout at bottom of drawer */}
            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out ({user.phone})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

