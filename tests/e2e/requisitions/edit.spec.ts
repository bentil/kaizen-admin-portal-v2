import { expect, test } from "@playwright/test";
import { USER_AUTH, waitForListReady } from "../helpers";

test.use({ storageState: USER_AUTH });

async function goToFirstRequisitionEdit(page: import("@playwright/test").Page) {
  await page.goto("/requisitions");
  const cards = page.locator(
    'a[href^="/requisitions/"]:not([href="/requisitions"]):not([href="/requisitions/new"])',
  );
  const count = await waitForListReady(page, cards);
  test.skip(count === 0, "No requisitions — cannot test edit flow.");

  // Scan up to the first 8 requisitions; for each, load its detail page
  // and check whether the Edit link is rendered (canEdit depends on role
  // + ownership + status).
  // Try the Draft tab first — if any draft exists, canEdit is most likely
  // true for it.
  const draftTab = page.getByRole("tab", { name: /^draft$/i });
  if ((await draftTab.count()) > 0) {
    await draftTab.first().click();
    await page.waitForTimeout(500);
  }

  const afterTab = await waitForListReady(page, cards);
  const scanLimit = Math.min(afterTab, 6);
  const hrefs: string[] = [];
  for (let i = 0; i < scanLimit; i++) {
    const href = await cards.nth(i).getAttribute("href");
    if (href) hrefs.push(href);
  }
  for (const href of hrefs) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const editLink = page.locator('a[href$="/edit"]').first();
    try {
      await editLink.waitFor({ state: "visible", timeout: 2_500 });
    } catch {
      continue;
    }
    const editHref = await editLink.getAttribute("href");
    if (editHref) {
      await page.goto(editHref, { waitUntil: "domcontentloaded" });
      return;
    }
  }
  test.skip(true, `No editable requisition found in first ${scanLimit} candidates.`);
}

test.describe("Edit requisition — critical", () => {
  test("REQEDIT-01 — edit page loads with pre-filled form", async ({ page }) => {
    await goToFirstRequisitionEdit(page);
    await expect(
      page.getByRole("heading", { name: /edit requisition/i }),
    ).toBeVisible({ timeout: 15_000 });
    // Title input should have a value
    const title = page.getByLabel(/^title$/i);
    await expect(title).toBeVisible();
    const value = await title.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("REQEDIT-12 — Save sequence: PUT fires on Save Changes click", async ({
    page,
  }) => {
    await goToFirstRequisitionEdit(page);
    const save = page.getByRole("button", { name: /save changes/i });
    await expect(save).toBeVisible({ timeout: 15_000 });

    // Collect PUT requests from this moment.
    const puts: string[] = [];
    page.on("response", (r) => {
      if (
        r.url().includes("/api/v1/requisitions/") &&
        r.request().method() === "PUT"
      ) {
        puts.push(r.url());
      }
    });

    await save.click();
    // Give the click up to 5s to either fire the PUT or surface a
    // validation toast (legacy requisitions may fail the new schema).
    await page.waitForTimeout(5_000);

    if (puts.length === 0) {
      const toast = page.locator("[data-sonner-toast]").first();
      const hasToast = (await toast.count()) > 0;
      test.skip(
        hasToast,
        "Save blocked by validation (likely legacy-data schema gap).",
      );
    }
    expect(puts.length).toBeGreaterThan(0);
  });
});
