//! Right-side slide-over drawer shared by the notify admin pages.
//!
//! Rendered through [`OverlayPortal`] so it escapes the page's scrolling
//! container. A plain `fixed` overlay was previously clipped to the scroll area
//! and could be covered by sibling panels (the provider directory), leaving the
//! header and its close button unreachable.

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { OverlayPortal } from "./overlay-portal";

export interface SlideOverProps {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function SlideOver({ title, onClose, footer, children }: SlideOverProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer so keyboard and screen-reader users land in it,
  // and restore the previous focus when it closes.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <OverlayPortal
      onDismiss={onClose}
      onEscape={onClose}
      className="flex justify-end bg-slate-900/30"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl dark:bg-[#1a1a1a]"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <h2
            id={titleId}
            className="min-w-0 truncate text-base font-semibold text-slate-800 dark:text-white"
            title={title}
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-200 px-6 py-4 dark:border-white/10">
            {footer}
          </div>
        ) : null}
      </div>
    </OverlayPortal>
  );
}
