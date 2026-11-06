"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      // F2: Jump to Rental Board
      if (e.key === "F2") {
        e.preventDefault();
        router.push("/rentals");
      }
      // F3: Jump to Concession POS
      else if (e.key === "F3") {
        e.preventDefault();
        router.push("/concession");
      }
      // F4: Jump to Finances
      else if (e.key === "F4") {
        e.preventDefault();
        router.push("/finances");
      }
      // F7: Jump to Daily Reports
      else if (e.key === "F7") {
        e.preventDefault();
        router.push("/reports");
      }
      // ?: Open shortcuts cheat sheet
      else if (e.key === "?" && !e.shiftKey) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
      // Esc: Close help
      else if (e.key === "Escape") {
        setShowHelp(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <>
      {/* Floating Shortcut Helper Pill on desktop bottom right */}
      <div className="hidden lg:block fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-white transition-all shadow-lg backdrop-blur-sm cursor-pointer"
        >
          <Keyboard className="h-3.5 w-3.5 text-emerald-400" />
          <span>Hotkeys (?)</span>
        </button>
      </div>

      {/* Shortcuts Cheat Sheet Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">POS Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-300">Open Rental Board</span>
                <kbd className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] font-bold text-emerald-400">
                  F2
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-300">Open Snacks POS</span>
                <kbd className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] font-bold text-cyan-400">
                  F3
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-300">Open Finances & Cash</span>
                <kbd className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] font-bold text-amber-400">
                  F4
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-300">Open Daily Reports</span>
                <kbd className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] font-bold text-purple-400">
                  F7
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-300">Close Modals / Cancel</span>
                <kbd className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] font-bold text-zinc-400">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
