import { format, formatDistanceToNowStrict } from "date-fns";

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | null): string {
  const date = toDate(value);
  return date ? format(date, "dd MMM yyyy, HH:mm") : "—";
}

export function formatAge(value?: string | null): string {
  const date = toDate(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : "—";
}

export function truncate(text: string | null | undefined, max = 90): string {
  if (!text) return "";
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

/** The HTTP status of an Axios-style error, if it has one */
export function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/** Start of the given day (local time) as an ISO timestamp, from a yyyy-MM-dd value */
export function startOfDayIso(day: string): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** End of the given day (local time) as an ISO timestamp, from a yyyy-MM-dd value */
export function endOfDayIso(day: string): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Whether a request may have reached the server without us seeing its answer: it
 * timed out or the connection failed. The work may well still be running there.
 */
export function isTimeoutOrNetworkError(err: unknown): boolean {
  const e = err as { code?: string; response?: unknown; request?: unknown };
  return e?.code === "ECONNABORTED" || e?.code === "ETIMEDOUT" || (!e?.response && !!e?.request);
}
