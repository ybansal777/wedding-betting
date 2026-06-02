import { createContext, useCallback, useContext, useState } from "react";

// In-app toast notifications — replaces all native alert()/confirm() dialogs so
// the app never triggers browser/tab popups. Call useToast() to get notify().

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

const TONES = {
  info: "bg-mauve-deep text-cream-card",
  error: "bg-blush-deep text-cream-card",
  success: "bg-sage-deep text-cream-card",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone: opts.tone || "info" }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      opts.duration || 3200
    );
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lift animate-pop-in ${
              TONES[t.tone] || TONES.info
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
