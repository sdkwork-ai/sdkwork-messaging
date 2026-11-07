//! Route-level error boundary for the notify admin pages
//! (FRONTEND_CODE_SPEC §7: page-level error boundaries).

import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface PageErrorBoundaryProps {
  children: ReactNode;
}

interface PageErrorBoundaryState {
  failed: boolean;
}

/**
 * Class component by design: only class components can act as React error
 * boundaries. Render failures inside a notify page degrade to a retryable
 * error panel instead of unmounting the whole admin shell.
 */
export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error("notify admin page crashed", error);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return <PageErrorBoundaryFallback />;
    }
    return this.props.children;
  }
}

function PageErrorBoundaryFallback(): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <p>{t("admin.notify.common.renderFailed")}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
      >
        {t("admin.notify.common.retry")}
      </button>
    </div>
  );
}
