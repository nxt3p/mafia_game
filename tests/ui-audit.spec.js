// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const TABS = [
  'dashboard', 'quests', 'heists', 'properties', 'crew', 'army',
  'crafting', 'prestige', 'arena', 'climb', 'bosses', 'hideout', 'shop', 'character',
];

const SAVE_PATH = path.join(__dirname, 'fixtures/midgame-save.json');

test.beforeAll(() => {
  if (!fs.existsSync(SAVE_PATH)) {
    require('child_process').execSync('node scripts/seed-test-save.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  }
});

test.beforeEach(async ({ page }) => {
  const save = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8'));
  await page.addInitScript((data) => {
    localStorage.setItem('mob_empire_save_v6', data);
  }, JSON.stringify(save));
  await page.goto('/');
  await page.waitForFunction(() => window.__gameLoaded === true);
  await page.waitForSelector('#content .card', { timeout: 15000 });
});

for (const tab of TABS) {
  test(`screenshot tab: ${tab}`, async ({ page }, testInfo) => {
    await page.evaluate((t) => window.switchTab(t), tab);
    await page.waitForSelector('#content .card');
    await page.waitForTimeout(300);
    const dir = path.join('tests/screenshots', testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, `${tab}.png`),
      fullPage: true,
    });
    await expect(page.locator('#content .card').first()).toBeVisible();
  });
}
