"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Phone, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sign in");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickFill = (demoPhone: string, demoPass: string) => {
    setPhone(demoPhone);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-zinc-950 font-black text-2xl shadow-xl shadow-emerald-500/20 mb-4">
            ⚡
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Velox Skate Rink
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Internal Operations & Counter POS System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 mb-6 text-sm font-semibold text-zinc-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Staff & Owner Sign In</span>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3.5 text-sm text-rose-300">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="0911000000 or +251..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Registered Ethiopian phone number
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-300 mb-1.5">
                Password / PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <p className="text-xs font-medium text-zinc-400 mb-2.5 text-center">
              Quick Fill Seeded Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("0911000000", "admin")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800 text-xs transition-colors cursor-pointer"
              >
                <span className="font-semibold text-amber-400">Rink Owner</span>
                <span className="text-[11px] text-zinc-500">0911000000</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("0922000000", "staff")}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800 text-xs transition-colors cursor-pointer"
              >
                <span className="font-semibold text-cyan-400">Staff Operator</span>
                <span className="text-[11px] text-zinc-500">0922000000</span>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500 text-center">
              Note: Staff accounts are created and registered directly by the Owner.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
