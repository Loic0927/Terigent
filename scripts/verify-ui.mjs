import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 4173 } });
const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');

try {
  await mkdir('artifacts/ui', { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const results = [];
  let announcements = [
    { id: '4', title: 'Newest announcement', content: `Newest content\n${'Long readable content. '.repeat(35)}`, createdAt: '2026-09-11T04:00:00.000Z', updatedAt: '2026-09-11T04:00:00.000Z' },
    { id: '3', title: 'Third announcement', content: 'Third content', createdAt: '2026-09-11T03:00:00.000Z', updatedAt: '2026-09-11T03:30:00.000Z' },
    { id: '2', title: 'Second announcement', content: `Second content\n${'More content. '.repeat(35)}`, createdAt: '2026-09-11T02:00:00.000Z', updatedAt: '2026-09-11T02:00:00.000Z' },
    { id: '1', title: 'Oldest announcement', content: 'Oldest content', createdAt: '2026-09-11T01:00:00.000Z', updatedAt: '2026-09-11T01:00:00.000Z' },
  ];
  const services = [
    { id: '2', name: 'Team workflow design', description: 'Shape a clear operating rhythm for your team.', category: 'Consulting', pricingText: 'From $500', active: true, updatedAt: '2026-09-20T00:00:00.000Z', matches: [] },
    { id: '1', name: 'Planning setup', description: 'Build a focused planning workspace.', category: 'Implementation', pricingText: null, active: true, updatedAt: '2026-09-19T00:00:00.000Z', matches: [] },
  ];
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    await page.route('**/api/announcements', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements }) }));
    await page.route('**/api/services?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services, filters: { categories: ['Consulting', 'Implementation'] }, pagination: { page: 1, limit: 24, total: 2, totalPages: 1 } }) }));
    await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null }) }));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('.announcement-pin-trigger').click();
    if (await page.locator('.announcement-popover-card').count() !== announcements.length) errors.push('Announcement list was truncated.');
    if (await page.locator('.announcement-card-heading a').count() !== 0) errors.push('Visitor saw administrator edit controls.');
    const panelScrollable = await page.locator('.announcement-popover').evaluate(element => element.scrollHeight > element.clientHeight);
    if (!panelScrollable) errors.push('Long announcement list did not become vertically scrollable.');
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const sections = await page.locator('main > section').count();
    if (await page.locator('.nav-links > a', { hasText: /^(Register|Login)$/ }).count()) errors.push('Public navigation still shows Register or Login.');
    if (await page.locator('.nav-links > a.button').getAttribute('href') !== '/register') errors.push('Get started does not link to registration.');
    if (viewport.name === 'mobile') {
      await page.keyboard.press('Escape');
      await page.locator('.announcement-popover').waitFor({ state: 'detached' });
      await page.locator('.menu-button').click();
      if (!(await page.locator('.nav-links').isVisible())) errors.push('Mobile navigation did not open.');
    }
    if (await page.locator('#task-board').count()) errors.push('Public homepage still contains the interactive task board.');
    if (await page.locator('.service-card').count() !== services.length) errors.push('Public service list was not rendered.');
    if (!(await page.locator('.service-search').isVisible())) errors.push('Public service search controls were not rendered.');
    results.push({ viewport: viewport.name, sections, expectedSections: 6, horizontalOverflow, consoleErrors: errors });
    await page.close();
  }

  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const adminErrors = [];
  let announcementUpdates = 0;
  await adminPage.route('**/api/announcements/*', async route => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed.' }) });
    const id = route.request().url().split('/').pop(); const body = route.request().postDataJSON(); announcementUpdates += 1;
    announcements = announcements.map(item => item.id === id ? { ...item, ...body, updatedAt: new Date().toISOString() } : item);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcement: announcements.find(item => item.id === id) }) });
  });
  await adminPage.route('**/api/announcements', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements }) }));
  await adminPage.route('**/api/admin/services', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services }) }));
  await adminPage.route('**/api/services', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services }) }));
  await adminPage.route('**/api/admin/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, role: 'root', permissions: ['services:view','services:create','services:update','services:delete','announcements:view','announcements:create','announcements:update','announcements:delete','users:view','users:assign-role','users:delete','customer-requests:manage'] }) }));
  await adminPage.route('**/api/admin/users*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [{ id: '7', name: 'Staff Member', email: 'staff@example.test', role: 'staff', createdAt: '2026-09-20T00:00:00.000Z' }] }) }));
  await adminPage.route('**/api/admin/customer-requests*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requests: [], total: 0 }) }));
  adminPage.on('pageerror', error => adminErrors.push(error.message));
  await adminPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await adminPage.locator('.announcement-pin-trigger').click();
  if (await adminPage.locator('.announcement-card-heading a').count() !== announcements.length) adminErrors.push('Administrator edit links were missing.');
  const publicEdit = adminPage.locator('.announcement-popover-card').filter({ hasText: 'Second announcement' }).getByRole('link', { name: 'Edit' });
  if (await publicEdit.getAttribute('href') !== '/admin?edit=2') adminErrors.push('Homepage edit link did not carry the announcement ID.');
  await publicEdit.click();
  await adminPage.waitForURL('**/admin');
  await adminPage.locator('.announcement-form input').waitFor();
  if (await adminPage.locator('.announcement-form input').inputValue() !== 'Second announcement') adminErrors.push('Deep link did not open the requested non-latest announcement.');
  await adminPage.waitForTimeout(700);
  if (!(await adminPage.locator('.announcement-form input').evaluate(element => element === document.activeElement))) adminErrors.push('Announcement title was not focused after edit mode rendered.');
  if (!(await adminPage.locator('.announcement-form').evaluate(element => { const box = element.getBoundingClientRect(); return box.top >= 0 && box.top < window.innerHeight; }))) adminErrors.push('Announcement editor was not scrolled into view.');
  await adminPage.locator('.announcement-form input').fill('Second announcement updated');
  await adminPage.getByRole('button', { name: 'Save changes' }).click();
  await adminPage.getByText('Announcement saved.').waitFor();
  if (announcementUpdates !== 1 || !(await adminPage.getByText('Second announcement updated', { exact: true }).count())) adminErrors.push('Announcement update was not persisted and reloaded.');
  if (!(await adminPage.getByRole('heading', { name: 'New announcement' }).count())) adminErrors.push('Announcement edit state was not cleared after save.');
  await adminPage.getByRole('button', { name: 'Edit' }).last().click();
  await adminPage.getByRole('button', { name: 'Cancel' }).click();
  if (announcementUpdates !== 1 || !(await adminPage.getByRole('heading', { name: 'New announcement' }).count())) adminErrors.push('Cancel changed data or failed to exit edit mode.');
  await adminPage.goto(`${baseUrl}/admin?edit=invalid`, { waitUntil: 'networkidle' });
  if (!(await adminPage.getByText('The requested announcement ID is invalid.').count())) adminErrors.push('Invalid announcement ID did not show a safe error.');
  if (await adminPage.getByRole('heading', { name: 'Company services' }).locator('..').locator('.admin-list article').count() !== services.length) adminErrors.push('Admin service list was not rendered.');
  if (!(await adminPage.getByRole('heading', { name: 'Staff / User Management' }).isVisible())) adminErrors.push('Root user management was not rendered.');
  if (await adminPage.getByRole('link', { name: 'Back to website' }).count()) adminErrors.push('Admin still displayed Back to website.');
  if (await adminPage.getByRole('button', { name: 'Sign out' }).count() !== 1) adminErrors.push('Admin did not have exactly one Sign out action.');
  if (await adminPage.locator('.admin-header').getByRole('button', { name: 'Sign out' }).count()) adminErrors.push('Sign out remained in the admin header.');
  if (await adminPage.locator('.admin-header .logo').getAttribute('href') !== '/') adminErrors.push('Admin logo did not link home.');
  results.push({ viewport: 'admin-deep-link', sections: 1, expectedSections: 1, horizontalOverflow: false, consoleErrors: adminErrors });
  await adminPage.close();

  const dashboardPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const dashboardErrors = [];
  await dashboardPage.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '1', name: 'Test Member', email: 'member@example.test', createdAt: '2026-09-15T00:00:00.000Z' } }) }));
  await dashboardPage.route('**/api/tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tasks: [] }) }));
  dashboardPage.on('pageerror', error => dashboardErrors.push(error.message));
  await dashboardPage.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await dashboardPage.reload({ waitUntil: 'networkidle' });
  if (!(await dashboardPage.getByText('Welcome,').isVisible())) dashboardErrors.push('Dashboard did not render after direct load and refresh.');
  await dashboardPage.locator('.member-menu-button').click();
  if (!(await dashboardPage.locator('.member-nav').isVisible())) dashboardErrors.push('Member mobile navigation did not open.');
  const dashboardOverflow = await dashboardPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  results.push({ viewport: 'member-mobile', sections: 1, expectedSections: 1, horizontalOverflow: dashboardOverflow, consoleErrors: dashboardErrors });
  await dashboardPage.close();

  const signedOutDashboard = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const signedOutErrors = [];
  await signedOutDashboard.route('**/api/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Sign-in is required.' }) }));
  signedOutDashboard.on('pageerror', error => signedOutErrors.push(error.message));
  await signedOutDashboard.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await signedOutDashboard.waitForURL('**/login?returnTo=%2Fdashboard');
  if (!signedOutDashboard.url().endsWith('/login?returnTo=%2Fdashboard')) signedOutErrors.push('Signed-out dashboard visitor was not redirected to login.');
  results.push({ viewport: 'dashboard-signed-out', sections: 1, expectedSections: 1, horizontalOverflow: false, consoleErrors: signedOutErrors });
  await signedOutDashboard.close();

  const accountPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const accountErrors = [];
  let profile = { id: '1', name: 'Test Member', email: 'member@example.test', createdAt: '2026-09-15T00:00:00.000Z' };
  await accountPage.route('**/api/auth/me', async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      profile = { ...profile, name: body.name.trim() };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Account details updated.', user: profile }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: profile }) });
  });
  accountPage.on('pageerror', error => accountErrors.push(error.message));
  await accountPage.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  if (!(await accountPage.locator('#account-email').evaluate(element => element.readOnly))) accountErrors.push('Account email is not read-only.');
  await accountPage.locator('#account-name').fill('Updated Member');
  await accountPage.getByRole('button', { name: 'Save changes' }).click();
  if (!(await accountPage.getByText('Account details updated.').isVisible()) || profile.name !== 'Updated Member') accountErrors.push('Profile update did not complete.');
  const accountOverflow = await accountPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  results.push({ viewport: 'account-mobile', sections: 1, expectedSections: 1, horizontalOverflow: accountOverflow, consoleErrors: accountErrors });
  await accountPage.close();

  const responsiveViewports = [
    { name: '320', width: 320, height: 800 }, { name: '360', width: 360, height: 800 },
    { name: '390', width: 390, height: 844 }, { name: '768', width: 768, height: 900 },
    { name: '1024', width: 1024, height: 900 }, { name: '1280', width: 1280, height: 900 }, { name: '1440', width: 1440, height: 900 },
  ];
  for (const viewport of responsiveViewports) {
    const memberPage = await browser.newPage({ viewport });
    const memberErrors = [];
    await memberPage.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '1', name: 'A Very Long Customer Display Name', email: 'member@example.test', createdAt: '2026-09-15T00:00:00.000Z' } }) }));
    await memberPage.route('**/api/tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tasks: [] }) }));
    memberPage.on('pageerror', error => memberErrors.push(error.message));
    await memberPage.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
    if (viewport.width <= 960) { await memberPage.locator('.member-menu-button').click(); if (!(await memberPage.locator('.member-nav').isVisible())) memberErrors.push('Member navigation did not open.'); }
    const memberOverflow = await memberPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await memberPage.screenshot({ path: `artifacts/ui/member-${viewport.name}.png`, fullPage: true });
    results.push({ viewport: `member-${viewport.name}`, sections: 1, expectedSections: 1, horizontalOverflow: memberOverflow, consoleErrors: memberErrors });
    await memberPage.close();

    const role = viewport.width === 390 ? 'staff' : 'root';
    const rolePermissions = role === 'staff'
      ? ['services:view','services:create','services:update','services:delete','announcements:view','announcements:create','announcements:update','announcements:delete']
      : ['services:view','services:create','services:update','services:delete','announcements:view','announcements:create','announcements:update','announcements:delete','users:view','users:assign-role','users:delete','customer-requests:manage'];
    const page = await browser.newPage({ viewport });
    const errors = [];
    await page.route('**/api/admin/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, role, permissions: rolePermissions }) }));
    await page.route('**/api/announcements', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements }) }));
    await page.route('**/api/admin/services', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services }) }));
    await page.route('**/api/admin/users*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [{ id: '7', name: 'Staff Member', email: 'staff@example.test', role: 'staff', createdAt: '2026-09-20T00:00:00.000Z' }, { id: '8', name: 'Root Member', email: 'root@example.test', role: 'root', createdAt: '2026-09-20T00:00:00.000Z' }] }) }));
    await page.route('**/api/admin/customer-requests*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requests: [], total: 0 }) }));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
    const deleteButtons = await page.getByRole('button', { name: /Delete/ }).count();
    const editButtons = await page.getByRole('button', { name: /Edit/ }).count();
    if (!editButtons) errors.push(`${role} did not see edit controls.`);
    if (!deleteButtons) errors.push(`${role} did not see delete controls.`);
    if (role === 'staff' && (await page.locator('#user-management,#customer-requests').count())) errors.push('Staff saw root-only sections.');
    if (role === 'root' && !(await page.locator('#user-management').count())) errors.push('Root user management was missing.');
    if (await page.getByText('Root Member', { exact: true }).count()) errors.push('Root account appeared in user management.');
    if (await page.getByRole('link', { name: 'Back to website' }).count()) errors.push('Back to website remained visible.');
    if (await page.getByRole('button', { name: 'Sign out' }).count() !== 1 || await page.locator('.admin-header').getByRole('button', { name: 'Sign out' }).count()) errors.push('Sign out was not exclusively at the page bottom.');
    if (viewport.width <= 768) {
      const serviceActions = page.getByRole('heading', { name: 'Company services' }).locator('..').locator('.admin-list article').first().locator(':scope > div:last-child');
      const actionBoxes = await serviceActions.locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect()));
      if (actionBoxes.length !== 2 || Math.abs(actionBoxes[0].top - actionBoxes[1].top) > 2 || Math.abs(actionBoxes[0].width - actionBoxes[1].width) > 2) errors.push('Mobile Edit/Delete actions were not an equal-width row.');
      if (role === 'root') {
        const userBoxes = await page.locator('.user-list article').first().locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect()));
        if (userBoxes.length !== 2 || Math.abs(userBoxes[0].top - userBoxes[1].top) > 2) errors.push('Mobile user actions were not on one row.');
      }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await page.screenshot({ path: `artifacts/ui/admin-${role}-${viewport.name}.png`, fullPage: true });
    results.push({ viewport: `admin-${role}-${viewport.name}`, sections: 1, expectedSections: 1, horizontalOverflow: overflow, consoleErrors: errors });
    await page.close();
  }

  for (const viewport of [{ name: '1024', width: 1024, height: 800 }, { name: '1280', width: 1280, height: 800 }, { name: '1440', width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport }); const errors = [];
    await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '2', name: 'Staff Member', role: 'staff' } }) }));
    await page.route('**/api/admin/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, role: 'staff', permissions: [] }) }));
    await page.route('**/api/announcements', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ announcements: [] }) }));
    await page.route('**/api/services?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ services: [], filters: { categories: [] }, pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } }) }));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    if (await page.locator('.nav-links a[href="/admin"]').count() !== 1) errors.push('Staff management link was missing or duplicated.');
    if (await page.locator('.nav-links a[href="/dashboard"],.nav-links a[href="/account"]').count()) errors.push('Staff received duplicate member navigation.');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await page.screenshot({ path: `artifacts/ui/staff-header-${viewport.name}.png`, fullPage: true });
    results.push({ viewport: `staff-header-${viewport.name}`, sections: 6, expectedSections: 6, horizontalOverflow: overflow, consoleErrors: errors });
    await page.close();
  }

  for (const path of ['login', 'register']) {
    for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }]) {
      const authPage = await browser.newPage({ viewport });
      const authErrors = [];
      await authPage.route('**/api/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Sign-in is required.' }) }));
      authPage.on('pageerror', error => authErrors.push(error.message));
      await authPage.goto(`${baseUrl}/${path}`, { waitUntil: 'networkidle' });
      const top = authPage.locator('.auth-card-top');
      if (!(await top.locator('.logo').isVisible()) || !(await top.locator('.auth-home').isVisible())) authErrors.push('Auth card top row is incomplete.');
      if (await top.locator('.auth-home').getAttribute('href') !== '/') authErrors.push('Back to home link is incorrect.');
      const overlap = await top.evaluate(element => { const [logo, link] = element.children; const a = logo.getBoundingClientRect(); const b = link.getBoundingClientRect(); return a.right > b.left; });
      if (overlap) authErrors.push('Logo and Back to home overlap.');
      const overflow = await authPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      results.push({ viewport: `${path}-${viewport.name}`, sections: 1, expectedSections: 1, horizontalOverflow: overflow, consoleErrors: authErrors });
      await authPage.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.horizontalOverflow || result.consoleErrors.length || result.sections !== result.expectedSections)) process.exitCode = 1;
} finally {
  await server.close();
}
