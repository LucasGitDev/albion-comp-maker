/**
 * ACM-078 manual verification: loads /build/new at a 390px viewport
 * (real Chromium via Playwright, not jsdom — jsdom never computes actual
 * CSS layout, so it can't measure scrollWidth/clientWidth) and asserts
 * document.documentElement.scrollWidth never exceeds clientWidth.
 *
 * /build/new requires an authenticated (database-strategy) session, so this
 * is not wired into `pnpm test`/`make check` — it's a standalone repro/
 * regression script, run manually against a dev server:
 *
 *   DATABASE_PATH=./data/verify.db AUTH_SECRET=<any 32+ char string> pnpm dev
 *   DATABASE_PATH=./data/verify.db tsx scripts/seed-verify-session.ts
 *   VERIFY_SESSION_TOKEN=<token printed above> tsx scripts/verify-breadcrumb-overflow.ts
 */
import { chromium } from "playwright";

type Measurement = { scrollWidth: number; clientWidth: number };

async function main(): Promise<void> {
  const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
  const SESSION_TOKEN = process.env.VERIFY_SESSION_TOKEN;

  if (!SESSION_TOKEN) {
    console.error("VERIFY_SESSION_TOKEN env var is required (see scripts/seed-verify-session.ts).");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: SESSION_TOKEN,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  const resp = await page.goto(`${BASE_URL}/build/new`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  console.log("Status:", resp?.status(), "URL:", page.url());

  const measure = (): Promise<Measurement> =>
    page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

  const baseline = await measure();
  console.log("No comp context:", baseline);

  // Also exercise the longer "comp -> build" trail (ACM-100 AC#5), the
  // widest variant of the breadcrumb, by loading with comp query params.
  await page.goto(`${BASE_URL}/build/new?comp=comp-1&compName=${encodeURIComponent("ZvZ Terça e Quinta às 21h")}`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(1000);
  const withComp = await measure();
  console.log("With comp trail:", withComp);

  await browser.close();

  const failures = [baseline, withComp].filter((m) => m.scrollWidth > m.clientWidth);
  if (failures.length > 0) {
    console.error("FAIL: horizontal overflow detected at 390px", failures);
    process.exit(1);
  }
  console.log("PASS: no horizontal overflow at 390px");
}

void main();
