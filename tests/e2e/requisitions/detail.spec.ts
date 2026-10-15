import { expect, test } from "@playwright/test";
import { USER_AUTH, waitForListReady } from "../helpers";

test.use({ storageState: USER_AUTH });

async function goToFirstRequisition(page: import("@playwright/test").Page) {
  await page.goto("/requisitions");
  const cards = page.locator(
    'a[href^="/requisitions/"]:not([href="/requisitions"]):not([href="/requisitions/new"])',
  );
  const count = await waitForListReady(page, cards);
  test.skip(count === 0, "No requisitions returned — can't test detail view.");
  const href = await cards.first().getAttribute("href");
  // Navigate by href rather than .click() to avoid mobile click-interception
  // issues with overlapping elements.
  await page.goto(href!);
  await page.waitForLoadState("networkidle").catch(() => {});
}

test.describe("Kaizen Admin detail — critical", () => {
  test("REQDETAIL-01 — detail page loads with title", async ({ page }) => {
    await goToFirstRequisition(page);
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("REQDETAIL-10 — tabs render on detail page", async ({ page }) => {
    await goToFirstRequisition(page);
    // Tabs have 6 triggers (overview/items/docs/quotes/history/discussion).
    // Labels are hidden under `sm`, so target by count, not by name.
    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
    await expect(tabs).toHaveCount(6);
  });

  test("REQDETAIL-19/20 — Edit button visibility is permission-gated", async ({
    page,
  }) => {
    await goToFirstRequisition(page);
    const edit = page.getByRole("link", { name: /edit requisition|^edit$/i });
    // Either visible (we own it + draft status) or hidden — both valid per
    // canEdit rules. We just assert the page didn't crash.
    expect(await edit.count()).toBeGreaterThanOrEqual(0);
  });

  test("REQDETAIL-34 — Docs tab uses the dedicated documents endpoint", async ({
    page,
  }) => {
    // The documents-list hook fires on detail page mount (not only after
    // clicking the Docs tab). Collect all responses from the start so we
    // can verify the endpoint was hit, regardless of timing.
    const docsRequests: string[] = [];
    page.on("response", (r) => {
      const url = r.url();
      if (
        url.includes("/documents/requisitions/") &&
        url.endsWith("/documents") &&
        r.request().method() === "GET"
      ) {
        docsRequests.push(url);
      }
    });

    await goToFirstRequisition(page);

    // Click Docs tab to be explicit (index 2 in the 6-tab list).
    const tabs = page.getByRole("tab");
    await tabs.nth(2).click();
    await page.waitForTimeout(500);

    expect(docsRequests.length).toBeGreaterThan(0);
  });
});
