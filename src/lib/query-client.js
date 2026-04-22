import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Shared React Query client for the whole app.
 *
 * Error handling strategy:
 *   - queryCache.onError    — fires for any query error (useQuery, useCurrentUser,
 *                              etc). Only toasts when there was previously cached
 *                              data, so initial-load failures don't double up with
 *                              the per-page "failed to load" state.
 *   - mutationCache.onError — fires for any mutation error. Log-only, because most
 *                              call sites already handle their own mutation failures
 *                              with try/catch + toast.error (see Applications.jsx,
 *                              Messages.jsx, ServiceRequests.jsx). Adding a toast
 *                              here would duplicate. When T2.2 migrates those sites
 *                              to useMutation, the toast can centralize here and
 *                              local handlers can drop.
 *
 * These handlers are the safety net under react-query. Component-level errors
 * (render crashes, null derefs, etc.) are caught by the ErrorBoundary in App.jsx.
 */
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			// Only toast for BACKGROUND refresh failures — the user had data on
			// screen and a silent refetch failed. Initial-load failures render
			// their own empty/error state in the consuming component.
			if (query.state.data !== undefined) {
				toast.error("We couldn't refresh this data. Please try again.");
			}
			console.error("[queryCache] Query error:", error);
		},
	}),
	mutationCache: new MutationCache({
		onError: (error) => {
			console.error("[mutationCache] Mutation error:", error);
		},
	}),
});