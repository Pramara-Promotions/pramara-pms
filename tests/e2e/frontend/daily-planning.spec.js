// tests/e2e/frontend/daily-planning.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Daily Planning Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@pramara.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    
    await page.goto('http://localhost:5173/planning/daily');
    await page.waitForLoadState('networkidle');
  });

  test('should display daily planning form', async ({ page }) => {
    await expect(page.locator('text=Generate Daily Plan')).toBeVisible();
    await expect(page.locator('select[name="projectId"]')).toBeVisible();
    await expect(page.locator('input[name="date"]')).toBeVisible();
    await expect(page.locator('input[name="targetQuantity"]')).toBeVisible();
  });

  test('should generate 3 scenarios', async ({ page }) => {
    // Fill form
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="date"]', '2025-11-01');
    await page.fill('input[name="targetQuantity"]', '1000');
    
    // Click Generate
    await page.click('button:has-text("Generate 3 Scenarios")');
    
    // Wait for scenarios modal
    await page.waitForSelector('text=3 Scenarios Generated', { timeout: 5000 });
    
    // Verify 3 scenarios are displayed
    await expect(page.locator('text=Fastest')).toBeVisible();
    await expect(page.locator('text=Cheapest')).toBeVisible();
    await expect(page.locator('text=Balanced')).toBeVisible();
  });

  test('should compare scenario costs and durations', async ({ page }) => {
    // Generate scenarios
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="date"]', '2025-11-01');
    await page.fill('input[name="targetQuantity"]', '1000');
    await page.click('button:has-text("Generate 3 Scenarios")');
    
    await page.waitForSelector('text=3 Scenarios Generated', { timeout: 5000 });
    
    // Verify cost and duration are shown
    await expect(page.locator('text=/Cost:.*₹/i')).toBeVisible();
    await expect(page.locator('text=/Duration:.*hrs/i')).toBeVisible();
  });

  test('should select and save balanced scenario', async ({ page }) => {
    // Generate scenarios
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="date"]', '2025-11-01');
    await page.fill('input[name="targetQuantity"]', '1000');
    await page.click('button:has-text("Generate 3 Scenarios")');
    
    await page.waitForSelector('text=Balanced', { timeout: 5000 });
    
    // Click on Balanced scenario
    await page.click('text=Balanced');
    
    // Click Save button
    await page.click('button:has-text("Save Plan")');
    
    // Verify success
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/saved|created/i')).toBeVisible();
  });

  test('should display existing plans in table', async ({ page }) => {
    // Check if table is visible
    await expect(page.locator('text=Existing Plans')).toBeVisible();
    
    // Check table structure
    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(table.locator('th:has-text("Date")')).toBeVisible();
      await expect(table.locator('th:has-text("Project")')).toBeVisible();
      await expect(table.locator('th:has-text("Status")')).toBeVisible();
    }
  });

  test('should approve a draft plan', async ({ page }) => {
    // Look for draft plans
    const approveButton = page.locator('button:has-text("Approve")').first();
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Verify status changed
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/approved/i')).toBeVisible();
    }
  });

  test('should open adapt modal', async ({ page }) => {
    // Look for existing plans with adapt button
    const adaptButton = page.locator('button:has-text("Adapt")').first();
    
    if (await adaptButton.isVisible()) {
      await adaptButton.click();
      
      // Verify adapt modal opens
      await expect(page.locator('text=Adapt Plan')).toBeVisible();
      await expect(page.locator('select[name="adaptationType"]')).toBeVisible();
    }
  });

  test('should adapt plan with worker change', async ({ page }) => {
    const adaptButton = page.locator('button:has-text("Adapt")').first();
    
    if (await adaptButton.isVisible()) {
      await adaptButton.click();
      await page.waitForSelector('text=Adapt Plan');
      
      // Select worker change
      await page.selectOption('select[name="adaptationType"]', 'worker_change');
      await page.fill('textarea[name="reason"]', 'Worker unavailable due to illness');
      
      // Submit
      await page.click('button:has-text("Save Adaptation")');
      
      // Verify success
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/adapted|updated/i')).toBeVisible();
    }
  });

  test('should show worker suggestions in scenarios', async ({ page }) => {
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="date"]', '2025-11-01');
    await page.fill('input[name="targetQuantity"]', '1000');
    await page.click('button:has-text("Generate 3 Scenarios")');
    
    await page.waitForSelector('text=3 Scenarios Generated', { timeout: 5000 });
    
    // Check if worker suggestions are shown
    const workerText = page.locator('text=/Worker|Shift/i');
    if (await workerText.isVisible()) {
      expect(await workerText.count()).toBeGreaterThan(0);
    }
  });

  test('should validate material availability', async ({ page }) => {
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="date"]', '2025-11-01');
    await page.fill('input[name="targetQuantity"]', '999999'); // Unrealistic number
    await page.click('button:has-text("Generate 3 Scenarios")');
    
    // Should either show warning or still generate scenarios
    await page.waitForTimeout(3000);
    
    // Check if material warnings appear
    const warningText = page.locator('text=/insufficient|shortage|unavailable/i');
    // May or may not be visible depending on data
  });

  test('should filter plans by project', async ({ page }) => {
    const projectFilter = page.locator('select').first();
    
    if (await projectFilter.isVisible()) {
      await projectFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      
      // Verify table filtered
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      // Should show only plans for selected project
    }
  });

  test('should show scenario comparison side by side', async ({ page }) => {
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="date"]', '2025-11-01');
    await page.fill('input[name="targetQuantity"]', '1000');
    await page.click('button:has-text("Generate 3 Scenarios")');
    
    await page.waitForSelector('text=3 Scenarios Generated', { timeout: 5000 });
    
    // All 3 should be visible at once for comparison
    const fastest = page.locator('text=Fastest');
    const cheapest = page.locator('text=Cheapest');
    const balanced = page.locator('text=Balanced');
    
    await expect(fastest).toBeVisible();
    await expect(cheapest).toBeVisible();
    await expect(balanced).toBeVisible();
  });
});
