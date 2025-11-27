"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Notification {
  id: number;
  type: "success" | "error";
  message: string;
  requireConfirm?: boolean;
}

interface NotificationContextType {
  success: (message: string, requireConfirm?: boolean) => void;
  error: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
}

let notificationId = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modal, setModal] = useState<Notification | null>(null);

  const addNotification = useCallback((type: "success" | "error", message: string, requireConfirm?: boolean) => {
    const id = ++notificationId;
    if (requireConfirm) {
      setModal({ id, type, message, requireConfirm: true });
    } else {
      setNotifications(prev => {
        const updated = prev.length >= 3 ? prev.slice(1) : prev;
        return [...updated, { id, type, message }];
      });
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }
  }, []);

  const success = useCallback((message: string, requireConfirm?: boolean) => addNotification("success", message, requireConfirm), [addNotification]);
  const error = useCallback((message: string) => addNotification("error", message), [addNotification]);

  return (
    <NotificationContext.Provider value={{ success, error }}>
      {children}
      {/* Notification container - centered at top, similar to iPhone Dynamic Island */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-full max-w-md pointer-events-none">
        {notifications.map((n, idx) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border animate-slide-down min-w-[320px] transition-all duration-300 ${
              n.type === "success" 
                ? "bg-zinc-900/90 border-green-500/20 text-white shadow-green-900/10" 
                : "bg-zinc-900/90 border-red-500/20 text-white shadow-red-900/10"
            }`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {n.type === "success" ? (
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span className="text-sm font-medium flex-1">{n.message}</span>
            <button
              onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
              className="text-zinc-500 hover:text-white shrink-0 p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Modal Dialog */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modal.type === "success" ? "bg-green-500/20" : "bg-red-500/20"}`}>
                {modal.type === "success" ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className="text-white font-medium">{modal.type === "success" ? "Success" : "Failed"}</h3>
            </div>
            <p className="text-zinc-300 text-sm mb-6 whitespace-pre-line">{modal.message}</p>
            <button
              onClick={() => setModal(null)}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
