import { chromium } from 'playwright-core';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 4173 } });

try {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const results = [];
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const sections = await page.locator('main > section').count();
    if (viewport.name === 'mobile') {
      await page.locator('.menu-button').click();
      if (!(await page.locator('.nav-links').isVisible())) errors.push('Mobile navigation did not open.');
    }
    results.push({ viewport: viewport.name, sections, horizontalOverflow, consoleErrors: errors });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.horizontalOverflow || result.consoleErrors.length || result.sections !== 6)) process.exitCode = 1;
} finally {
  await server.close();
}
