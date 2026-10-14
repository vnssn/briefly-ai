import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { SAMPLE_BRIEF, SAMPLE_NOTES } from "../../src/brief.js";
test("sample, tasks, export, keyboard and accessibility", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Briefly/);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(page.getByText("SAMPLE BRIEF", { exact: true })).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await expect(page.getByText("1 completed")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .md" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "briefly-meeting-brief.md",
  );
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await writeFile(
    "docs/axe-desktop.json",
    JSON.stringify(
      {
        url: page.url(),
        timestamp: new Date().toISOString(),
        violations: audit.violations,
        passes: audit.passes.map((p) => ({
          id: p.id,
          description: p.description,
        })),
      },
      null,
      2,
    ),
  );
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: "docs/briefly-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const mobile = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await writeFile(
    "docs/axe-mobile.json",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        violations: mobile.violations,
        passes: mobile.passes.map((p) => ({
          id: p.id,
          description: p.description,
        })),
      },
      null,
      2,
    ),
  );
  expect(mobile.violations).toEqual([]);
  await page.screenshot({ path: "docs/briefly-mobile.png", fullPage: true });
});
test("live response contract and recoverable service failure", async ({
  page,
}) => {
  await page.route("**/api/brief", (route) =>
    route.fulfill({ json: { brief: SAMPLE_BRIEF } }),
  );
  await page.goto("/");
  await page.getByLabel("Start with the messy part.").fill(SAMPLE_NOTES);
  await page.getByRole("button", { name: "Create my brief" }).click();
  await expect(page.getByText("READY TO GO")).toBeVisible();
  await page.route("**/api/brief", (route) =>
    route.fulfill({
      status: 429,
      json: { error: "Quota reached. Please retry later." },
    }),
  );
  await page.getByRole("button", { name: "Create my brief" }).click();
  await expect(page.getByRole("alert")).toContainText("Quota reached");
  await expect(page.getByLabel("Start with the messy part.")).toHaveValue(
    SAMPLE_NOTES,
  );
  await expect(page.getByText("READY TO GO")).toBeVisible();
});
