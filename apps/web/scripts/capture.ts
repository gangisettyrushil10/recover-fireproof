/**
 * Playwright capture script for the Fireproof demo.
 *
 * Walks the 9-step Cedar Heights flow and saves screenshots to
 * `docs/screenshots/`. Run with the API on :4000 and the web on :3000:
 *
 *   pnpm --filter @fireproof/web exec tsx scripts/capture.ts
 */

import { chromium, type Page } from 'playwright';
import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '../../../docs/screenshots');
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

async function shot(page: Page, name: string, opts: { full?: boolean } = {}): Promise<void> {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.full ?? false });
  console.log(`  ✓ ${name}.png`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // 1. Login
  console.log('1) login');
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await shot(page, '01-login');

  // Click L. Park (Office Manager)
  await page.getByRole('button', { name: /L\. Park/i }).click();
  await page.waitForURL(/\/properties\//, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');

  // 2. Property dashboard
  console.log('2) dashboard');
  await page.waitForSelector('text=Cedar Heights Apartments', { timeout: 15_000 });
  await shot(page, '02-dashboard');

  // 3. Open the Day-116 sprinkler impairment
  console.log('3) exception detail');
  await page
    .getByRole('link', { name: /9th-floor wet sprinkler zone out of service/i })
    .click();
  await page.waitForURL(/\/exceptions\//, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=restored evidence incomplete', { timeout: 15_000 });
  await shot(page, '03-exception-detail');

  // 4. Click Request close → expect 422 with three blockers
  console.log('4) close blocked (422)');
  await page.getByRole('button', { name: /^Request close/i }).click();
  // Wait for the inline blocking error block to appear
  await page.waitForSelector('text=ahj_notification.valid', { timeout: 15_000 });
  await shot(page, '04-close-blocked');

  // Hero shot — full-page version of the same state
  await shot(page, '00-hero', { full: true });

  // 5. Contradictions
  console.log('5) contradictions');
  await page.getByRole('link', { name: /^Contradictions$/ }).click();
  await page.waitForURL(/\/contradictions/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=Contradiction map', { timeout: 15_000 });
  await shot(page, '05-contradictions');

  // 6. Packet builder → generate AHJ NOV response
  console.log('6) packet builder');
  await page.getByRole('link', { name: /^Packets$/ }).click();
  await page.waitForURL(/\/packets/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Generate: AHJ NOV response/i }).click();
  // Wait for the row to appear in the list
  await page.waitForSelector('text=Download ZIP', { timeout: 30_000 });
  await shot(page, '06-packet-ready');

  // 7. Vault → apply legal hold
  console.log('7) vault + hold');
  await page.getByRole('link', { name: /^Vault$/ }).click();
  await page.waitForURL(/\/vault/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Apply legal hold/i }).click();
  await page.waitForSelector('text=Property under active legal hold', { timeout: 15_000 });
  await shot(page, '07-vault-hold-active');

  await browser.close();
  console.log('\nDone. Screenshots in:', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
