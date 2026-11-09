import { queryClient } from "@/lib/react-query-provider";
import { httpStatus } from "./format";

const DEAD_LETTER_KEY_PREFIX = "/api/v1/admin/dead-letters";

/** The part of a query these helpers look at, so they suit a query of any type */
interface QueryWithError {
  state: { error: unknown };
}

/**
 * Refresh everything that shows dead letters after one changes: the lists, the
 * summary (and so the navigation badge) and every message's details. The details
 * of each message have a key of their own, which the list key does not cover.
 */
export function invalidateDeadLetters(): void {
  queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" &&
      query.queryKey[0].startsWith(DEAD_LETTER_KEY_PREFIX),
  });
}

/**
 * Poll every `intervalMs`, except once the server has answered 403: a user who
 * may not see failed messages would otherwise be refused again every interval
 * for as long as the tab stays open.
 */
export function pollUnlessForbidden(intervalMs: number) {
  return (query: QueryWithError): number | false =>
    httpStatus(query.state.error) === 403 ? false : intervalMs;
}

/** Likewise, don't ask again each time the window regains focus after a 403 */
export function refetchOnFocusUnlessForbidden(query: QueryWithError): boolean {
  return httpStatus(query.state.error) !== 403;
}
