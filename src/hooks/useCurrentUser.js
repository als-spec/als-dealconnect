import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * React Query key for the current user. Exported so other modules can
 * invalidate or write directly to the cache after mutations.
 */
export const CURRENT_USER_KEY = ['currentUser'];

/**
 * Single source of truth for the authenticated user.
 *
 * Replaces the previous pattern of every page doing:
 *   const [user, setUser] = useState(null);
 *   useEffect(() => { base44.auth.me().then(setUser); }, []);
 *
 * which caused:
 *   - 16 redundant network calls across route transitions
 *   - duplicated loading state in every page
 *   - no dedup when two components needed the user in the same render
 *
 * Usage:
 *   const { data: user, isLoading } = useCurrentUser();
 *
 * Conditional fetch (e.g., wait for auth check to finish before fetching):
 *   const { data: user } = useCurrentUser({ enabled: !isLoadingAuth });
 *
 * @param {object} [options] - Forwarded to useQuery (enabled, staleTime, etc.)
 */
export function useCurrentUser(options = {}) {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes — auth data doesn't change often
    retry: 1,
    ...options,
  });
}

/**
 * Hook that returns a function to invalidate the current-user cache.
 * Call after any mutation that changes user state (updateMe, role change, etc.)
 * so the next consumer sees fresh data.
 *
 * Usage:
 *   const invalidateUser = useInvalidateCurrentUser();
 *   await base44.auth.updateMe({ member_type: 'tc' });
 *   await invalidateUser();  // forces refetch on next useCurrentUser call
 */
export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_KEY });
}

/**
 * Hook that returns a function to imperatively fetch the latest user data,
 * bypassing the cache. Use when you need fresh data right now (e.g., after
 * an update, before reading derived fields).
 *
 * Returns a promise resolving to the fresh user object.
 *
 * Usage:
 *   const refetchUser = useRefetchCurrentUser();
 *   await base44.auth.updateMe({ ... });
 *   const freshUser = await refetchUser();
 */
export function useRefetchCurrentUser() {
  const queryClient = useQueryClient();
  return async () => {
    const data = await queryClient.fetchQuery({
      queryKey: CURRENT_USER_KEY,
      queryFn: () => base44.auth.me(),
      staleTime: 0,
    });
    return data;
  };
}
