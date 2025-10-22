// web/src/ui/toast/ToastProvider.tsx
// @ts-nocheck

/****************************************************
 * [LMK: GLOBAL TOAST — IMPORTS]
 ****************************************************/
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/****************************************************
 * [LMK: GLOBAL TOAST — TYPES]
 ****************************************************/
type ToastKind = "success" | "error" | "info";
type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  sticky?: boolean;   // if true, won’t auto dismiss
  ttlMs?: number;     // override default
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, opts?: Partial<Pick<Toast, "sticky" | "ttlMs">>) => void;
  showToastOk: (message: string, opts?: Partial<Pick<Toast, "sticky" | "ttlMs">>) => void;
  showToastErr: (message: string, opts?: Partial<Pick<Toast, "sticky" | "ttlMs">>) => void;
  clearToast: () => void;
};

/****************************************************
 * [LMK: GLOBAL TOAST — CONTEXT]
 ****************************************************/
const ToastContext = createContext<ToastContextValue | null>(null);
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/****************************************************
 * [LMK: GLOBAL TOAST — PROVIDER]
 ****************************************************/
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const lastIdRef = useRef(0);

  const clearTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const clearToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  // ESC to dismiss
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearToast();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearToast]);

  const showToast = useCallback((message: string, kind: ToastKind = "info", opts?: Partial<Pick<Toast, "sticky" | "ttlMs">>) => {
    clearTimer();
    const id = ++lastIdRef.current;
    const sticky = !!opts?.sticky;
    const ttlMs = typeof opts?.ttlMs === "number" ? opts.ttlMs : (kind === "error" ? 6000 : 3500);
    const next: Toast = { id, message, kind, sticky, ttlMs };
    setToast(next);

    if (!sticky) {
      closeTimerRef.current = window.setTimeout(() => {
        // only clear if this is still the same toast (avoid racing)
        setToast((curr) => (curr?.id === id ? null : curr));
        closeTimerRef.current = null;
      }, ttlMs) as unknown as number;
    }
  }, []);

  const showToastOk  = useCallback((msg: string, opts?: Partial<Pick<Toast, "sticky" | "ttlMs">>) => showToast(msg, "success", opts), [showToast]);
  const showToastErr = useCallback((msg: string, opts?: Partial<Pick<Toast, "sticky" | "ttlMs">>) => showToast(msg, "error", opts),   [showToast]);

  const value: ToastContextValue = { showToast, showToastOk, showToastErr, clearToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPortal toast={toast} onClose={clearToast} />
    </ToastContext.Provider>
  );
}

/****************************************************
 * [LMK: GLOBAL TOAST — PRESENTATION / PORTAL]
 ****************************************************/
function ToastPortal({ toast, onClose }: { toast: Toast | null; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex justify-center"
    >
      {toast ? (
        <div
          role="status"
          className={[
            "pointer-events-auto shadow-lg rounded-xl border px-4 py-2 text-sm backdrop-blur-md transition-all duration-300",
            toast.kind === "success" ? "bg-emerald-50/90 border-emerald-200 text-emerald-800" :
            toast.kind === "error"   ? "bg-rose-50/90    border-rose-200    text-rose-800" :
                                       "bg-sky-50/90     border-sky-200     text-sky-800",
            "max-w-[90vw]"
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5">
              {toast.kind === "success" ? "✅" : toast.kind === "error" ? "⛔" : "ℹ️"}
            </span>
            <div className="whitespace-pre-wrap">{toast.message}</div>
            <button
              className="ml-2 rounded-md border px-2 py-0.5 text-xs hover:bg-white/60"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <span className="sr-only">No notifications</span>
      )}
    </div>,
    document.body
  );
}