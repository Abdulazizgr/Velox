"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/auth";
import {
  Timer,
  ShoppingBag,
  Footprints,
  Package,
  Wallet,
  Users,
  LogOut,
  Sparkles,
} from "lucide-react";

interface NavbarProps {
  user: SessionUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
    { href: "/inventory/shoes", label: "Shoes", icon: Footprints },
    { href: "/inventory/stock", label: "Stock", icon: Package },
    { href: "/finances", label: "Finances", icon: Wallet, badge: "Phase 4" },
  ];

  if (user?.role === "OWNER") {
    navLinks.push({ href: "/staff", label: "Staff", icon: Users, badge: "Owner" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              VELOX <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Skate Rink</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-none">Management & POS System</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                  isActive
                    ? "bg-zinc-800 text-white shadow-inner"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                <span>{link.label}</span>
                {link.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    link.badge === "Owner"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Status & Logout */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-zinc-400 font-mono">{user.phone}</div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-md font-semibold tracking-wide border ${
                  user.role === "OWNER"
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                }`}
              >
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Staff Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
