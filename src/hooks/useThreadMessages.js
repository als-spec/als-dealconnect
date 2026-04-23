import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Messages for a single thread, plus realtime subscription for inbound updates.
 *
 * Replaces the useState+useEffect+subscribe ceremony that was inline in the
 * Messages page. The hook owns:
 *   - the useQuery for the initial message fetch (scoped to thread_id)
 *   - the realtime subscription that keeps the query cache in sync when
 *     other participants send/edit/delete messages
 *
 * Subscription-to-cache coupling: on a create/update/delete event from
 * Base44, we mutate the react-query cache directly via setQueryData rather
 * than invalidating + refetching. This gives the user immediate feedback
 * (no round-trip) and avoids flicker.
 *
 * @param {string|null} threadId - null means no thread selected; the query stays idle.
 * @returns {{ messages: Array, isLoading: boolean }}
 */
export function useThreadMessages(threadId) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['Message', { thread_id: threadId }],
    queryFn: () =>
      base44.entities.Message.filter({ thread_id: threadId }, 'created_date', 500),
    enabled: !!threadId,
  });

  // Realtime: keep the messages cache in sync as other participants send,
  // edit, or delete messages. Scoped to the selected thread.
  useEffect(() => {
    if (!threadId) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.thread_id !== threadId) return;
      queryClient.setQueryData(['Message', { thread_id: threadId }], (prev = []) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map(m => m.id === event.id ? event.data : m);
        if (event.type === 'delete') return prev.filter(m => m.id !== event.id);
        return prev;
      });
    });
    return unsub;
  }, [threadId, queryClient]);

  return { messages, isLoading };
}
