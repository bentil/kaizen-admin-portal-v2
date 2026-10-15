/**
 * Extract a user-facing message from an axios-style error response.
 *
 * Tries `response.data.detail` first (FastAPI convention used by the
 * kaizenAdmin service), then `response.data.message` (camelCase services),
 * and finally falls back to the caller-supplied fallback string.
 *
 * FastAPI 422 responses include `detail` as an array of
 * `{type, loc, msg, input}` validation errors. This helper flattens
 * that into a human-readable string so it never gets passed as-is to
 * a React renderer (e.g. toast.error, which crashes on non-scalars).
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } })?.response?.data as
        | { detail?: unknown; details?: unknown; message?: string }
        | undefined;

    if (data && typeof data === "object") {
        const detail = data.detail ?? data.details;
        if (typeof detail === "string") return detail;
        if (Array.isArray(detail)) {
            // FastAPI 422: array of { type, loc: string[], msg, input }
            const messages = detail
                .map((entry) => {
                    if (typeof entry === "string") return entry;
                    if (entry && typeof entry === "object") {
                        const e = entry as { msg?: string; loc?: unknown[] };
                        const locPath = Array.isArray(e.loc)
                            ? e.loc.filter((p) => typeof p === "string" || typeof p === "number").join(".")
                            : "";
                        const base = e.msg ?? "Validation error";
                        return locPath ? `${base} at ${locPath}` : base;
                    }
                    return "";
                })
                .filter(Boolean);
            if (messages.length > 0) return messages.join("; ");
        }
        if (typeof data.message === "string") return data.message;
    }

    const topLevelMsg = (err as { message?: string })?.message;
    if (typeof topLevelMsg === "string" && topLevelMsg) return topLevelMsg;

    return fallback;
}
