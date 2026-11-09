"use client";

import {
  pollUnlessForbidden,
  refetchOnFocusUnlessForbidden,
} from "@/components/dead-letters/queries";
import { useGetDeadLetterSummary } from "@/lib/generated/billing/admin/admin";

/**
 * How many failed messages are still waiting to be replayed. Zero while loading
 * and when it can't be known (e.g. the user lacks the operations permission), so
 * callers can show a badge or banner only when there is something to see. After a
 * 403 it stops polling, so a user without access isn't refused every minute.
 */
export function usePendingDeadLetterCount(enabled = true): number {
  const { data } = useGetDeadLetterSummary({
    query: {
      enabled,
      refetchInterval: pollUnlessForbidden(60_000),
      refetchOnWindowFocus: refetchOnFocusUnlessForbidden,
      staleTime: 30_000,
      retry: false,
    },
  });
  return (data?.data ?? []).reduce((sum, topic) => sum + topic.pending, 0);
}
