"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { PWAInlineButton } from "@/components/PWAInstallBanner";

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
    { href: "/rentals", label: "Rental Board", icon: Timer, badge: "Live" },
    { href: "/concession", label: "Snacks & Drinks", icon: ShoppingBag, badge: "POS" },
    { href: "/inventory/shoes", label: "Skate Shoes", icon: Footprints },
    { href: "/inventory/stock", label: "Stock Control", icon: Package },
    { href: "/finances", label: "Finances & Cash", icon: Wallet, badge: "Ledger" },
    { href: "/reports", label: "Daily Reports", icon: FileText, badge: "EOD" },
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
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] flex flex-col md:flex-row">
      {/* 1. DESKTOP SIDEBAR (Visible md and up) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 bg-[#29221E] text-white border-r border-[#433832] shadow-xl">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[#362D28]">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-[#D96827]/40 shadow-md shrink-0 bg-black">
            <Image
              src="/logo.jpg"
              alt="Velox Skate"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              VELOX <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D96827] text-white">POS</span>
            </div>
            <p className="text-[11px] text-[#8B8179]">Skate Terminal</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-[#362D28] border border-[#433832] flex items-center justify-between">
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{user.name}</div>
            <div className="text-[11px] font-mono text-[#8B8179] truncate">{user.phone}</div>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0 ${
              user.role === "OWNER"
                ? "bg-[#D96827]/20 text-[#D96827] border-[#D96827]/40"
                : "bg-[#FFF4E5]/10 text-[#E9D9C5] border-[#E9D9C5]/30"
            }`}
          >
            {user.role}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#D96827] text-white font-bold shadow-md shadow-[#D96827]/25"
                    : "text-[#E9D9C5]/85 hover:text-white hover:bg-[#362D28]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#8B8179]"}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : link.badge === "Owner"
                        ? "bg-[#D96827]/20 text-[#D96827] border border-[#D96827]/40"
                        : "bg-[#362D28] text-[#8B8179] border border-[#433832]"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* PWA Install Button & Sign Out at bottom of sidebar */}
        <div className="p-3 border-t border-[#362D28] space-y-2">
          <PWAInlineButton />
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#8B8179] hover:text-[#D94B45] hover:bg-[#D94B45]/10 transition-colors border border-transparent hover:border-[#D94B45]/20 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP HEADER (Hidden on desktop) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#29221E] text-white border-b border-[#433832] px-4 h-14 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-[#D96827]/40 shadow-sm shrink-0 bg-black">
            <Image
              src="/logo.jpg"
              alt="Velox Skate"
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">VELOX</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border ${
              user.role === "OWNER"
                ? "bg-[#D96827]/20 text-[#D96827] border-[#D96827]/40"
                : "bg-[#FFF4E5]/10 text-[#E9D9C5] border-[#E9D9C5]/30"
            }`}
          >
            {user.role}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-[#E9D9C5] hover:text-white hover:bg-[#362D28]"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-20 md:pb-6 bg-[#F7F6F3]">
        {children}
      </div>

      {/* 4. MOBILE BOTTOM QUICK NAVIGATION BAR (Fixed at bottom on mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#29221E]/95 backdrop-blur-xl border-t border-[#433832] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {bottomBarLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "text-[#D96827] font-bold scale-105"
                  : "text-[#8B8179] hover:text-[#E9D9C5]"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-[#D96827]" : "text-[#8B8179]"}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{link.label}</span>
            </Link>
          );
        })}

        {/* 5th slot: More Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            mobileMenuOpen ? "text-[#D96827]" : "text-[#8B8179] hover:text-[#E9D9C5]"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-72 max-w-full bg-[#29221E] text-white border-l border-[#433832] h-full p-5 flex flex-col justify-between shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#362D28]">
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-[#D96827]/40 shadow-sm shrink-0 bg-black">
                    <Image
                      src="/logo.jpg"
                      alt="Velox Skate"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Velox POS</h3>
                    <p className="text-[11px] text-[#8B8179]">{user.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[#8B8179] hover:text-white"
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
                          ? "bg-[#D96827] text-white font-bold"
                          : "text-[#E9D9C5]/85 hover:bg-[#362D28] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#8B8179]"}`} />
                        <span>{link.label}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#8B8179]" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Install App & Logout at bottom of drawer */}
            <div className="pt-4 border-t border-[#362D28] space-y-2">
              <PWAInlineButton />
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-[#D94B45] bg-[#D94B45]/10 hover:bg-[#D94B45]/20 border border-[#D94B45]/30 transition-colors"
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
