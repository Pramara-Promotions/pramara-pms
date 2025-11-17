// tests/e2e/frontend/workforce-skills.spec.js
const { test, expect } = require('@playwright/test');

async function getFirstProjectId(request) {
  const res = await request.get('http://localhost:3000/api/projects?includeHealth=true');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].id;
}

test.describe('Project-scoped Workforce Skill Matrix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@pramara.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
  });

  test('loads matrix view and training recommendations (empty-safe)', async ({ page, request }) => {
    const projectId = await getFirstProjectId(request);
    test.skip(!projectId, 'No project available');

    await page.goto(`http://localhost:5173/projects/${projectId}/workforce/skills`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Workforce Skill Matrix')).toBeVisible();

    // Empty-safe: tables or panels render without data
    const texts = [
      /Skills|Workers|Certifications/i,
      /Training Recommendations|No recommendations/i,
    ];
    for (const t of texts) {
      const locator = page.locator(`text=${t.source ? t.source : t}`);
      await expect(locator.first()).toBeAttached({ timeout: 5000 });
    }
  });
});
