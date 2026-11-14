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
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"REVENUE" | "CHANNELS" | "PEAK_HOURS">("REVENUE");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(sevenDaysData.length - 1);

  // Compute 7-day stats
  const totalWeeklyGross = sevenDaysData.reduce((acc, d) => acc + d.gross, 0);
  const weeklyAvg = Math.round(totalWeeklyGross / (sevenDaysData.length || 1));
  const maxDayRevenue = Math.max(...sevenDaysData.map((d) => d.gross), 1000);

  // Channel Percentages
  const channelTotal = channelData.total || 1;
  const cashPct = Math.round((channelData.cash / channelTotal) * 100);
  const telebirrPct = Math.round((channelData.telebirr / channelTotal) * 100);
  const cbePct = Math.max(0, 100 - cashPct - telebirrPct);

  // Peak Hour max calculation
  const maxHourlySkaters = Math.max(...hourlyData.map((h) => h.skaters), 1);

  return (
    <div className="bg-white border border-[#E9D9C5] rounded-3xl p-3.5 sm:p-6 shadow-xs space-y-4 overflow-hidden w-full min-w-0">
      {/* 1. Header & Tab Switcher (Mobile First) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9D9C5]/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 rounded-xl bg-[#FFF4E5] text-[#D96827] shrink-0">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#29221E] tracking-tight">
              {t("dashboard.analyticsTitle", "Analytics")}
            </h2>
            <p className="text-[11px] text-[#8B8179]">
              {t("dashboard.analyticsSub", "Live performance & revenue breakdown")}
            </p>
          </div>
        </div>

        {/* Tab Switcher - Scrollable horizontally on narrow mobile */}
        <div className="overflow-x-auto scrollbar-none max-w-full pb-0.5">
          <div className="flex items-center gap-1 bg-[#F7F6F3] p-1 rounded-2xl border border-[#E9D9C5] w-max">
            <button
              onClick={() => setActiveTab("REVENUE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "REVENUE"
                  ? "bg-[#D96827] text-white shadow-xs"
                  : "text-[#8B8179] hover:text-[#29221E]"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{t("dashboard.sevenDayRevenue", "7-Day Revenue")}</span>
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
              <span>{t("dashboard.channels", "Channels")}</span>
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
              <span>{t("dashboard.peakHours", "Peak Hours")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB 1: 7-DAY REVENUE PROGRESS BARS */}
      {activeTab === "REVENUE" && (
        <div className="space-y-4 min-w-0">
          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] min-w-0">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block truncate">
                {t("dashboard.sevenDayTotal", "7-Day Total")}
              </span>
              <div className="text-sm sm:text-base font-black text-[#29221E] font-mono truncate">
                {formatETB(totalWeeklyGross)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] min-w-0">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block truncate">
                {t("dashboard.dailyAverage", "Daily Average")}
              </span>
              <div className="text-sm sm:text-base font-black text-[#29221E] font-mono truncate">
                {formatETB(weeklyAvg)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#FFF4E5] border border-[#E9D9C5] min-w-0">
              <span className="text-[10px] text-[#D96827] font-bold uppercase block truncate">
                {t("dashboard.todaysRevenue", "Today's Revenue")}
              </span>
              <div className="text-sm sm:text-base font-black text-[#D96827] font-mono truncate">
                {formatETB(todayGross)}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] min-w-0">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block truncate">
                {t("dashboard.snackRatio", "Snack Ratio")}
              </span>
              <div className="text-sm sm:text-base font-black text-[#26845B] font-mono truncate">
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

          {/* Daily Progress Bars */}
          <div className="space-y-2.5 pt-1 min-w-0">
            {sevenDaysData.map((d, idx) => {
              const isSelected = selectedDayIdx === idx;
              const grossPct = Math.round((d.gross / maxDayRevenue) * 100);
              const rentalPct = d.gross > 0 ? Math.round((d.rentals / d.gross) * grossPct) : 0;
              const concessionPct = d.gross > 0 ? Math.max(0, grossPct - rentalPct) : 0;

              return (
                <div
                  key={d.dateStr}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? "bg-[#FFF4E5]/70 border-2 border-[#D96827] shadow-xs"
                      : "bg-[#F7F6F3] border-[#E9D9C5] hover:border-[#D96827]/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-extrabold text-[#29221E] text-xs sm:text-sm">
                        {d.dayLabel}
                      </span>
                      <span className="text-[10px] text-[#8B8179] font-mono truncate">
                        {d.dateStr}
                      </span>
                      {d.isToday && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#D96827] text-white text-[9px] font-bold shrink-0">
                          {t("dashboard.today", "Today")}
                        </span>
                      )}
                    </div>

                    <div className="text-right font-mono shrink-0 ml-2">
                      <span className="text-xs sm:text-sm font-black text-[#29221E]">
                        {formatETB(d.gross)}
                      </span>
                    </div>
                  </div>

                  {/* Dual-Tone Horizontal Progress Bar */}
                  <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-[#E9D9C5] flex shadow-inner">
                    <div
                      style={{ width: `${rentalPct}%` }}
                      className="bg-[#D96827] h-full transition-all duration-500"
                    />
                    <div
                      style={{ width: `${concessionPct}%` }}
                      className="bg-[#26845B] h-full transition-all duration-500"
                    />
                  </div>

                  {/* Sub-metrics under bar (Wraps cleanly on mobile) */}
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-[#8B8179] font-mono mt-1 pt-1 border-t border-[#E9D9C5]/50">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D96827]" />
                        <span>{t("dashboard.skatesShare", "Skates")}: {formatETB(d.rentals)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#26845B]" />
                        <span>{t("dashboard.shopShare", "Shop")}: {formatETB(d.concessions)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span>{t("dashboard.expensesLabel", "Expenses")}: -{formatETB(d.expenses)}</span>
                      <span className="font-bold text-[#26845B]">{t("dashboard.netCashFlow", "Net")}: {formatETB(d.net)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB 2: PAYMENT CHANNELS */}
      {activeTab === "CHANNELS" && (
        <div className="space-y-3 min-w-0">
          <div className="p-3 sm:p-4 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] space-y-2.5 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#8B8179] uppercase">{t("dashboard.channels", "Channels")}:</span>
              <span className="font-mono font-bold text-[#29221E]">{formatETB(channelData.total)}</span>
            </div>

            {/* Combined progress bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-white border border-[#E9D9C5]">
              <div style={{ width: `${cashPct}%` }} className="bg-[#26845B] h-full" />
              <div style={{ width: `${telebirrPct}%` }} className="bg-[#D96827] h-full" />
              <div style={{ width: `${cbePct}%` }} className="bg-[#29221E] h-full" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[#8B8179] font-mono">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#26845B]" />
                {t("common.cash", "Cash")} ({cashPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#D96827]" />
                {t("common.telebirr", "Telebirr")} ({telebirrPct}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#29221E]" />
                {t("common.cbe", "CBE")} ({cbePct}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#8B8179] flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-[#26845B]" /> {t("common.cash", "Cash")}
                </span>
                <span className="font-mono font-bold text-[#26845B]">{cashPct}%</span>
              </div>
              <div className="text-lg font-black text-[#29221E] font-mono">
                {formatETB(channelData.cash)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#D96827] flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> {t("common.telebirr", "Telebirr")}
                </span>
                <span className="font-mono font-bold text-[#D96827]">{telebirrPct}%</span>
              </div>
              <div className="text-lg font-black text-[#D96827] font-mono">
                {formatETB(channelData.telebirr)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#29221E] flex items-center gap-1">
                  <Landmark className="h-3.5 w-3.5 text-[#D96827]" /> {t("common.cbe", "CBE")}
                </span>
                <span className="font-mono font-bold text-[#29221E]">{cbePct}%</span>
              </div>
              <div className="text-lg font-black text-[#29221E] font-mono">
                {formatETB(channelData.cbe)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: PEAK HOURS */}
      {activeTab === "PEAK_HOURS" && (
        <div className="space-y-2.5 min-w-0">
          {hourlyData.map((h) => {
            const intensityPct = Math.round((h.skaters / maxHourlySkaters) * 100);
            const isPeak = intensityPct >= 75;

            return (
              <div
                key={h.hourLabel}
                className="p-2 sm:p-2.5 rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] space-y-1.5 min-w-0"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#29221E] font-mono">{h.hourLabel}</span>
                  <div className="flex items-center gap-2">
                    {isPeak && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                        {t("dashboard.peak", "PEAK")}
                      </span>
                    )}
                    <span className="font-mono font-bold text-[#29221E]">{h.skaters} {t("dashboard.skaters", "skaters")}</span>
                  </div>
                </div>

                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#E9D9C5]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPeak ? "bg-[#D96827]" : "bg-[#26845B]"
                    }`}
                    style={{ width: `${Math.max(intensityPct, 3)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
