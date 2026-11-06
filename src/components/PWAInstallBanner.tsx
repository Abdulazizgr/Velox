"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Share2, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Listen for Android / Chrome / Edge install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native browser install prompt
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Show iOS step-by-step guidance
      setShowIOSModal(true);
    }
  };

  // If already installed or dismissed by user this session, don't show
  if (isInstalled || isDismissed) {
    return null;
  }

  // Show if either browser deferred prompt is available OR on mobile/iOS
  const shouldShow = deferredPrompt !== null || isIOS;
  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom App Install Banner */}
      <div className="fixed bottom-16 md:bottom-5 left-4 right-4 md:left-auto md:right-5 z-50 md:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-[#29221E] text-white border border-[#433832] rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-[#D96827]/40 shadow-sm shrink-0 bg-black">
              <Image
                src="/logo.jpg"
                alt="Velox Skate"
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                Install Velox Skate App
              </h4>
              <p className="text-[11px] text-[#E9D9C5]/80 truncate">
                1-tap home screen & counter access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D96827] hover:bg-[#C2571A] text-white text-xs font-bold transition-all shadow-md shadow-[#D96827]/30 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-[#8B8179] hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-[#29221E]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#D96827]" />
                <h3 className="text-sm font-bold text-[#29221E]">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-[#8B8179] hover:text-[#29221E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5]">
                <div className="h-6 w-6 rounded-full bg-[#D96827] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </div>
                <div className="text-[#29221E]">
                  Tap the <strong className="text-[#D96827]">Share</strong> button{" "}
                  <Share2 className="inline h-3.5 w-3.5 text-[#D96827] mx-0.5" /> at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5]">
                <div className="h-6 w-6 rounded-full bg-[#D96827] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </div>
                <div className="text-[#29221E]">
                  Scroll down the menu and tap{" "}
                  <strong className="text-[#29221E] font-bold">Add to Home Screen</strong>{" "}
                  <PlusSquare className="inline h-3.5 w-3.5 text-[#29221E] mx-0.5" />.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#FFF4E5] border border-[#E9D9C5]">
                <div className="h-6 w-6 rounded-full bg-[#D96827] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </div>
                <div className="text-[#29221E]">
                  Tap <strong className="text-[#29221E] font-bold">Add</strong> in the top-right corner to finish installing.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E9D9C5]">
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Standalone inline button for sidebar or login page
 */
export function PWAInlineButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      alert("To install, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home Screen'.");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        type="button"
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#D96827] bg-[#FFF4E5] hover:bg-[#FCEAD2] border border-[#E9D9C5] transition-all cursor-pointer shadow-xs"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install Velox App</span>
      </button>

      {/* iOS Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-[#29221E]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#D96827]" />
                <h3 className="text-sm font-bold text-[#29221E]">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-[#8B8179] hover:text-[#29221E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <p className="text-[#29221E]">
                1. Tap the <strong>Share</strong> button <Share2 className="inline h-3 w-3 text-[#D96827]" /> in Safari.
              </p>
              <p className="text-[#29221E]">
                2. Select <strong>Add to Home Screen</strong> <PlusSquare className="inline h-3 w-3" />.
              </p>
              <p className="text-[#29221E]">
                3. Tap <strong>Add</strong> in the top right.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E9D9C5]">
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 bg-[#D96827] text-white font-bold text-xs rounded-xl"
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

