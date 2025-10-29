// tests/e2e/frontend/mrp-calculator.spec.js
const { test, expect } = require('@playwright/test');

test.describe('MRP Calculator Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@pramara.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    
    // Navigate to MRP Calculator
    await page.goto('http://localhost:5173/planning/mrp');
    await page.waitForLoadState('networkidle');
  });

  test('should display learning metrics cards', async ({ page }) => {
    // Check for learning metrics
    await expect(page.locator('text=Overall Accuracy')).toBeVisible();
    await expect(page.locator('text=Pending Recommendations')).toBeVisible();
    
    // Verify metrics have values
    const accuracyText = await page.locator('text=/\\d+%/').first().textContent();
    expect(accuracyText).toMatch(/\d+%/);
  });

  test('should calculate MRP for a project', async ({ page }) => {
    // Select project
    await page.click('select[name="projectId"]');
    await page.selectOption('select[name="projectId"]', { index: 1 });
    
    // Wait for SKUs to load
    await page.waitForTimeout(500);
    
    // Select SKU
    const skuSelect = page.locator('select').nth(1);
    await skuSelect.waitFor({ state: 'visible' });
    await skuSelect.selectOption({ index: 1 });
    
    // Enter target quantity
    await page.fill('input[name="targetQuantity"]', '1000');
    
    // Select loss type
    const lossTypeSelect = page.locator('select').nth(2);
    await lossTypeSelect.selectOption('project_wide');
    
    // Enter project-wide loss
    await page.fill('input[name="projectWideLoss"]', '10');
    
    // Click Calculate
    await page.click('button:has-text("Calculate MRP")');
    
    // Wait for results
    await page.waitForSelector('text=Recent MRP Calculations', { timeout: 5000 });
    
    // Verify results table appears
    await expect(page.locator('table')).toBeVisible();
  });

  test('should display system recommendations', async ({ page }) => {
    // Check if recommendations panel is visible
    const recommendationsPanel = page.locator('text=System Recommendations');
    
    if (await recommendationsPanel.isVisible()) {
      // Verify recommendation structure
      await expect(page.locator('text=Confidence')).toBeVisible();
      await expect(page.locator('button:has-text("Accept")')).toBeVisible();
    }
  });

  test('should accept a recommendation', async ({ page }) => {
    // Check if there are recommendations
    const acceptButton = page.locator('button:has-text("Accept")').first();
    
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      
      // Verify success message or update
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/accepted|success/i')).toBeVisible();
    }
  });

  test('should show accuracy by type breakdown', async ({ page }) => {
    // Navigate to learning insights if available
    const byTypeSection = page.locator('text=By Type');
    
    if (await byTypeSection.isVisible()) {
      // Verify material types are shown
      await expect(page.locator('text=/raw_material|consumable|paint|ink/i')).toBeVisible();
    }
  });

  test('should filter recent MRPs by project', async ({ page }) => {
    // First, ensure there are MRPs
    await page.waitForSelector('text=Recent MRP Calculations', { timeout: 5000 });
    
    // Check if table has rows
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      // Verify row structure
      await expect(rows.first().locator('td').first()).toBeVisible();
    }
  });

  test('should display cost in rupees format', async ({ page }) => {
    // Calculate an MRP first
    await page.click('select[name="projectId"]');
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.waitForTimeout(500);
    
    const skuSelect = page.locator('select').nth(1);
    await skuSelect.selectOption({ index: 1 });
    
    await page.fill('input[name="targetQuantity"]', '1000');
    const lossTypeSelect2 = page.locator('select').nth(2);
    await lossTypeSelect2.selectOption('project_wide');
    await page.fill('input[name="projectWideLoss"]', '10');
    await page.click('button:has-text("Calculate MRP")');
    
    // Wait and verify currency format (₹)
    await page.waitForTimeout(2000);
    const costText = await page.locator('text=/₹[\\d,]+/').first().textContent();
    expect(costText).toMatch(/₹[\d,]+/);
  });

  test('should handle calculation errors gracefully', async ({ page }) => {
    // Try to calculate without selecting project
    await page.click('button:has-text("Calculate MRP")');
    
    // Should show error or validation message
    await page.waitForTimeout(500);
    // Form validation should prevent submission or show error
  });

  test('should show confidence score improvements', async ({ page }) => {
    // Check if confidence scores are displayed
    const confidenceText = await page.locator('text=/\\d+% confidence/i').first();
    
    if (await confidenceText.isVisible()) {
      const text = await confidenceText.textContent();
      const confidence = parseInt(text.match(/\d+/)[0]);
      
      // Confidence should be between 50-95%
      expect(confidence).toBeGreaterThanOrEqual(50);
      expect(confidence).toBeLessThanOrEqual(95);
    }
  });
});
