import { chromium } from 'playwright-core';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 4173 } });

try {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const results = [];
  const announcements = [
    { id: '4', title: 'Newest announcement', content: `Newest content\n${'Long readable content. '.repeat(35)}`, createdAt: '2026-09-11T04:00:00.000Z', updatedAt: '2026-09-11T04:00:00.000Z' },
    { id: '3', title: 'Third announcement', content: 'Third content', createdAt: '2026-09-11T03:00:00.000Z', updatedAt: '2026-09-11T03:30:00.000Z' },
    { id: '2', title: 'Second announcement', content: `Second content\n${'More content. '.repeat(35)}`, createdAt: '2026-09-11T02:00:00.000Z', updatedAt: '2026-09-11T02:00:00.000Z' },
    { id: '1', title: 'Oldest announcement', content: 'Oldest content', createdAt: '2026-09-11T01:00:00.000Z', updatedAt: '2026-09-11T01:00:00.000Z' },
  ];
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    await page.route('**/api/announcements', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements }) }));
    await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null }) }));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await page.locator('.announcement-pin-trigger').click();
    if (await page.locator('.announcement-popover-card').count() !== announcements.length) errors.push('Announcement list was truncated.');
    if (await page.locator('.announcement-card-heading a').count() !== 0) errors.push('Visitor saw administrator edit controls.');
    const panelScrollable = await page.locator('.announcement-popover').evaluate(element => element.scrollHeight > element.clientHeight);
    if (!panelScrollable) errors.push('Long announcement list did not become vertically scrollable.');
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const sections = await page.locator('main > section').count();
    if (viewport.name === 'mobile') {
      await page.keyboard.press('Escape');
      await page.locator('.announcement-popover').waitFor({ state: 'detached' });
      await page.locator('.menu-button').click();
      if (!(await page.locator('.nav-links').isVisible())) errors.push('Mobile navigation did not open.');
    }
    if (await page.locator('#task-board').count()) errors.push('Public homepage still contains the interactive task board.');
    results.push({ viewport: viewport.name, sections, expectedSections: 5, horizontalOverflow, consoleErrors: errors });
    await page.close();
  }

  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const adminErrors = [];
  await adminPage.route('**/api/announcements', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements }) }));
  await adminPage.route('**/api/admin/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true }) }));
  adminPage.on('pageerror', error => adminErrors.push(error.message));
  await adminPage.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await adminPage.locator('.announcement-pin-trigger').click();
  if (await adminPage.locator('.announcement-card-heading a').count() !== announcements.length) adminErrors.push('Administrator edit links were missing.');
  await adminPage.locator('.announcement-popover-card').filter({ hasText: 'Second announcement' }).getByRole('link', { name: 'Edit' }).click();
  await adminPage.waitForURL('**/admin?edit=2');
  await adminPage.locator('.admin-form input').waitFor();
  if (await adminPage.locator('.admin-form input').inputValue() !== 'Second announcement') adminErrors.push('Deep link did not open the requested non-latest announcement.');
  results.push({ viewport: 'admin-deep-link', sections: 1, expectedSections: 1, horizontalOverflow: false, consoleErrors: adminErrors });
  await adminPage.close();

  const dashboardPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const dashboardErrors = [];
  await dashboardPage.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '1', name: 'Test Member', email: 'member@example.test', createdAt: '2026-09-15T00:00:00.000Z' } }) }));
  await dashboardPage.route('**/api/tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tasks: [] }) }));
  dashboardPage.on('pageerror', error => dashboardErrors.push(error.message));
  await dashboardPage.goto('http://127.0.0.1:4173/dashboard', { waitUntil: 'networkidle' });
  await dashboardPage.reload({ waitUntil: 'networkidle' });
  if (!(await dashboardPage.getByText('Welcome,').isVisible())) dashboardErrors.push('Dashboard did not render after direct load and refresh.');
  await dashboardPage.locator('.member-menu-button').click();
  if (!(await dashboardPage.locator('.member-nav').isVisible())) dashboardErrors.push('Member mobile navigation did not open.');
  const dashboardOverflow = await dashboardPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  results.push({ viewport: 'member-mobile', sections: 1, expectedSections: 1, horizontalOverflow: dashboardOverflow, consoleErrors: dashboardErrors });
  await dashboardPage.close();
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.horizontalOverflow || result.consoleErrors.length || result.sections !== result.expectedSections)) process.exitCode = 1;
} finally {
  await server.close();
}
