"use client";

import { useState } from "react";
import { formatETB } from "@/lib/utils";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Clock,
  Banknote,
  Smartphone,
  Landmark,
  Sparkles,
  ChevronRight,
  Layers,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

export interface DayData {
  dateStr: string;
  dayLabel: string;
  isToday: boolean;
  rentals: number;
  rentalsCount: number;
  concessions: number;
  concessionsCount: number;
  expenses: number;
  gross: number;
  net: number;
}

export interface ChannelData {
  cash: number;
  telebirr: number;
  cbe: number;
  total: number;
}

export interface HourData {
  hourLabel: string;
  skaters: number;
}

interface AnalyticsChartProps {
  sevenDaysData: DayData[];
  channelData: ChannelData;
  hourlyData: HourData[];
  todayGross: number;
}

export function AnalyticsChart({
  sevenDaysData,
  channelData,
  hourlyData,
  todayGross,
}: AnalyticsChartProps) {
  const [activeTab, setActiveTab] = useState<"REVENUE" | "CHANNELS" | "PEAK_HOURS">("REVENUE");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(sevenDaysData.length - 1); // Defaults to Today

  // Compute 7-day stats
  const totalWeeklyGross = sevenDaysData.reduce((acc, d) => acc + d.gross, 0);
  const weeklyAvg = Math.round(totalWeeklyGross / (sevenDaysData.length || 1));
  const maxDayRevenue = Math.max(...sevenDaysData.map((d) => d.gross), 1000);
  const selectedDay = sevenDaysData[selectedDayIdx] || sevenDaysData[sevenDaysData.length - 1];

  // Channel Percentages
  const channelTotal = channelData.total || 1;
  const cashPct = Math.round((channelData.cash / channelTotal) * 100);
  const telebirrPct = Math.round((channelData.telebirr / channelTotal) * 100);
  const cbePct = Math.max(0, 100 - cashPct - telebirrPct);

  // Peak Hour max calculation
  const maxHourlySkaters = Math.max(...hourlyData.map((h) => h.skaters), 1);

  return (
    <div className="bg-white border border-[#E9D9C5] rounded-3xl p-4 sm:p-6 shadow-xs space-y-5">
      {/* 1. Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9D9C5]/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#29221E] tracking-tight">
                Operational Analytics & Metrics
              </h2>
              <p className="text-[11px] sm:text-xs text-[#8B8179]">
                Number-based metrics & live performance progress bars
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#F7F6F3] p-1 rounded-2xl border border-[#E9D9C5] self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("REVENUE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "REVENUE"
                ? "bg-[#D96827] text-white shadow-xs"
                : "text-[#8B8179] hover:text-[#29221E]"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>7-Day Revenue</span>
          </button>

          <button
            onClick={() => setActiveTab("CHANNELS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "CHANNELS"
                ? "bg-[#29221E] text-white shadow-xs"
                : "text-[#8B8179] hover:text-[#29221E]"
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Channels Mix</span>
          </button>

          <button
            onClick={() => setActiveTab("PEAK_HOURS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "PEAK_HOURS"
                ? "bg-[#26845B] text-white shadow-xs"
                : "text-[#8B8179] hover:text-[#29221E]"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Hourly Flow</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: 7-DAY NUMBER-BASED PROGRESS BARS */}
      {activeTab === "REVENUE" && (
        <div className="space-y-4">
          {/* Top Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5]">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                7-Day Total Intake
              </span>
              <div className="text-base sm:text-lg font-black text-[#29221E] font-mono">
                {formatETB(totalWeeklyGross)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5]">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                Daily Average
              </span>
              <div className="text-base sm:text-lg font-black text-[#29221E] font-mono">
                {formatETB(weeklyAvg)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFF4E5] border border-[#E9D9C5]">
              <span className="text-[10px] text-[#D96827] font-bold uppercase block mb-0.5">
                Today&apos;s Revenue
              </span>
              <div className="text-base sm:text-lg font-black text-[#D96827] font-mono">
                {formatETB(todayGross)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5]">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                Concession Ratio
              </span>
              <div className="text-base sm:text-lg font-black text-[#26845B] font-mono">
                {totalWeeklyGross > 0
                  ? `${Math.round(
                      (sevenDaysData.reduce((acc, d) => acc + d.concessions, 0) /
                        totalWeeklyGross) *
                        100
                    )}%`
                  : "0%"}
              </div>
            </div>
          </div>

          {/* Daily Progress Bars List (Mobile-First, Stacked Bars with Numbers) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#8B8179] px-1">
              <span className="uppercase tracking-wider">Day & Performance</span>
              <span className="uppercase tracking-wider">Rentals vs Concessions • Gross Total</span>
            </div>

            {sevenDaysData.map((d, idx) => {
              const isSelected = selectedDayIdx === idx;
              const grossPct = Math.round((d.gross / maxDayRevenue) * 100);
              const rentalPct = d.gross > 0 ? Math.round((d.rentals / d.gross) * grossPct) : 0;
              const concessionPct = d.gross > 0 ? Math.max(0, grossPct - rentalPct) : 0;

              return (
                <div
                  key={d.dateStr}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FFF4E5]/60 border-2 border-[#D96827] shadow-xs"
                      : "bg-[#F7F6F3] border-[#E9D9C5] hover:border-[#D96827]/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#29221E] w-10 text-sm">
                        {d.dayLabel}
                      </span>
                      <span className="text-[11px] text-[#8B8179] font-mono">
                        {d.dateStr}
                      </span>
                      {d.isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-[#D96827] text-white text-[10px] font-bold">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="text-sm font-black text-[#29221E]">
                          {formatETB(d.gross)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual-Tone Horizontal Progress Bar */}
                  <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-[#E9D9C5] flex shadow-inner">
                    <div
                      style={{ width: `${rentalPct}%` }}
                      className="bg-[#D96827] h-full transition-all duration-500"
                      title={`Rentals: ${formatETB(d.rentals)}`}
                    />
                    <div
                      style={{ width: `${concessionPct}%` }}
                      className="bg-[#26845B] h-full transition-all duration-500"
                      title={`Concessions: ${formatETB(d.concessions)}`}
                    />
                  </div>

                  {/* Detailed sub-metrics under bar */}
                  <div className="flex items-center justify-between text-[11px] text-[#8B8179] font-mono mt-1.5 pt-1 border-t border-[#E9D9C5]/50">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-[#D96827]" />
                        <span>Skates: {formatETB(d.rentals)} ({d.rentalsCount})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-[#26845B]" />
                        <span>Snacks: {formatETB(d.concessions)} ({d.concessionsCount})</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>OpEx: -{formatETB(d.expenses)}</span>
                      <span className="font-bold text-[#26845B]">Net: {formatETB(d.net)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB 2: PAYMENT CHANNELS MIX WITH PROGRESS BARS */}
      {activeTab === "CHANNELS" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#8B8179]">
                Today&apos;s Revenue Breakdown:
              </span>
              <span className="font-black text-[#29221E] font-mono text-sm">
                {formatETB(channelData.total)} total
              </span>
            </div>

            {/* Multi-channel proportion bar */}
            <div className="h-4 w-full rounded-xl overflow-hidden flex bg-white border border-[#E9D9C5] shadow-inner">
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-[#26845B] h-full transition-all duration-500"
              />
              <div
                style={{ width: `${telebirrPct}%` }}
                className="bg-[#D96827] h-full transition-all duration-500"
              />
              <div
                style={{ width: `${cbePct}%` }}
                className="bg-[#29221E] h-full transition-all duration-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8B8179] font-mono">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#26845B]" />
                Physical Cash ({cashPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D96827]" />
                Telebirr ({telebirrPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#29221E]" />
                CBE Mobile ({cbePct}%)
              </span>
            </div>
          </div>

          {/* 3 Detailed Progress Channel Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cash */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8B8179] uppercase flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-[#26845B]" />
                  Physical Cash
                </span>
                <span className="text-xs font-black text-[#26845B] bg-[#EBF5F0] px-2 py-0.5 rounded-lg font-mono">
                  {cashPct}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#29221E] font-mono">
                {formatETB(channelData.cash)}
              </div>
              <div className="h-2 w-full bg-[#F7F6F3] rounded-full overflow-hidden">
                <div style={{ width: `${cashPct}%` }} className="h-full bg-[#26845B] rounded-full" />
              </div>
              <div className="text-[10px] text-[#8B8179]">Paper notes in counter drawer</div>
            </div>

            {/* Telebirr */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8B8179] uppercase flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-[#D96827]" />
                  Telebirr
                </span>
                <span className="text-xs font-black text-[#D96827] bg-[#FFF4E5] px-2 py-0.5 rounded-lg font-mono">
                  {telebirrPct}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#D96827] font-mono">
                {formatETB(channelData.telebirr)}
              </div>
              <div className="h-2 w-full bg-[#F7F6F3] rounded-full overflow-hidden">
                <div style={{ width: `${telebirrPct}%` }} className="h-full bg-[#D96827] rounded-full" />
              </div>
              <div className="text-[10px] text-[#8B8179]">Mobile wallet deposits</div>
            </div>

            {/* CBE */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8B8179] uppercase flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-[#29221E]" />
                  Commercial Bank (CBE)
                </span>
                <span className="text-xs font-black text-[#29221E] bg-[#F7F6F3] px-2 py-0.5 rounded-lg font-mono">
                  {cbePct}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#29221E] font-mono">
                {formatETB(channelData.cbe)}
              </div>
              <div className="h-2 w-full bg-[#F7F6F3] rounded-full overflow-hidden">
                <div style={{ width: `${cbePct}%` }} className="h-full bg-[#29221E] rounded-full" />
              </div>
              <div className="text-[10px] text-[#8B8179]">Bank app transfers</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: HOURLY SKATER FLOW WITH PROGRESS BARS */}
      {activeTab === "PEAK_HOURS" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B8179]">
              Customer Traffic by Hour (10 AM to 9 PM)
            </span>
            <span className="text-xs font-bold text-[#D96827] bg-[#FFF4E5] px-2.5 py-1 rounded-xl border border-[#E9D9C5]">
              Rush Hours: 2:00 PM – 5:00 PM
            </span>
          </div>

          {/* List of Hourly Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {hourlyData.map((h, idx) => {
              const pct = Math.round((h.skaters / maxHourlySkaters) * 100);
              const isPeak = h.skaters >= maxHourlySkaters && h.skaters > 0;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all ${
                    isPeak
                      ? "bg-[#FFF4E5]/80 border-[#D96827]"
                      : "bg-white border-[#E9D9C5]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#29221E]">{h.hourLabel}</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-black text-sm text-[#29221E]">{h.skaters}</span>
                      <span className="text-[10px] text-[#8B8179]">skaters</span>
                      {isPeak && (
                        <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D96827] text-white">
                          PEAK
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-2 w-full bg-[#F7F6F3] rounded-full overflow-hidden border border-[#E9D9C5]/50">
                    <div
                      style={{ width: `${Math.max(4, pct)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPeak
                          ? "bg-[#D96827]"
                          : h.skaters > 0
                          ? "bg-[#26845B]"
                          : "bg-transparent"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
