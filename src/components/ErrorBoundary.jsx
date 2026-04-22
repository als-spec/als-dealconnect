import { Component } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

/**
 * React error boundary. Catches render-phase errors in any child component
 * and renders a recoverable fallback instead of a white screen.
 *
 * Does NOT catch:
 *   - Errors in event handlers (React's design — use try/catch there)
 *   - Errors in async code (promise rejections — use toast.error via useQuery/useMutation)
 *   - Errors during SSR (not applicable here, Vite client-only)
 *
 * For those cases, the QueryCache onError handler in query-client.js surfaces
 * react-query errors as toasts, and the global unhandledrejection listener
 * in main.jsx catches stray promise rejections.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <Routes>...</Routes>
 *   </ErrorBoundary>
 *
 *   // Or with a custom fallback renderer
 *   <ErrorBoundary fallback={(error, reset) => <MyFallback onRetry={reset} />}>
 *     <Child />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log full context for debugging. In production this is the hook point
    // for Sentry/Datadog/LogRocket — wire up here when observability lands.
    console.error("[ErrorBoundary] Caught:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  goHome = () => {
    // Hard navigation. Ensures any corrupt in-memory state from the crash
    // doesn't persist — we get a fresh render from the landing page.
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Allow parent to customize via render-prop fallback
    if (typeof this.props.fallback === "function") {
      return this.props.fallback(this.state.error, this.reset);
    }

    const message =
      this.state.error?.message || "An unexpected error occurred";

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-sm p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-navy">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The page hit an unexpected error. Your work in other tabs is not affected.
            </p>
          </div>

          {/* Technical details — only visible if explicitly expanded.
              Avoids scaring non-technical users but keeps info available. */}
          <details className="text-left bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium select-none">
              Technical details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono">
              {message}
            </pre>
          </details>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={this.reset}
              className="flex-1 gradient-primary text-white font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Try again
            </button>
            <button
              onClick={this.goHome}
              className="flex-1 bg-white border border-border text-navy font-semibold px-4 py-2.5 rounded-lg hover:bg-muted transition-colors inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Go home
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            If this keeps happening, please contact support.
          </p>
        </div>
      </div>
    );
  }
}
