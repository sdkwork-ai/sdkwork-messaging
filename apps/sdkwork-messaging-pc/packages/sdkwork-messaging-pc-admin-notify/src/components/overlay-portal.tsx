//! Shared overlay container for dialogs and drawers.
//!
//! Every overlay in this package renders into `document.body` through a portal.
//! The admin channel pages scroll inside an `overflow-y-auto` container, which
//! becomes the containing block for positioned descendants: a plain `fixed`
//! overlay is then clipped to the scroll area and can be covered by sibling
//! panels. Portalling to `body` escapes both the clipping and the sibling
//! stacking contexts, so an overlay always covers the viewport.

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface OverlayPortalProps {
  children: ReactNode;
  /** Close when the scrim (not the panel) is pressed. */
  onDismiss?: () => void;
  /** Close on Escape. */
  onEscape?: () => void;
  /** Prevent background scrolling while open. Defaults to true. */
  lockScroll?: boolean;
  /** Tailwind z-index utility for the overlay layer. */
  zIndexClass?: string;
  /** Extra classes applied to the scrim wrapper. */
  className?: string;
}

export function OverlayPortal({
  children,
  onDismiss,
  onEscape,
  lockScroll = true,
  zIndexClass = "z-[100]",
  className = "",
}: OverlayPortalProps) {
  useEffect(() => {
    if (!onEscape) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onEscape]);

  useEffect(() => {
    if (!lockScroll) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lockScroll]);

  const overlay = (
    <div
      className={`fixed inset-0 ${zIndexClass} ${className}`.trim()}
      onMouseDown={(event) => {
        // Only a press on the scrim itself dismisses; presses inside the panel
        // bubble here but have a different target.
        if (event.target === event.currentTarget) {
          onDismiss?.();
        }
      }}
    >
      {children}
    </div>
  );

  // No portal target during SSR/tests without a DOM: render inline so the
  // overlay still exists instead of silently disappearing.
  if (typeof document === "undefined") {
    return overlay;
  }
  return createPortal(overlay, document.body);
}
