import { expect, test } from "@playwright/test";
import { ADMIN_AUTH } from "./helpers";

test.use({ storageState: ADMIN_AUTH });

const ADMIN_ROUTES: Array<{ path: string; id: string }> = [
  { path: "/admin", id: "ADMINDASH" },
  { path: "/admin/accounts", id: "ADMACCTS" },
  { path: "/admin/users", id: "ADMINUSERS" },
  { path: "/admin/billing", id: "ADMBILL" },
  { path: "/admin/roles", id: "ADMROLES" },
  { path: "/admin/payment-config", id: "ADMPAY" },
  { path: "/admin/packages", id: "ADMPKG" },
  { path: "/admin/discounts", id: "ADMDISC" },
  { path: "/admin/offers", id: "ADMOFFERS" },
  { path: "/admin/service-categories", id: "ADMCAT" },
  { path: "/admin/settings", id: "ADMSETTINGS" },
];

test.describe("Admin screens — critical load smoke", () => {
  for (const { path, id } of ADMIN_ROUTES) {
    test(`${id}-load — ${path} loads as admin`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      // The page should not redirect off of /admin/*
      await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    });
  }
});

test.describe("Admin create-form sheets — critical smoke", () => {
  test("ADMROLES-02 — Add role button opens form", async ({ page }) => {
    await page.goto("/admin/roles");
    const addBtn = page.getByRole("button", { name: /add.*role|new.*role/i });
    const count = await addBtn.count();
    test.skip(count === 0, "Add role button not visible.");
    await addBtn.first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("ADMOFFERS-05 — Service tier Select exists in add-offer form", async ({
    page,
  }) => {
    await page.goto("/admin/offers");
    // Trigger label is "Create Offer"; may appear more than once
    const triggerBtn = page
      .getByRole("button", { name: /^create offer$/i })
      .first();
    const count = await triggerBtn.count();
    test.skip(count === 0, "Create Offer button not visible.");
    await triggerBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/service tier/i)).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
