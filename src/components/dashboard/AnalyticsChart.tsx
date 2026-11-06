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
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Compute 7-day stats
  const totalWeeklyGross = sevenDaysData.reduce((acc, d) => acc + d.gross, 0);
  const weeklyAvg = Math.round(totalWeeklyGross / (sevenDaysData.length || 1));
  const maxDayRevenue = Math.max(...sevenDaysData.map((d) => d.gross), 1000);
  const selectedDay = sevenDaysData[selectedDayIdx] || sevenDaysData[sevenDaysData.length - 1];

  // SVG Chart Dimensions
  const svgWidth = 620;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const chartHeight = svgHeight - paddingY * 2;
  const chartWidth = svgWidth - paddingX * 2;
  const barSlotWidth = chartWidth / (sevenDaysData.length || 7);
  const barWidth = Math.min(barSlotWidth * 0.48, 36);

  // Calculate points for the smooth Net Profit line
  const linePoints = sevenDaysData.map((d, idx) => {
    const x = paddingX + idx * barSlotWidth + barSlotWidth / 2;
    const norm = Math.max(0, d.net) / (maxDayRevenue * 1.15 || 1);
    const y = svgHeight - paddingY - norm * chartHeight;
    return { x, y, net: d.net };
  });

  const lineD = linePoints.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const areaD = linePoints.length > 0
    ? `${lineD} L ${linePoints[linePoints.length - 1].x} ${svgHeight - paddingY} L ${linePoints[0].x} ${svgHeight - paddingY} Z`
    : "";

  // Channel Percentages
  const channelTotal = channelData.total || 1;
  const cashPct = Math.round((channelData.cash / channelTotal) * 100);
  const telebirrPct = Math.round((channelData.telebirr / channelTotal) * 100);
  const cbePct = Math.max(0, 100 - cashPct - telebirrPct);

  // Peak Hour max calculation
  const maxHourlySkaters = Math.max(...hourlyData.map((h) => h.skaters), 5);

  return (
    <div className="bg-white border border-[#E9D9C5] rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      {/* 1. Header & Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E9D9C5]/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#29221E] tracking-tight">
                Business Analytics & Reports
              </h2>
              <p className="text-[11px] sm:text-xs text-[#8B8179]">
                Live performance, 7-day revenue trend & customer traffic
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
            <span>Payment Channels</span>
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

      {/* 2. TAB 1: 7-DAY REVENUE & PROFIT GRAPH */}
      {activeTab === "REVENUE" && (
        <div className="space-y-4">
          {/* Active Day Inspection Header (Tap any bar on phone to inspect) */}
          <div className="p-3.5 rounded-2xl bg-[#FFF4E5]/60 border border-[#E9D9C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B8179]">
                Selected Day:
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#29221E] bg-white px-2.5 py-1 rounded-xl border border-[#E9D9C5] shadow-2xs">
                {selectedDay?.dayLabel} ({selectedDay?.dateStr}) {selectedDay?.isToday ? "• Today" : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D96827]" />
                <span className="text-[#8B8179]">Rentals:</span>
                <strong className="text-[#29221E]">{formatETB(selectedDay?.rentals || 0)}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#26845B]" />
                <span className="text-[#8B8179]">Concession:</span>
                <strong className="text-[#29221E]">{formatETB(selectedDay?.concessions || 0)}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D94B45]" />
                <span className="text-[#8B8179]">OpEx:</span>
                <strong className="text-[#D94B45]">-{formatETB(selectedDay?.expenses || 0)}</strong>
              </div>
              <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-[#E9D9C5]">
                <span className="text-[#8B8179] font-sans font-bold">Gross:</span>
                <strong className="text-[#D96827] text-sm">{formatETB(selectedDay?.gross || 0)}</strong>
              </div>
            </div>
          </div>

          {/* SVG Visual Chart */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Gradient for Net Profit Area */}
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D96827" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#D96827" stopOpacity="0.0" />
                </linearGradient>
                {/* Gradient for Today's Bar */}
                <linearGradient id="todayBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D96827" />
                  <stop offset="100%" stopColor="#C2571A" />
                </linearGradient>
              </defs>

              {/* Background Guideline Grid */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = paddingY + chartHeight * ratio;
                const valueLabel = Math.round(maxDayRevenue * (1 - ratio));
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="#E9D9C5"
                      strokeDasharray="4 4"
                      strokeOpacity="0.6"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 6}
                      y={y + 3}
                      fill="#8B8179"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {valueLabel >= 1000 ? `${(valueLabel / 1000).toFixed(1)}k` : valueLabel}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area for Net Profit */}
              {areaD && (
                <path d={areaD} fill="url(#profitGrad)" />
              )}

              {/* Net Profit Line */}
              {lineD && (
                <path
                  d={lineD}
                  fill="none"
                  stroke="#D96827"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              )}

              {/* Stacked Grouped Daily Bars */}
              {sevenDaysData.map((d, idx) => {
                const isSelected = selectedDayIdx === idx;
                const slotCenterX = paddingX + idx * barSlotWidth + barSlotWidth / 2;
                const barX = slotCenterX - barWidth / 2;

                // Heights normalized
                const maxRef = maxDayRevenue * 1.15 || 1;
                const totalBarH = (d.gross / maxRef) * chartHeight;
                const rentalH = (d.rentals / maxRef) * chartHeight;
                const concessionH = Math.max(0, totalBarH - rentalH);

                const baseY = svgHeight - paddingY;
                const rentalY = baseY - rentalH;
                const concessionY = rentalY - concessionH;

                return (
                  <g
                    key={d.dateStr}
                    onClick={() => setSelectedDayIdx(idx)}
                    className="cursor-pointer transition-all group"
                  >
                    {/* Active highlight background column */}
                    {isSelected && (
                      <rect
                        x={slotCenterX - barSlotWidth * 0.44}
                        y={paddingY}
                        width={barSlotWidth * 0.88}
                        height={chartHeight + 20}
                        rx="12"
                        fill="#FFF4E5"
                        opacity="0.6"
                        className="animate-fade-in"
                      />
                    )}

                    {/* Rental Portion (Warm Rust) */}
                    <rect
                      x={barX}
                      y={rentalY}
                      width={barWidth}
                      height={Math.max(2, rentalH)}
                      rx={concessionH <= 0 ? 6 : 0}
                      fill={d.isToday ? "url(#todayBarGrad)" : isSelected ? "#D96827" : "#E5874D"}
                      className="transition-all duration-300"
                    />

                    {/* Concession Portion (Emerald Green Stacked on top) */}
                    {concessionH > 0 && (
                      <rect
                        x={barX}
                        y={concessionY}
                        width={barWidth}
                        height={concessionH}
                        rx="6"
                        fill={isSelected ? "#26845B" : "#4EA880"}
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Net profit marker point */}
                    <circle
                      cx={slotCenterX}
                      cy={baseY - (d.net / maxRef) * chartHeight}
                      r={isSelected ? 4.5 : 3}
                      fill={isSelected ? "#29221E" : "#D96827"}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />

                    {/* Day X-Axis Label */}
                    <text
                      x={slotCenterX}
                      y={svgHeight - paddingY + 16}
                      textAnchor="middle"
                      fontSize={d.isToday ? "11" : "10"}
                      fontWeight={isSelected || d.isToday ? "bold" : "600"}
                      fill={isSelected ? "#29221E" : d.isToday ? "#D96827" : "#8B8179"}
                    >
                      {d.dayLabel}
                    </text>

                    {/* Indicator dot for today */}
                    {d.isToday && (
                      <circle
                        cx={slotCenterX}
                        cy={svgHeight - paddingY + 22}
                        r="2"
                        fill="#D96827"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 3 Executive Stat Cards Below Chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] text-left">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                7-Day Total
              </span>
              <div className="text-base sm:text-lg font-black text-[#29221E] font-mono">
                {formatETB(totalWeeklyGross)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] text-left">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                Daily Average
              </span>
              <div className="text-base sm:text-lg font-black text-[#29221E] font-mono">
                {formatETB(weeklyAvg)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] text-left">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                Today&apos;s Gross
              </span>
              <div className="text-base sm:text-lg font-black text-[#D96827] font-mono">
                {formatETB(todayGross)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] text-left">
              <span className="text-[10px] text-[#8B8179] font-bold uppercase block mb-0.5">
                Concession Share
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
        </div>
      )}

      {/* 3. TAB 2: PAYMENT CHANNELS BREAKDOWN */}
      {activeTab === "CHANNELS" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-[#8B8179]">
                Today&apos;s Payment Channel Distribution:
              </span>
              <span className="font-black text-[#29221E] font-mono">
                {formatETB(channelData.total)} total
              </span>
            </div>

            {/* Proportion Bar */}
            <div className="h-4 w-full rounded-xl overflow-hidden flex bg-[#E9D9C5]/50 shadow-inner">
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-[#26845B] h-full transition-all duration-500 relative group"
                title={`Physical Cash: ${cashPct}%`}
              />
              <div
                style={{ width: `${telebirrPct}%` }}
                className="bg-[#D96827] h-full transition-all duration-500 relative group"
                title={`Telebirr: ${telebirrPct}%`}
              />
              <div
                style={{ width: `${cbePct}%` }}
                className="bg-[#29221E] h-full transition-all duration-500 relative group"
                title={`CBE Mobile: ${cbePct}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8B8179] font-mono mt-1.5 px-0.5">
              <span>Cash ({cashPct}%)</span>
              <span>Telebirr ({telebirrPct}%)</span>
              <span>CBE ({cbePct}%)</span>
            </div>
          </div>

          {/* 3 Channel Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cash */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#8B8179] uppercase flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-[#26845B]" />
                  Physical Cash
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
                  {formatETB(channelData.cash)}
                </div>
                <div className="text-[10px] text-[#8B8179]">Notes in counter drawer</div>
              </div>
              <span className="text-base font-black text-[#26845B] bg-[#EBF5F0] px-2.5 py-1 rounded-xl font-mono">
                {cashPct}%
              </span>
            </div>

            {/* Telebirr */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#8B8179] uppercase flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-[#D96827]" />
                  Telebirr
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#D96827] font-mono">
                  {formatETB(channelData.telebirr)}
                </div>
                <div className="text-[10px] text-[#8B8179]">Mobile money transfers</div>
              </div>
              <span className="text-base font-black text-[#D96827] bg-[#FFF4E5] px-2.5 py-1 rounded-xl font-mono">
                {telebirrPct}%
              </span>
            </div>

            {/* CBE */}
            <div className="p-4 rounded-2xl bg-white border border-[#E9D9C5] shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#8B8179] uppercase flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-[#29221E]" />
                  Commercial Bank (CBE)
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#29221E] font-mono">
                  {formatETB(channelData.cbe)}
                </div>
                <div className="text-[10px] text-[#8B8179]">Direct bank deposit</div>
              </div>
              <span className="text-base font-black text-[#29221E] bg-[#F7F6F3] px-2.5 py-1 rounded-xl font-mono">
                {cbePct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: HOURLY CUSTOMER TRAFFIC */}
      {activeTab === "PEAK_HOURS" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F7F6F3] border border-[#E9D9C5] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B8179]">
              Today&apos;s Rental Session Starts by Hour (10:00 - 21:00)
            </span>
            <span className="text-xs font-bold text-[#D96827] bg-[#FFF4E5] px-2.5 py-1 rounded-xl border border-[#E9D9C5]">
              Peak Window: 2:00 PM – 5:00 PM
            </span>
          </div>

          {/* Hourly Traffic Bar Chart */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2 pt-2">
            {hourlyData.map((h, idx) => {
              const heightPct = Math.max(12, Math.round((h.skaters / maxHourlySkaters) * 100));
              const isPeak = h.skaters >= maxHourlySkaters && h.skaters > 0;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-[#E9D9C5] hover:border-[#D96827] transition-all group cursor-pointer"
                  onMouseEnter={() => setHoveredHour(idx)}
                  onMouseLeave={() => setHoveredHour(null)}
                >
                  <span className="text-[11px] font-mono font-bold text-[#29221E]">
                    {h.skaters}
                  </span>
                  <div className="w-full h-24 bg-[#F7F6F3] rounded-lg p-0.5 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-md transition-all duration-300 ${
                        isPeak
                          ? "bg-[#D96827]"
                          : h.skaters > 0
                          ? "bg-[#26845B]"
                          : "bg-[#E9D9C5]/40"
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-[#8B8179] whitespace-nowrap">
                    {h.hourLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

