import type { BrowserContext, Page, Route } from "@playwright/test";

/**
 * An in-memory stand-in for the billing service's dead-letter admin API, so the
 * Failed Messages screens can be exercised without that service. It mirrors the
 * real API's rules, including its validation, so the UI is held to them:
 *  - replaying needs force=true, and a failed replay leaves the message pending;
 *  - bulk replay reports named messages that are missing or not pending as failed;
 *  - a purge needs a criterion, and without ids reaches replayed messages only;
 *  - ids and limits are capped, and a date range may not end before it starts.
 */

export interface FakeMessage {
  id: number;
  topic: string;
  status: "PENDING" | "REPLAYED";
  failedAt: string;
  error: string;
  errorStack: string | null;
  attempts: number;
  requestId: string | null;
  messageKey: string | null;
  kafkaPartition: number;
  kafkaOffset: string;
  payload: unknown;
  payloadHash: string;
  headers: Record<string, string> | null;
  replayCount: number;
  lastReplayError: string | null;
  lastReplayedAt: string | null;
  lastReplayedBy: { id: string; username: string; name: string | null } | null;
  replayStartedAt: string | null;
  replayedAt: string | null;
}

let nextId = 1;

export function makeMessage(overrides: Partial<FakeMessage> = {}): FakeMessage {
  const id = overrides.id ?? nextId++;
  return {
    id,
    topic: "event.Project.created",
    status: "PENDING",
    // Later messages failed later, as in the real queue
    failedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + id * 1000).toISOString(),
    error: "Unique constraint failed on the fields: (`name`)",
    errorStack: "Error: Unique constraint failed\n    at project.repository.ts:12:5",
    attempts: 3,
    requestId: `req-${id}`,
    messageKey: null,
    kafkaPartition: 0,
    kafkaOffset: String(id),
    payload: { id, name: `Project ${id}`, requestId: `req-${id}` },
    payloadHash: "a".repeat(64),
    headers: null,
    replayCount: 0,
    lastReplayError: null,
    lastReplayedAt: null,
    lastReplayedBy: null,
    replayStartedAt: null,
    replayedAt: null,
    ...overrides,
  };
}

const MAX_LIST_LIMIT = 100;
const MAX_BULK = 500;
const NOT_PENDING = "Dead letter message is not pending or does not exist";

export class FakeDeadLetterApi {
  messages: FakeMessage[];
  /** Ids whose replay still fails */
  failingReplays = new Set<number>();
  /** Ids that another replay is already running for */
  busy = new Set<number>();
  /** Answer every dead-letter endpoint with 403 */
  forbidden = false;
  /** Answer only the changing endpoints (replay, purge, delete) with 403 */
  forbiddenMutations = false;
  /** Drop the connection on the next bulk replay, as a timeout would */
  dropNextBulkReplay = false;
  requests: { method: string; path: string; query: Record<string, string>; body: unknown }[] = [];

  constructor(messages: FakeMessage[] = []) {
    this.messages = messages;
  }

  calls(method: string, pathPrefix: string): typeof this.requests {
    return this.requests.filter((r) => r.method === method && r.path.startsWith(pathPrefix));
  }

  async install(target: Page | BrowserContext): Promise<void> {
    await target.route(/api\.sandbox\.kaizen-aceit\.com/, (route) => this.handle(route));
  }

  private json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      },
      body: body === undefined ? "" : JSON.stringify(body),
    });
  }

  private invalid(route: Route, message: string): Promise<void> {
    return this.json(route, 400, {
      error: "REQUEST_VALIDATION_FAILED",
      message: "Request validation failed",
      details: [message],
    });
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    if (method === "OPTIONS") return this.json(route, 204, undefined);

    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/billing/, "");
    const query = Object.fromEntries(url.searchParams.entries());
    const body = request.postData() ? JSON.parse(request.postData() as string) : undefined;

    if (!path.startsWith("/api/v1/admin/dead-letters")) {
      // Everything else the shell asks for (current user and so on)
      return this.json(route, 200, { data: {} });
    }
    this.requests.push({ method, path, query, body });

    const rest = path.replace("/api/v1/admin/dead-letters", "");
    if (this.forbidden || (this.forbiddenMutations && method !== "GET")) {
      return this.json(route, 403, { error: "FORBIDDEN", message: "Permission denied" });
    }

    if (method === "GET" && rest === "") return this.list(route, query);
    if (method === "GET" && rest === "/summary") return this.summary(route);
    if (method === "POST" && rest === "/replay") return this.replayMany(route, body ?? {});
    if (method === "POST" && rest === "/purge") return this.purge(route, body ?? {});

    const id = Number(rest.split("/")[1]);
    const message = this.messages.find((m) => m.id === id);
    if (!message) {
      return this.json(route, 404, { error: "DEAD_LETTER_NOT_FOUND", message: "Dead letter message does not exist" });
    }
    if (method === "GET") return this.json(route, 200, { data: message });
    if (method === "DELETE") {
      this.messages = this.messages.filter((m) => m.id !== id);
      return this.json(route, 204, undefined);
    }
    if (method === "POST" && rest.endsWith("/replay")) {
      if (message.status === "REPLAYED") {
        return this.json(route, 409, { error: "INVALID_STATE", message: "Dead letter message has already been replayed" });
      }
      if (query.force !== "true") return this.requiresForce(route);
      if (this.busy.has(id)) {
        return this.json(route, 409, { error: "INVALID_STATE", message: "Dead letter message is already being replayed" });
      }
      return this.json(route, 200, { data: this.replay(message) });
    }
    return this.json(route, 404, { error: "NOT_FOUND", message: "Not found" });
  }

  private requiresForce(route: Route): Promise<void> {
    return this.json(route, 409, {
      error: "REPLAY_REQUIRES_FORCE",
      message: "Replaying applies a message as it was received... replay again with force=true.",
    });
  }

  private replay(message: FakeMessage): { id: number; replayed: boolean; error?: string } {
    message.replayCount += 1;
    message.lastReplayedAt = new Date().toISOString();
    message.lastReplayedBy = { id: "u1", username: "admin", name: "Ada Admin" };
    if (this.failingReplays.has(message.id)) {
      message.lastReplayError = "Unique constraint failed on the fields: (`name`)";
      return { id: message.id, replayed: false, error: message.lastReplayError };
    }
    message.status = "REPLAYED";
    message.replayedAt = message.lastReplayedAt;
    message.lastReplayError = null;
    return { id: message.id, replayed: true };
  }

  private list(route: Route, query: Record<string, string>): Promise<void> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    if (limit > MAX_LIST_LIMIT) {
      return this.invalid(route, `limit must be less than or equal to ${MAX_LIST_LIMIT}`);
    }
    if (query.failedFrom && query.failedTo && query.failedTo < query.failedFrom) {
      return this.invalid(route, "failedTo must not be before failedFrom");
    }
    let items = this.messages.filter(
      (m) =>
        (!query.status || m.status === query.status) &&
        (!query.topic || m.topic === query.topic) &&
        (!query.requestId || m.requestId === query.requestId) &&
        (!query.failedFrom || m.failedAt >= query.failedFrom) &&
        (!query.failedTo || m.failedAt <= query.failedTo),
    );
    const direction = query.orderBy === "failedAt:asc" ? 1 : -1;
    items = items.sort((a, b) => direction * (a.failedAt.localeCompare(b.failedAt) || a.id - b.id));
    return this.json(route, 200, {
      data: items.slice((page - 1) * limit, page * limit),
      pagination: {
        totalCount: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / limit)),
        page,
        limit,
      },
    });
  }

  private summary(route: Route): Promise<void> {
    const topics = [...new Set(this.messages.map((m) => m.topic))].sort();
    const data = topics.map((topic) => {
      const mine = this.messages.filter((m) => m.topic === topic);
      const pending = mine.filter((m) => m.status === "PENDING");
      return {
        topic,
        pending: pending.length,
        replayed: mine.length - pending.length,
        oldestPendingFailedAt: pending.map((m) => m.failedAt).sort()[0] ?? null,
      };
    });
    return this.json(route, 200, { data });
  }

  private async replayMany(
    route: Route,
    body: { ids?: number[]; topic?: string; limit?: number; force?: boolean },
  ): Promise<void> {
    if (body.ids && (body.ids.length < 1 || body.ids.length > MAX_BULK || new Set(body.ids).size !== body.ids.length)) {
      return this.invalid(route, `ids must contain between 1 and ${MAX_BULK} unique values`);
    }
    if (body.limit !== undefined && (body.limit < 1 || body.limit > MAX_BULK)) {
      return this.invalid(route, `limit must be between 1 and ${MAX_BULK}`);
    }
    if (!body.force) return this.requiresForce(route);
    if (this.dropNextBulkReplay) {
      this.dropNextBulkReplay = false;
      return route.abort("timedout");
    }

    const limit = Math.min(body.limit ?? body.ids?.length ?? 100, MAX_BULK);
    const pending = this.messages
      .filter((m) => m.status === "PENDING")
      .filter((m) => !body.ids || body.ids.includes(m.id))
      .filter((m) => !body.topic || m.topic === body.topic)
      .sort((a, b) => a.id - b.id)
      .slice(0, limit);
    const results = pending.map((m) => this.replay(m));
    // Named messages that are missing or not pending are reported, unless a limit cut the run short
    if (pending.length < limit) {
      const found = new Set(pending.map((m) => m.id));
      (body.ids ?? [])
        .filter((id) => !found.has(id))
        .forEach((id) => results.push({ id, replayed: false, error: NOT_PENDING }));
    }
    const replayed = results.filter((r) => r.replayed).length;
    return this.json(route, 200, {
      data: { attempted: results.length, replayed, failed: results.length - replayed, results },
    });
  }

  private purge(
    route: Route,
    body: { ids?: number[]; topic?: string; status?: string; failedBefore?: string },
  ): Promise<void> {
    if (body.ids && (body.ids.length < 1 || body.ids.length > MAX_BULK)) {
      return this.invalid(route, `ids must contain between 1 and ${MAX_BULK} values`);
    }
    const named = !!body.ids?.length;
    if (!named && !body.topic && !body.status && !body.failedBefore) {
      return this.invalid(route, "Provide at least one of ids, topic, status or failedBefore");
    }
    if (!named && body.status === "PENDING") {
      return this.invalid(route, "Pending messages can only be purged by explicit ids");
    }
    const matches = (m: FakeMessage): boolean =>
      (named ? body.ids!.includes(m.id) : m.status === "REPLAYED") &&
      (!body.topic || m.topic === body.topic) &&
      (!named || !body.status || m.status === body.status) &&
      (!body.failedBefore || m.failedAt < body.failedBefore);
    const doomed = this.messages.filter(matches);
    this.messages = this.messages.filter((m) => !matches(m));
    return this.json(route, 200, { data: { deleted: doomed.length } });
  }
}

/** Log in as a platform admin without a backend */
export async function seedAdminSession(target: Page | BrowserContext): Promise<void> {
  const user = {
    id: "u1",
    username: "admin",
    firstName: "Ada",
    lastName: "Admin",
    name: "Ada Admin",
    emailAddress: "ada@example.com",
    email: "ada@example.com",
  };
  await target.addInitScript((u) => {
    localStorage.setItem("auth_token", "test-token");
    localStorage.setItem("auth_user", JSON.stringify(u));
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { user: u, token: "test-token", isAuthenticated: true }, version: 0 }),
    );
  }, user);
}
