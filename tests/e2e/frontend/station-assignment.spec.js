// tests/e2e/frontend/station-assignment.spec.js
const { test, expect } = require('@playwright/test');

async function getFirstProjectId(request) {
  const res = await request.get('http://localhost:3000/api/projects?includeHealth=true');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].id;
}

test.describe('Project-scoped Station Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@pramara.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
  });

  test('loads and shows empty-safe state', async ({ page, request }) => {
    const projectId = await getFirstProjectId(request);
    test.skip(!projectId, 'No project available');

    await page.goto(`http://localhost:5173/projects/${projectId}/execution/station-assignment`);
    await page.waitForLoadState('networkidle');

    // Basic sanity: page header
    await expect(page.getByText('Station Assignment')).toBeVisible();

    // Empty-safe: either shows unassigned list or an empty state message
    const unassigned = page.locator('text=/Unassigned|No pending|No unassigned/i');
    await expect(unassigned.first()).toBeVisible({ timeout: 5000 });
  });
});
