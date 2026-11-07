//! Right-side slide-over drawer shared by the notify admin pages.

import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface SlideOverProps {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function SlideOver({ title, onClose, footer, children }: SlideOverProps) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-slate-200 px-6 py-4 dark:border-white/10">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
