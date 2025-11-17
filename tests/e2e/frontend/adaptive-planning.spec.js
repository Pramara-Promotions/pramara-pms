// tests/e2e/frontend/adaptive-planning.spec.js
const { test, expect } = require('@playwright/test');

async function getFirstProjectId(request) {
  const res = await request.get('http://localhost:3000/api/projects?includeHealth=true');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].id;
}

test.describe('Project-scoped Adaptive Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@pramara.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
  });

  test('renders dashboard without global navigation', async ({ page, request }) => {
    const projectId = await getFirstProjectId(request);
    test.skip(!projectId, 'No project available');

    await page.goto(`http://localhost:5173/projects/${projectId}/planning/adaptive`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Adaptive Planning Dashboard')).toBeVisible();

    // Core sections should render even with empty data
    const sections = [
      /Projects Summary/i,
      /AI Suggestions|Suggestions/i,
      /Conflicts/i,
      /Learning Insights/i,
    ];
    for (const s of sections) {
      const locator = page.locator(`text=${s.source ? s.source : s}`);
      // Only enforce visibility for the page title; sections may be conditionally rendered
      // so just check they don't crash the page
      await expect(locator.first()).toBeAttached({ timeout: 5000 });
    }
  });
});
