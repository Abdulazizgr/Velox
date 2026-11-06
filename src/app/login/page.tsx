"use client";

import { useState } from "react";
import Image from "next/image";
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
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F3] px-4 py-12 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FFF4E5] rounded-full blur-3xl pointer-events-none opacity-80" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E9D9C5] rounded-full blur-3xl pointer-events-none opacity-50" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-4 h-24 w-24 overflow-hidden rounded-2xl border-2 border-[#E9D9C5] shadow-lg shadow-[#29221E]/10 bg-black">
            <Image
              src="/logo.jpg"
              alt="Velox Skate"
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#29221E]">
            Velox Skate Rink
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#8B8179]">
            Internal Operations & Counter POS System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E9D9C5] rounded-2xl p-6 sm:p-8 shadow-xl shadow-[#29221E]/5">
          <div className="flex items-center gap-2 mb-6 text-sm font-semibold text-[#29221E]">
            <ShieldCheck className="h-5 w-5 text-[#D96827]" />
            <span>Staff & Owner Sign In</span>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-[#FDF0EF] border border-[#D94B45]/30 p-3.5 text-xs sm:text-sm text-[#D94B45]">
              <AlertCircle className="h-5 w-5 text-[#D94B45] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29221E] mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B8179]">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="0911000000 or +251..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827] text-sm transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#8B8179]">
                Registered Ethiopian phone number
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29221E] mb-1.5">
                Password / PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B8179]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E9D9C5] rounded-xl text-[#29221E] placeholder-[#8B8179] focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827] text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#D96827] hover:bg-[#C2571A] text-white font-semibold text-sm shadow-md shadow-[#D96827]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          <div className="mt-6 pt-5 border-t border-[#E9D9C5]">
            <p className="text-xs font-medium text-[#8B8179] mb-2.5 text-center">
              Quick Fill Seeded Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("0911000000", "admin")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#FFF4E5] hover:bg-[#FCEAD2] border border-[#E9D9C5] text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-[#D96827]">Rink Owner</span>
                <span className="text-[11px] font-mono text-[#8B8179]">0911000000</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("0922000000", "staff")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#FFF4E5] hover:bg-[#FCEAD2] border border-[#E9D9C5] text-xs transition-colors cursor-pointer"
              >
                <span className="font-bold text-[#29221E]">Staff Operator</span>
                <span className="text-[11px] font-mono text-[#8B8179]">0922000000</span>
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[#8B8179] text-center">
              Staff accounts are created and registered directly by the Owner.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
