import { test, expect, type Page } from "@playwright/test";

// Capture Pendo Track Events without a real Pendo account by installing a
// window.pendo stub before the app loads. Mirrors how Novus's agent exposes
// window.pendo.track at runtime, so the app code path is identical.
async function stubPendo(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __pendoEvents: string[] }).__pendoEvents = [];
    (window as unknown as { pendo: { track: (n: string) => void } }).pendo = {
      track: (name: string) => {
        (window as unknown as { __pendoEvents: string[] }).__pendoEvents.push(name);
      },
    };
  });
}

const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { __pendoEvents: string[] }).__pendoEvents);

test.describe("counter app", () => {
  test.beforeEach(async ({ page }) => {
    await stubPendo(page);
    await page.goto("/");
  });

  test("increment, decrement, and reset update the counter", async ({ page }) => {
    await expect(page.getByTestId("counter-value")).toHaveText("0");

    await page.getByTestId("btn-increment").click();
    await page.getByTestId("btn-increment").click();
    await expect(page.getByTestId("counter-value")).toHaveText("2");
    await expect(page.getByTestId("last-action")).toContainText("increment");

    await page.getByTestId("btn-decrement").click();
    await expect(page.getByTestId("counter-value")).toHaveText("1");

    await page.getByTestId("btn-reset").click();
    await expect(page.getByTestId("counter-value")).toHaveText("0");
    await expect(page.getByTestId("last-action")).toContainText("reset");
  });

  test("each action fires a Pendo Track Event", async ({ page }) => {
    await page.getByTestId("btn-increment").click();
    await page.getByTestId("btn-reset").click();

    // App prefixes events with "demo-"; assert the agent was called correctly.
    await expect.poll(() => events(page)).toContain("demo-increment");
    await expect.poll(() => events(page)).toContain("demo-reset");
  });
});

// Approach B: when the real Pendo agent is installed (e.g. via Novus), assert
// that events actually leave the browser toward Pendo's collector. Skipped
// unless PENDO_LIVE=1, since it requires the real snippet to be present.
test.describe("pendo network (live agent)", () => {
  test.skip(!process.env.PENDO_LIVE, "set PENDO_LIVE=1 with the real Pendo snippet installed");

  test("an event request reaches data.pendo.io", async ({ page }) => {
    const pendoRequest = page.waitForRequest(/data\.pendo\.io/);
    await page.goto("/");
    await page.getByTestId("btn-increment").click();
    expect(await pendoRequest).toBeTruthy();
  });
});
