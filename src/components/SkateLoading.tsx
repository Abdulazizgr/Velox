"use client";

import React from "react";

interface SkateLoadingProps {
  label?: string;
  size?: "sm" | "md" | "lg" | "fullscreen";
}

export function SkateLoading({
  label = "Gliding in...",
  size = "md",
}: SkateLoadingProps) {
  const isFullscreen = size === "fullscreen";

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      {/* Animated Skate Shoe */}
      <div className="relative mb-3 flex items-center justify-center">
        {/* Skate Shoe SVG */}
        <div className="animate-skate-glide text-[#D96827]">
          <svg
            width={size === "sm" ? 44 : size === "lg" || isFullscreen ? 76 : 58}
            height={size === "sm" ? 44 : size === "lg" || isFullscreen ? 76 : 58}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
          >
            {/* Boot Body */}
            <path
              d="M18 10C18 7.79 19.79 6 22 6H34C36.21 6 38 7.79 38 10V22C38 23.5 39 25 41 26L48 29.5C51 31 53 34 53 37.5V42C53 43.1 52.1 44 51 44H18C15.79 44 14 42.21 14 40V14C14 11.79 15.79 10 18 10Z"
              fill="#29221E"
            />
            {/* Boot Collar / Accent */}
            <path
              d="M20 6H36C37.1 6 38 6.9 38 8V12H18V8C18 6.9 18.9 6 20 6Z"
              fill="#D96827"
            />
            {/* Laces / Eyelets */}
            <path
              d="M28 14H34M29 19H35M30 24H37M34 29H42"
              stroke="#FFF4E5"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Toe Cap Accent */}
            <path
              d="M44 33L50 36C51.5 37 52.5 38.5 52.5 40.5V42H42V33H44Z"
              fill="#D96827"
            />
            {/* Sole Frame */}
            <rect
              x="12"
              y="44"
              width="43"
              height="4"
              rx="2"
              fill="#8B8179"
            />
            {/* Wheel Struts */}
            <rect x="18" y="48" width="3" height="4" fill="#433832" />
            <rect x="29" y="48" width="3" height="4" fill="#433832" />
            <rect x="40" y="48" width="3" height="4" fill="#433832" />
            <rect x="48" y="48" width="3" height="4" fill="#433832" />
            {/* Wheels */}
            <circle cx="19.5" cy="54" r="5" fill="#D96827" className="animate-spin-slow origin-[19.5px_54px]" />
            <circle cx="19.5" cy="54" r="2" fill="#FFF4E5" />
            <circle cx="30.5" cy="54" r="5" fill="#D96827" className="animate-spin-slow origin-[30.5px_54px]" />
            <circle cx="30.5" cy="54" r="2" fill="#FFF4E5" />
            <circle cx="41.5" cy="54" r="5" fill="#D96827" className="animate-spin-slow origin-[41.5px_54px]" />
            <circle cx="41.5" cy="54" r="2" fill="#FFF4E5" />
            <circle cx="49.5" cy="54" r="5" fill="#D96827" className="animate-spin-slow origin-[49.5px_54px]" />
            <circle cx="49.5" cy="54" r="2" fill="#FFF4E5" />
          </svg>
        </div>

        {/* Ice / Rink Track Glide Shadow */}
        <div className="absolute -bottom-1 w-20 h-1.5 bg-[#D96827]/25 rounded-full blur-[2px] animate-skate-track" />
      </div>

      {/* Label */}
      {label && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-[#29221E] tracking-wide uppercase font-sans animate-pulse">
            {label}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D96827] animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#D96827] animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#D96827] animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F6F3]/90 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-3xl border border-[#E9D9C5] shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export default SkateLoading;
