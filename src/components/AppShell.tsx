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
  FileText,
  Banknote,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PWAInlineButton } from "@/components/PWAInstallBanner";

interface AppShellProps {
  user: SessionUser | null;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang, toggleLang, t } = useLanguage();

  // If on login page or unauthenticated, render raw content
  const isLoginPage = pathname === "/login";
  if (isLoginPage || !user) {
    return <>{children}</>;
  }

  const isOwner = user?.role === "OWNER";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Nav links: Dashboard, Reports, and Staff are hidden for staff
  const navLinks = isOwner
    ? [
        { href: "/", label: t("nav.dashboard", "Dashboard"), icon: Sparkles },
        { href: "/rentals", label: t("nav.rentals", "Rentals"), icon: Timer },
        { href: "/concession", label: t("nav.pos", "Shop"), icon: ShoppingBag },
        { href: "/inventory/shoes", label: t("nav.shoes", "Skate Shoes"), icon: Footprints },
        { href: "/inventory/stock", label: t("nav.stock", "Stock"), icon: Package },
        { href: "/finances", label: t("nav.expenses", "Expenses"), icon: Wallet },
        { href: "/finances/report", label: t("nav.financialReport", "Financial Report"), icon: TrendingUp },
        { href: "/reports/daily", label: t("nav.dailyReport", "Daily Shift"), icon: Banknote },
        { href: "/reports", label: t("nav.reports", "Reports"), icon: FileText },
        { href: "/staff", label: t("nav.staff", "Staff"), icon: Users },
      ]
    : [
        { href: "/rentals", label: t("nav.rentals", "Rentals"), icon: Timer },
        { href: "/concession", label: t("nav.pos", "Shop"), icon: ShoppingBag },
      ];

  // Mobile bottom quick links
  const bottomBarLinks = isOwner
    ? [
        { href: "/", label: t("nav.home", "Home"), icon: Sparkles },
        { href: "/rentals", label: t("nav.rentals", "Rentals"), icon: Timer },
        { href: "/concession", label: t("nav.pos", "Shop"), icon: ShoppingBag },
        { href: "/inventory/shoes", label: t("nav.shoes", "Shoes"), icon: Footprints },
        { href: "/finances", label: t("nav.expenses", "Expenses"), icon: Wallet },
      ]
    : [
        { href: "/rentals", label: t("nav.rentals", "Rentals"), icon: Timer },
        { href: "/concession", label: t("nav.pos", "Shop"), icon: ShoppingBag },
      ];

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E] flex flex-col md:flex-row w-full max-w-full overflow-x-hidden">
      {/* 1. DESKTOP SIDEBAR (Visible md and up) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 bg-[#29221E] text-white border-r border-[#433832] shadow-xl">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[#362D28] shrink-0">
          <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-[#D96827]/40 shadow-md shrink-0 bg-black">
            <Image
              src="/icon-192.png"
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

        {/* Navigation list (Starts right at the top for clean, direct navigation) */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-3">
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
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM SECTION: User Profile Card, Language Switcher, PWA Install & Sign Out */}
        <div className="p-3 border-t border-[#362D28] space-y-2 shrink-0 bg-[#29221E]">
          {/* User Card */}
          <div className="p-2.5 rounded-xl bg-[#362D28] border border-[#433832] flex items-center justify-between">
            <div className="overflow-hidden min-w-0">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[11px] font-mono text-[#8B8179] truncate">{user.phone}</div>
            </div>
            <span
              className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0 ${
                isOwner
                  ? "bg-[#D96827]/20 text-[#D96827] border-[#D96827]/40"
                  : "bg-[#FFF4E5]/10 text-[#E9D9C5] border-[#E9D9C5]/30"
              }`}
            >
              {user.role}
            </span>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#362D28] border border-[#433832] text-xs font-bold text-[#E9D9C5] hover:border-[#D96827] transition-all cursor-pointer shadow-2xs"
            title={t("nav.switchLanguage", "Switch Language")}
          >
            <span className="text-[11px] text-[#8B8179] font-medium">
              {lang === "am" ? "ቋንቋ" : "Language"}
            </span>
            <div className="flex items-center gap-1 font-mono">
              <span className={lang === "en" ? "text-[#D96827] font-black" : "text-[#8B8179]"}>EN</span>
              <span className="text-[#55473f]">|</span>
              <span className={lang === "am" ? "text-[#D96827] font-black" : "text-[#8B8179]"}>አማ</span>
            </div>
          </button>

          {/* PWA Install Button */}
          <PWAInlineButton />

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#8B8179] hover:text-[#D94B45] hover:bg-[#D94B45]/10 transition-colors border border-transparent hover:border-[#D94B45]/20 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("nav.signOut", "Sign Out")}</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP HEADER (Hidden on desktop) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#29221E] text-white border-b border-[#433832] px-3.5 h-14 flex items-center justify-between shadow-md max-w-full">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-1 rounded-xl text-[#E9D9C5] hover:text-white hover:bg-[#362D28] transition-colors cursor-pointer"
          title="Open Menu"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href={isOwner ? "/" : "/rentals"} className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-white">VELOX</span>
          <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-[#D96827]/40 shadow-sm shrink-0 bg-black">
            <Image
              src="/icon-192.png"
              alt="Velox Skate"
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
        </Link>

        {/* Mobile Language Switcher */}
        <button
          type="button"
          onClick={toggleLang}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#362D28] border border-[#433832] text-xs font-bold text-[#E9D9C5] hover:border-[#D96827] transition-all cursor-pointer shadow-2xs font-mono"
          title={t("nav.switchLanguage", "Switch Language")}
        >
          <span className={lang === "en" ? "text-[#D96827] font-black" : "text-[#8B8179]"}>EN</span>
          <span className="text-[#55473f]">|</span>
          <span className={lang === "am" ? "text-[#D96827] font-black" : "text-[#8B8179]"}>አማ</span>
        </button>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-1 md:pl-64 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden pb-24 md:pb-6 bg-[#F7F6F3]">
        {children}
      </div>

      {/* 4. MOBILE BOTTOM QUICK NAVIGATION BAR (5 direct slots) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#29221E]/95 backdrop-blur-xl border-t border-[#433832] px-1 py-1.5 flex items-center justify-around shadow-2xl max-w-full overflow-hidden">
        {bottomBarLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-0 ${
                isActive
                  ? "text-[#D96827] font-bold scale-105"
                  : "text-[#8B8179] hover:text-[#E9D9C5]"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-[#D96827]" : "text-[#8B8179]"}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 5. MOBILE SLIDE-OVER DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative mr-auto w-72 max-w-[85vw] bg-[#29221E] text-white border-r border-[#433832] h-full p-4 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#362D28] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-[#D96827]/40 shadow-sm shrink-0 bg-black">
                    <Image
                      src="/icon-192.png"
                      alt="Velox Skate"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Velox POS</h3>
                    <p className="text-[10px] text-[#8B8179]">Skate Operations</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[#8B8179] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* All links in drawer (Starts directly under brand) */}
              <div className="mt-3 space-y-1 overflow-y-auto flex-1 pr-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
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

            {/* Bottom Drawer Section: User, Language, Install, Sign Out */}
            <div className="pt-3 border-t border-[#362D28] space-y-2 shrink-0">
              {/* User Card */}
              <div className="p-2 rounded-xl bg-[#362D28] border border-[#433832] flex items-center justify-between">
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-bold text-white truncate">{user.name}</div>
                  <div className="text-[10px] font-mono text-[#8B8179] truncate">{user.phone}</div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border shrink-0 ${
                    isOwner
                      ? "bg-[#D96827]/20 text-[#D96827] border-[#D96827]/40"
                      : "bg-[#FFF4E5]/10 text-[#E9D9C5] border-[#E9D9C5]/30"
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleLang}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#362D28] border border-[#433832] text-xs font-bold text-[#E9D9C5] hover:border-[#D96827] transition-all cursor-pointer font-mono"
              >
                <span className="text-[11px] text-[#8B8179] font-sans font-medium">
                  {lang === "am" ? "ቋንቋ" : "Language"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={lang === "en" ? "text-[#D96827] font-black" : "text-[#8B8179]"}>English</span>
                  <span className="text-[#55473f]">/</span>
                  <span className={lang === "am" ? "text-[#D96827] font-black" : "text-[#8B8179]"}>አማርኛ</span>
                </div>
              </button>

              <PWAInlineButton />

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#D94B45] bg-[#D94B45]/10 hover:bg-[#D94B45]/20 border border-[#D94B45]/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("nav.signOut", "Sign Out")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
