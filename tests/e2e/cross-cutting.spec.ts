import { test } from "@playwright/test";
import { USER_AUTH, expectNoHorizontalScroll } from "./helpers";

test.describe("Responsive breakpoints — critical", () => {
  test("RESP-01 — login page no horizontal scroll at mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "mobile-only assertion",
    );
    await page.goto("/login");
    await expectNoHorizontalScroll(page);
  });

  test("RESP-02 — authenticated dashboard no horizontal scroll at mobile", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "mobile-only assertion",
    );
    const ctx = await browser.newContext({
      storageState: USER_AUTH,
    });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
    await ctx.close();
  });
});
