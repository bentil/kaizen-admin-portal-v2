import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";
import { FakeDeadLetterApi, makeMessage, seedAdminSession } from "./dead-letters.mock";

// These run against an in-memory fake of the billing API (see dead-letters.mock.ts),
// so they need neither that service nor a real login of their own. They still run
// behind the suite's global setup when it is enabled. Both the desktop and the
// mobile project run them: tables on desktop, cards on a phone.

const BASE = "/api/v1/admin/dead-letters";
const isMobile = (info: TestInfo) => info.project.name === "chromium-mobile";

function seed(): FakeDeadLetterApi {
  return new FakeDeadLetterApi([
    makeMessage({ id: 1, topic: "event.Project.created", requestId: "req-1" }),
    makeMessage({ id: 2, topic: "event.Project.created", requestId: "req-2" }),
    makeMessage({
      id: 3,
      topic: "event.Product",
      requestId: "req-3",
      error: "Cannot read properties of undefined (reading 'id')",
    }),
    makeMessage({
      id: 4,
      topic: "event.Project.created",
      status: "REPLAYED",
      requestId: "req-4",
      replayCount: 1,
      replayedAt: new Date().toISOString(),
    }),
  ]);
}

async function open(page: Page, api: FakeDeadLetterApi, path = "/admin/dead-letters") {
  await seedAdminSession(page);
  await api.install(page);
  await page.goto(path);
}

// A message shows as a table row on a desktop and as a card on a phone; only one is visible
const row = (page: Page, id: number) =>
  page
    .locator(`[data-testid="dead-letter-row-${id}"], [data-testid="dead-letter-card-${id}"]`)
    .filter({ visible: true });

async function replayViaDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /I understand/ }).click();
  await dialog.getByRole("button", { name: "Replay", exact: true }).click();
  return dialog;
}

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

test.describe("Failed Messages", () => {
  // A render crash (e.g. a typo in a rarely-seen state) must fail the test even
  // when the assertions happen to pass
  let pageErrors: string[];
  test.beforeEach(({ page }) => {
    pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
  });
  test.afterEach(() => {
    expect(pageErrors, "uncaught errors in the page").toEqual([]);
  });

  test.describe("viewing", () => {
    test("lists pending messages with a summary and a count in the navigation", async ({ page }, info) => {
      await open(page, seed());

      await expect(page.getByRole("heading", { name: "Failed Messages" })).toBeVisible();
      await expect(row(page, 1)).toBeVisible();
      await expect(row(page, 2)).toBeVisible();
      await expect(row(page, 3)).toBeVisible();
      await expect(row(page, 4)).toHaveCount(0); // replayed: not in the default Pending view

      await expect(page.getByTestId("stat-pending")).toContainText("3");
      await expect(page.getByTestId("stat-replayed")).toContainText("1");
      // On a phone the sidebar is a sheet that isn't mounted until opened
      if (!isMobile(info)) await expect(page.getByLabel("3 pending")).toBeVisible();
    });

    test("filters by topic, status and request ID", async ({ page }) => {
      await open(page, seed());
      await expect(row(page, 1)).toBeVisible();

      await page.getByRole("button", { name: /event\.Product/ }).click();
      await expect(row(page, 3)).toBeVisible();
      await expect(row(page, 1)).toHaveCount(0);
      await page.getByRole("button", { name: /event\.Product/ }).click(); // toggle off
      await expect(row(page, 1)).toBeVisible();

      await page.getByRole("button", { name: "Replayed", exact: true }).click();
      await expect(row(page, 4)).toBeVisible();
      await expect(row(page, 1)).toHaveCount(0);

      await page.getByRole("button", { name: "All", exact: true }).click();
      await expect(row(page, 1)).toBeVisible();
      await expect(row(page, 4)).toBeVisible();

      await page.getByLabel("Request ID").fill("req-2");
      await expect(row(page, 2)).toBeVisible();
      await expect(row(page, 1)).toHaveCount(0);
    });

    test("filters by when they failed", async ({ page }) => {
      const api = new FakeDeadLetterApi([
        makeMessage({ id: 1, failedAt: daysAgo(10).toISOString() }),
        makeMessage({ id: 2, failedAt: daysAgo(0).toISOString() }),
      ]);
      await open(page, api);
      await expect(row(page, 1)).toBeVisible();
      await expect(row(page, 2)).toBeVisible();

      await page.getByLabel("Failed from").fill(localDay(daysAgo(5)));
      await expect(row(page, 2)).toBeVisible();
      await expect(row(page, 1)).toHaveCount(0);
      expect(api.calls("GET", BASE).at(-1)?.query.failedFrom).toBeTruthy();

      await page.getByLabel("Failed from").fill("");
      await page.getByLabel("Failed to").fill(localDay(daysAgo(5)));
      await expect(row(page, 1)).toBeVisible();
      await expect(row(page, 2)).toHaveCount(0);
    });

    test("explains a date range that ends before it starts, rather than asking the API", async ({ page }) => {
      const api = seed();
      await open(page, api);
      await expect(row(page, 1)).toBeVisible();

      await page.getByLabel("Failed from").fill(localDay(daysAgo(2)));
      await page.getByLabel("Failed to").fill(localDay(daysAgo(8)));

      await expect(page.getByText(/must be on or after/)).toBeVisible();
      await expect(row(page, 1)).toBeVisible(); // the unusable range is ignored; no error page
      // The API would answer 400, so no request may ever have carried the bad range
      const lists = api.calls("GET", BASE).filter((c) => c.path === BASE);
      expect(lists.some((c) => c.query.failedFrom && c.query.failedTo)).toBe(false);
    });

    test("shows why a message failed and its payload", async ({ page }) => {
      await open(page, seed());

      await page.getByRole("button", { name: "View message 3" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Message #3")).toBeVisible();
      await expect(dialog.getByText("Cannot read properties of undefined (reading 'id')")).toBeVisible();
      await expect(dialog.getByTestId("dead-letter-payload")).toContainText('"name": "Project 3"');
      await expect(dialog.getByText("Replay history")).toBeVisible();
    });

    test("tells the user when the payload cannot be copied", async ({ page }) => {
      // The clipboard is missing outside secure contexts
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }),
      );
      await open(page, seed());

      await page.getByRole("button", { name: "View message 1" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Copy" }).click();

      await expect(page.getByText("Could not copy the payload")).toBeVisible();
    });

    test("says so when nothing is pending", async ({ page }) => {
      await open(page, new FakeDeadLetterApi([]));

      await expect(page.getByRole("heading", { name: "All caught up" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Replay all pending/ })).toBeDisabled();
    });

    test("pages through the messages and steps back when the last one on a page goes", async ({ page }) => {
      const api = new FakeDeadLetterApi(
        Array.from({ length: 21 }, (_, i) => makeMessage({ id: i + 1 })),
      );
      await open(page, api);
      await expect(page.getByText("Showing 1 to 20 of 21")).toBeVisible();

      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(row(page, 1)).toBeVisible(); // the only one on page 2
      await expect(page.getByText("Showing 21 to 21 of 21")).toBeVisible();

      await page.getByRole("button", { name: "Delete message 1" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Confirm delete" }).click();

      // Back to a page that has messages, not a false "All caught up" with no way back
      await expect(page.getByText("Showing 1 to 20 of 20")).toBeVisible();
      await expect(row(page, 21)).toBeVisible();
      await expect(page.getByRole("heading", { name: "All caught up" })).toHaveCount(0);
    });
  });

  test.describe("replaying", () => {
    test("needs the risk acknowledged, then sends force", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("button", { name: "Replay message 1" }).click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByText("Replaying can overwrite newer changes", { exact: true }),
      ).toBeVisible();

      const replay = dialog.getByRole("button", { name: "Replay", exact: true });
      await expect(replay).toBeDisabled();
      expect(api.calls("POST", BASE)).toHaveLength(0);

      await dialog.getByRole("checkbox", { name: /I understand/ }).click();
      await expect(replay).toBeEnabled();
      await replay.click();

      await expect(page.getByText("Message #1 replayed")).toBeVisible();
      await expect(row(page, 1)).toHaveCount(0); // no longer pending
      const calls = api.calls("POST", `${BASE}/1/replay`);
      expect(calls).toHaveLength(1);
      expect(calls[0].query.force).toBe("true");
    });

    test("a replay that fails again keeps the message pending and says why", async ({ page }) => {
      const api = seed();
      api.failingReplays.add(1);
      await open(page, api);

      await page.getByRole("button", { name: "Replay message 1" }).click();
      const dialog = await replayViaDialog(page);

      await expect(dialog.getByText("The replay failed")).toBeVisible();
      await expect(dialog.getByText(/Unique constraint failed/)).toBeVisible();
      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(row(page, 1)).toBeVisible(); // still pending
      await expect(row(page, 1)).toContainText("Last replay:");
    });

    test("replays several selected messages and reports each outcome", async ({ page }) => {
      const api = seed();
      api.failingReplays.add(2);
      await open(page, api);

      await page.getByRole("checkbox", { name: "Select message 1" }).click();
      await page.getByRole("checkbox", { name: "Select message 2" }).click();
      await expect(page.getByText("2 selected")).toBeVisible();

      await page.getByRole("button", { name: "Replay selected" }).click();
      const dialog = await replayViaDialog(page);

      await expect(dialog.getByText("Attempted")).toBeVisible();
      await expect(dialog.getByText("#2")).toBeVisible(); // the one that failed
      const [call] = api.calls("POST", `${BASE}/replay`);
      // The page sends them in table order; the server replays oldest first regardless
      expect(call.body).toMatchObject({ force: true });
      expect((call.body as { ids: number[] }).ids.sort()).toEqual([1, 2]);
      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(row(page, 1)).toHaveCount(0);
      await expect(row(page, 2)).toBeVisible();
    });

    test("forgets the selection once those messages have been replayed", async ({ page }) => {
      await open(page, seed());

      await page.getByRole("checkbox", { name: "Select message 1" }).click();
      await page.getByRole("checkbox", { name: "Select message 2" }).click();
      await page.getByRole("button", { name: "Replay selected" }).click();
      const dialog = await replayViaDialog(page);
      await dialog.getByRole("button", { name: "Done" }).click();

      // No "2 selected" for rows that are gone, and nothing left to delete by mistake
      await expect(page.getByText(/\d+ selected/)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Delete selected" })).toHaveCount(0);
    });

    test("forgets a selected message that is replayed from its own row", async ({ page }) => {
      await open(page, seed());

      await page.getByRole("checkbox", { name: "Select message 1" }).click();
      await expect(page.getByText("1 selected")).toBeVisible();
      await page.getByRole("button", { name: "Replay message 1" }).click();
      await replayViaDialog(page);

      await expect(page.getByText("Message #1 replayed")).toBeVisible();
      await expect(page.getByText(/\d+ selected/)).toHaveCount(0);
    });

    test("replays the oldest batch of everything pending for the chosen topic", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("button", { name: /event\.Project\.created/ }).click();
      await page.getByRole("button", { name: /Replay all pending/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Replay pending messages for event.Project.created")).toBeVisible();
      await replayViaDialog(page);

      await expect(dialog.getByText("Attempted")).toBeVisible();
      const [call] = api.calls("POST", `${BASE}/replay`);
      expect(call.body).toEqual({ topic: "event.Project.created", force: true, limit: 25 });
    });

    test("says how many a run takes when there are more than one batch", async ({ page }) => {
      const api = new FakeDeadLetterApi(Array.from({ length: 30 }, (_, i) => makeMessage({ id: i + 1 })));
      await open(page, api);

      await page.getByRole("button", { name: /Replay all pending/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(/Replays the 25 oldest of 30 pending messages/)).toBeVisible();
      await expect(dialog.getByText(/Run it again to continue/)).toBeVisible();
      await replayViaDialog(page);

      await expect(dialog.getByText("Attempted")).toBeVisible();
      expect(api.calls("POST", `${BASE}/replay`)[0].body).toEqual({ force: true, limit: 25 });
      expect(api.messages.filter((m) => m.status === "PENDING")).toHaveLength(5);
    });

    test("is honest that a replay ignores filters other than the topic", async ({ page }) => {
      await open(page, seed());
      await page.getByRole("button", { name: "All", exact: true }).click(); // a status filter

      await page.getByRole("button", { name: /Replay all pending/ }).click();

      await expect(page.getByRole("dialog").getByText(/filters are not applied/)).toBeVisible();
    });

    test("does not offer to run it twice when no answer comes back", async ({ page }) => {
      const api = seed();
      api.dropNextBulkReplay = true; // as a timeout would
      await open(page, api);

      await page.getByRole("checkbox", { name: "Select message 1" }).click();
      await page.getByRole("button", { name: "Replay selected" }).click();
      const dialog = await replayViaDialog(page);

      await expect(dialog.getByText("No answer came back in time")).toBeVisible();
      await expect(dialog.getByText(/may still be working/)).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
      expect(api.calls("POST", `${BASE}/replay`)).toHaveLength(1);
    });

    test("reports a replay already running elsewhere, and a message gone meanwhile", async ({ page }) => {
      const api = seed();
      api.busy.add(1);
      await open(page, api);

      await page.getByRole("button", { name: "Replay message 1" }).click();
      const dialog = await replayViaDialog(page);

      await expect(dialog.getByText(/already being replayed/)).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(row(page, 1)).toBeVisible(); // still pending
    });

    test("shows the server's reason when it refuses the replay", async ({ page }) => {
      const api = seed();
      api.forbiddenMutations = true;
      await open(page, api);

      await page.getByRole("button", { name: "Replay message 1" }).click();
      const dialog = await replayViaDialog(page);

      await expect(dialog.getByText("Permission denied")).toBeVisible();
      await expect(row(page, 1)).toBeVisible();
    });

    test("replays from the details without scrolling to find the button", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("button", { name: "View message 1" }).click();
      const details = page.getByRole("dialog");
      const replay = details.getByRole("button", { name: "Replay", exact: true });
      await expect(replay).toBeInViewport();
      await replay.click();

      await expect(page.getByRole("dialog").getByText("Replay message #1")).toBeVisible();
      expect(api.calls("POST", BASE)).toHaveLength(0); // still needs the acknowledgement
    });

    test("shows a message's new state when reopened after a bulk replay", async ({ page }) => {
      await open(page, seed());

      await page.getByRole("button", { name: "View message 1" }).click();
      await expect(page.getByRole("dialog").getByText("Pending", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");

      await page.getByRole("checkbox", { name: "Select message 1" }).click();
      await page.getByRole("button", { name: "Replay selected" }).click();
      const dialog = await replayViaDialog(page);
      await dialog.getByRole("button", { name: "Done" }).click();

      // Viewing it again must not use the details cached before the replay
      await page.getByRole("button", { name: "All", exact: true }).click();
      await page.getByRole("button", { name: "View message 1" }).click();
      const details = page.getByRole("dialog");
      await expect(details.getByText("Replayed", { exact: true })).toBeVisible();
      await expect(details.getByRole("button", { name: "Replay", exact: true })).toHaveCount(0);
    });
  });

  test.describe("deleting and clearing", () => {
    test("asks first and warns that a pending message is lost for good", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("button", { name: "Delete message 2" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("This message has not been replayed.")).toBeVisible();
      await expect(dialog.getByText(/lost for good/)).toBeVisible();

      await dialog.getByRole("button", { name: "Keep message" }).click();
      await expect(row(page, 2)).toBeVisible();
      expect(api.calls("DELETE", BASE)).toHaveLength(0);

      await page.getByRole("button", { name: "Delete message 2" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Confirm delete" }).click();
      await expect(page.getByText("Message #2 deleted")).toBeVisible();
      await expect(row(page, 2)).toHaveCount(0);
    });

    test("words the warning for a message that was already replayed", async ({ page }) => {
      await open(page, seed());
      await page.getByRole("button", { name: "All", exact: true }).click();

      await page.getByRole("button", { name: "Delete message 4" }).click();

      await expect(page.getByRole("dialog").getByText("This message was already replayed.")).toBeVisible();
    });

    test("deletes several selected messages by naming them", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("checkbox", { name: "Select all on this page" }).click();
      await page.getByRole("button", { name: "Delete selected" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Delete 3 messages")).toBeVisible();
      await dialog.getByRole("button", { name: "Confirm delete" }).click();

      await expect(page.getByText("3 messages deleted")).toBeVisible();
      const [call] = api.calls("POST", `${BASE}/purge`);
      expect((call.body as { ids: number[] }).ids.sort()).toEqual([1, 2, 3]);
      expect(Object.keys(call.body as object)).toEqual(["ids"]); // names them; no status or topic
    });

    test("shows a partly selected page with a mixed select-all box", async ({ page }) => {
      await open(page, seed());

      await page.getByRole("checkbox", { name: "Select message 1" }).click();

      await expect(page.getByRole("checkbox", { name: "Select all on this page" })).toHaveAttribute(
        "aria-checked",
        "mixed",
      );
    });

    test("clears replayed messages without touching pending ones", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("button", { name: "Clear replayed" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Pending messages are never deleted here.")).toBeVisible();
      await dialog.getByRole("button", { name: "Delete replayed messages" }).click();

      await expect(page.getByText("1 replayed message deleted")).toBeVisible();
      const [call] = api.calls("POST", `${BASE}/purge`);
      expect(call.body).toEqual({ status: "REPLAYED" });
      expect(api.messages.map((m) => m.id)).toEqual([1, 2, 3]);
    });

    test("clears by how long ago messages failed, and says so", async ({ page }) => {
      const api = seed();
      await open(page, api);

      await page.getByRole("button", { name: "Clear replayed" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(/not from when it was replayed/)).toBeVisible();
      await dialog.getByRole("combobox", { name: "Age" }).click();
      await page.getByRole("option", { name: "Failed over 30 days ago" }).click();
      await dialog.getByRole("button", { name: "Delete replayed messages" }).click();

      await expect(page.getByText("No replayed messages matched")).toBeVisible();
      const [call] = api.calls("POST", `${BASE}/purge`);
      const body = call.body as { status: string; failedBefore: string };
      expect(body.status).toBe("REPLAYED");
      const cutoff = Date.parse(body.failedBefore);
      expect(Math.abs(cutoff - daysAgo(30).getTime())).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  test.describe("access", () => {
    test("explains when the user may not manage failed messages, and offers no actions", async ({ page }) => {
      const api = seed();
      api.forbidden = true;
      const summary = page.waitForResponse(/dead-letters\/summary/);
      await open(page, api);
      await summary;

      await expect(page.getByText("You don't have access to failed messages")).toBeVisible();
      await expect(page.getByLabel(/pending/)).toHaveCount(0); // no badge either
      await expect(page.getByRole("button", { name: "Clear replayed" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Replay all pending/ })).toHaveCount(0);
      await expect(page.getByLabel("Request ID")).toHaveCount(0);
    });

    test("keeps checking for new failures while the user has access", async ({ page }) => {
      await page.clock.install();
      const api = seed();
      await open(page, api);
      await expect(row(page, 1)).toBeVisible();

      const before = api.calls("GET", `${BASE}/summary`).length;
      await page.clock.runFor("02:00");

      await expect.poll(() => api.calls("GET", `${BASE}/summary`).length).toBeGreaterThan(before);
    });

    test("stops asking once the server has refused with 403", async ({ page }) => {
      await page.clock.install();
      const api = seed();
      api.forbidden = true;
      const summary = page.waitForResponse(/dead-letters\/summary/);
      await open(page, api);
      await summary;
      await expect(page.getByText("You don't have access to failed messages")).toBeVisible();

      const before = api.calls("GET", `${BASE}/summary`).length;
      await page.clock.runFor("10:00"); // ten minutes of polling intervals
      await page.waitForTimeout(500);

      expect(api.calls("GET", `${BASE}/summary`).length).toBe(before);
    });

    test("the dashboard flags messages waiting to be reviewed", async ({ page }) => {
      await open(page, seed(), "/admin");

      const banner = page.getByRole("link", { name: /3 failed messages waiting/ });
      await expect(banner).toBeVisible();
      await banner.click();
      await expect(page).toHaveURL(/\/admin\/dead-letters/);
    });
  });

  test.describe("on a phone", () => {
    test("fits the screen and keeps every action within reach", async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 851 });
      await open(page, seed());

      // Cards, not a table whose actions fall off the edge of the screen
      const card = page.getByTestId("dead-letter-card-1");
      await expect(card).toBeVisible();
      await expect(page.getByTestId("dead-letter-row-1")).toBeHidden();
      await expectNoHorizontalScroll(page);

      // Each action sits fully inside the screen's width (the old table pushed them off it)
      for (const action of ["View message 1", "Replay message 1", "Delete message 1"]) {
        const button = card.getByRole("button", { name: action });
        await button.scrollIntoViewIfNeeded();
        const box = await button.boundingBox();
        expect(box, action).not.toBeNull();
        expect(box!.x, action).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, action).toBeLessThanOrEqual(393);
      }

      await card.getByRole("button", { name: "View message 1" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Message #1")).toBeVisible();
      // Replay and Delete are up top, not below a long payload
      await expect(dialog.getByRole("button", { name: "Replay", exact: true })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Delete", exact: true })).toBeInViewport();
    });

    test("selecting works like on a desktop", async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 851 });
      await open(page, seed());

      await page.getByRole("checkbox", { name: "Select all on this page" }).click();
      await expect(page.getByText("3 selected")).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  });
});
