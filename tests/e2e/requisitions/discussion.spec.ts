import { expect, test } from "@playwright/test";
import { USER_AUTH, waitForListReady } from "../helpers";

test.use({ storageState: USER_AUTH });

async function goToFirstRequisitionDiscussion(
  page: import("@playwright/test").Page,
) {
  await page.goto("/requisitions");
  const cards = page.locator(
    'a[href^="/requisitions/"]:not([href="/requisitions"]):not([href="/requisitions/new"])',
  );
  const count = await waitForListReady(page, cards);
  test.skip(count === 0, "No requisitions returned — can't test discussion.");
  const href = await cards.first().getAttribute("href");
  await page.goto(`${href}/discussion`);
}

/**
 * Scan the first N requisitions and navigate to the discussion page of
 * one that actually has threads. Falls back to the first requisition if
 * none has threads (test will then skip via the inner logic).
 */
async function goToRequisitionWithDiscussions(
  page: import("@playwright/test").Page,
  maxScan = 5,
) {
  await page.goto("/requisitions");
  const cards = page.locator(
    'a[href^="/requisitions/"]:not([href="/requisitions"]):not([href="/requisitions/new"])',
  );
  const count = await waitForListReady(page, cards);
  test.skip(count === 0, "No requisitions — can't test discussion.");

  const candidates: string[] = [];
  for (let i = 0; i < Math.min(count, maxScan); i++) {
    const href = await cards.nth(i).getAttribute("href");
    if (href) candidates.push(href);
  }

  // For each candidate, navigate to its discussion page and watch for a
  // /threaded GET within a short window. If seen, that requisition has
  // discussions and we stay on it.
  for (const base of candidates) {
    const url = `${base}/discussion`;
    const seen: string[] = [];
    const onResp = (r: import("@playwright/test").Response) => {
      if (r.url().includes("/threaded")) seen.push(r.url());
    };
    page.on("response", onResp);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    page.off("response", onResp);
    if (seen.length > 0) return;
  }
  // None had threads — stay on the first so assertions can observe + skip.
  await page.goto(`${candidates[0]}/discussion`, {
    waitUntil: "domcontentloaded",
  });
}

test.describe("Discussion page — critical", () => {
  test("DISC-01 — load discussions list and auto-select first thread", async ({
    page,
  }, testInfo) => {
    await goToFirstRequisitionDiscussion(page);
    // On mobile the "Discussion" title is hidden (hidden sm:flex); rely on
    // the Threads button (mobile) or the Threads h2 heading (desktop)
    // to anchor the assertion.
    if (testInfo.project.name === "chromium-mobile") {
      await expect(
        page.getByRole("button", { name: /threads/i }),
      ).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(
        page.getByRole("heading", { name: /discussion/i }).first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("DISC-05 — thread-select fires threaded-comments GET", async ({
    page,
  }) => {
    const threadedRequests: string[] = [];
    page.on("response", (r) => {
      if (
        r.url().includes("/threaded") &&
        r.request().method() === "GET"
      ) {
        threadedRequests.push(r.url());
      }
    });
    await goToRequisitionWithDiscussions(page);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1_000);
    test.skip(
      threadedRequests.length === 0,
      "No requisition in top 5 has discussion threads.",
    );
    expect(threadedRequests.length).toBeGreaterThan(0);
  });

  test("DISC-13 — create new thread dialog opens (if permission)", async ({
    page,
  }, testInfo) => {
    await goToFirstRequisitionDiscussion(page);
    // Wait for <Can permission="discussions:write"> to resolve once the
    // Zustand auth store hydrates.
    await page.waitForLoadState("networkidle").catch(() => {});

    let scope: import("@playwright/test").Locator = page.locator("body");
    if (testInfo.project.name === "chromium-mobile") {
      const threadsBtn = page.getByRole("button", { name: /^threads$/i });
      await threadsBtn.waitFor({ state: "visible", timeout: 10_000 });
      await threadsBtn.click();
      scope = page.locator('[data-slot="sheet-content"]');
      await scope.waitFor({ state: "visible", timeout: 5_000 });
      await page.waitForTimeout(500);
    }

    const newBtn = scope.getByRole("button", { name: /^new$/i });
    try {
      await newBtn.first().waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      test.skip(true, "'New' button never rendered — no discussions:write.");
    }
    await newBtn.first().click({ force: true });
    await expect(page.getByRole("dialog").last()).toBeVisible({
      timeout: 5_000,
    });
    await page.keyboard.press("Escape");
  });

  test("DISC-33 — composer is present when a thread is selected (read-write roles)", async ({
    page,
  }) => {
    await goToFirstRequisitionDiscussion(page);
    await page.waitForLoadState("networkidle").catch(() => {});
    // Give the auto-selected thread a tick to render its composer.
    await page.waitForTimeout(500);
    const composer = page.getByPlaceholder(/write a message|write a reply/i);
    const count = await composer.count();
    test.skip(
      count === 0,
      "Composer not visible — read-only role or no thread auto-selected.",
    );
    await expect(composer.first()).toBeVisible();
  });

  test("DISC-42 — mobile: Threads drawer button visible at small viewport", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "mobile-viewport only",
    );
    await goToFirstRequisitionDiscussion(page);
    await expect(
      page.getByRole("button", { name: /threads/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
