"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
} from "lucide-react";

export type ModalType = "info" | "warning" | "error" | "success";

interface AlertOptions {
  title?: string;
  message: string;
  type?: ModalType;
  buttonText?: string;
  onClose?: () => void;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (options: AlertOptions | string) => void;
  showConfirm: (options: ConfirmOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useAlertModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useAlertModal must be used within a ModalAlertProvider");
  }
  return ctx;
}

interface ModalState {
  isOpen: boolean;
  isConfirm: boolean;
  title: string;
  message: string;
  type: ModalType;
  confirmText: string;
  cancelText: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ModalAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    isConfirm: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
    cancelText: "Cancel",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    setIsProcessing(false);
  }, []);

  const showAlert = useCallback(
    (options: AlertOptions | string) => {
      const opts: AlertOptions =
        typeof options === "string" ? { message: options } : options;

      const defaultTitle =
        opts.type === "error"
          ? "Action Failed"
          : opts.type === "warning"
          ? "Attention Required"
          : opts.type === "success"
          ? "Success"
          : "Notice";

      setModal({
        isOpen: true,
        isConfirm: false,
        title: opts.title || defaultTitle,
        message: opts.message,
        type: opts.type || "info",
        confirmText: opts.buttonText || "Got it",
        cancelText: "Cancel",
        onConfirm: () => {
          opts.onClose?.();
          closeModal();
        },
      });
    },
    [closeModal]
  );

  const showConfirm = useCallback(
    (options: ConfirmOptions) => {
      setModal({
        isOpen: true,
        isConfirm: true,
        title: options.title || "Please Confirm",
        message: options.message,
        type: options.type || "warning",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        onConfirm: async () => {
          setIsProcessing(true);
          try {
            await options.onConfirm();
          } finally {
            setIsProcessing(false);
            closeModal();
          }
        },
        onCancel: () => {
          options.onCancel?.();
          closeModal();
        },
      });
    },
    [closeModal]
  );

  // Intercept window.alert so any residual native alert() calls across the app become modal popups
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      const message =
        typeof msg === "string"
          ? msg
          : typeof msg === "object"
          ? JSON.stringify(msg, null, 2)
          : String(msg ?? "");
      showAlert({
        title: "Alert",
        message,
        type: "warning",
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert]);

  const getIcon = () => {
    switch (modal.type) {
      case "error":
        return (
          <div className="h-11 w-11 rounded-2xl bg-[#FDF0EF] border border-[#D94B45]/30 flex items-center justify-center text-[#D94B45] shrink-0">
            <XCircle className="h-6 w-6" />
          </div>
        );
      case "warning":
        return (
          <div className="h-11 w-11 rounded-2xl bg-[#FFF4E5] border border-[#D96827]/30 flex items-center justify-center text-[#D96827] shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
        );
      case "success":
        return (
          <div className="h-11 w-11 rounded-2xl bg-[#EBF5F0] border border-[#26845B]/30 flex items-center justify-center text-[#26845B] shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        );
      default:
        return (
          <div className="h-11 w-11 rounded-2xl bg-[#FFF4E5] border border-[#D96827]/30 flex items-center justify-center text-[#D96827] shrink-0">
            <Info className="h-6 w-6" />
          </div>
        );
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}

      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#FFFDFB] border border-[#E9D9C5] p-5 shadow-2xl relative overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Top decorative accent bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 ${
                modal.type === "error"
                  ? "bg-[#D94B45]"
                  : modal.type === "warning"
                  ? "bg-[#D96827]"
                  : modal.type === "success"
                  ? "bg-[#26845B]"
                  : "bg-[#D96827]"
              }`}
            />

            <div className="flex items-start gap-3.5 pt-1">
              {getIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#29221E] leading-snug">
                    {modal.title}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="p-1 -mr-1 -mt-1 text-[#8B8179] hover:text-[#29221E] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-[#4A3E37] leading-relaxed whitespace-pre-line break-words">
                  {modal.message}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E9D9C5]/80 flex items-center justify-end gap-2.5">
              {modal.isConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    modal.onCancel?.();
                    closeModal();
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl border border-[#E9D9C5] bg-[#F7F6F3] hover:bg-[#E9D9C5]/40 text-xs sm:text-sm font-semibold text-[#8B8179] hover:text-[#29221E] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {modal.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (modal.onConfirm) {
                    modal.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
                disabled={isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                  modal.type === "error"
                    ? "bg-[#D94B45] hover:bg-[#B32620]"
                    : "bg-[#D96827] hover:bg-[#C2571A]"
                }`}
              >
                {isProcessing ? "Processing..." : modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
