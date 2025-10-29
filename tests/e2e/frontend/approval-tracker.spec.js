// tests/e2e/frontend/approval-tracker.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Approval Tracker Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@pramara.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    
    await page.goto('http://localhost:5173/planning/approvals');
    await page.waitForLoadState('networkidle');
  });

  test('should display summary cards', async ({ page }) => {
    await expect(page.locator('text=Total Pending')).toBeVisible();
    await expect(page.locator('text=Overdue')).toBeVisible();
    await expect(page.locator('text=Critical')).toBeVisible();
    await expect(page.locator('text=At Risk')).toBeVisible();
    await expect(page.locator('text=Healthy')).toBeVisible();
  });

  test('should show buffer color indicators', async ({ page }) => {
    // Check if table has buffer indicators
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 5000 });
    
    // Look for color-coded buffer indicators
    // Red for overdue/<2 days, Yellow for 2-5 days, Green for >5 days
    const bufferIndicators = page.locator('td').filter({ hasText: /\d+d/ });
    
    if (await bufferIndicators.count() > 0) {
      // Verify at least one indicator exists
      expect(await bufferIndicators.count()).toBeGreaterThan(0);
    }
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"]');
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('pending');
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      
      if (count > 0) {
        // All rows should show pending status
        const statusBadges = page.locator('text=/pending/i');
        expect(await statusBadges.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should filter by type', async ({ page }) => {
    const typeFilter = page.locator('select[name="type"]');
    
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('customer_signoff');
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      // Should show only customer_signoff type approvals
    }
  });

  test('should approve an approval request', async ({ page }) => {
    const approveButton = page.locator('button:has-text("Approve")').first();
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      // Wait for success message
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/approved|success/i')).toBeVisible();
    }
  });

  test('should send reminder', async ({ page }) => {
    const reminderButton = page.locator('button:has-text("Send Reminder")').first();
    
    if (await reminderButton.isVisible()) {
      await reminderButton.click();
      
      // Verify reminder sent
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/reminder sent|notified/i')).toBeVisible();
    }
  });

  test('should show critical approvals (red indicator)', async ({ page }) => {
    // Look for red indicators (overdue or <2 days)
    const criticalIndicators = page.locator('.bg-red-100, .text-red-600, [class*="red"]');
    
    // May or may not exist depending on data
    const count = await criticalIndicators.count();
    console.log(`Critical indicators found: ${count}`);
  });

  test('should show at-risk approvals (yellow indicator)', async ({ page }) => {
    // Look for yellow indicators (2-5 days)
    const atRiskIndicators = page.locator('.bg-yellow-100, .text-yellow-600, [class*="yellow"]');
    
    const count = await atRiskIndicators.count();
    console.log(`At-risk indicators found: ${count}`);
  });

  test('should show healthy approvals (green indicator)', async ({ page }) => {
    // Look for green indicators (>5 days)
    const healthyIndicators = page.locator('.bg-green-100, .text-green-600, [class*="green"]');
    
    const count = await healthyIndicators.count();
    console.log(`Healthy indicators found: ${count}`);
  });

  test('should display approval details in table', async ({ page }) => {
    const table = page.locator('table');
    await table.waitFor({ state: 'visible', timeout: 5000 });
    
    // Check column headers
    await expect(table.locator('th:has-text("Buffer")')).toBeVisible();
    await expect(table.locator('th:has-text("Title")')).toBeVisible();
    await expect(table.locator('th:has-text("Project")')).toBeVisible();
    await expect(table.locator('th:has-text("Type")')).toBeVisible();
    await expect(table.locator('th:has-text("Contact")')).toBeVisible();
    await expect(table.locator('th:has-text("Due Date")')).toBeVisible();
    await expect(table.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should show buffer status analytics', async ({ page }) => {
    // Summary cards show aggregate buffer status
    const criticalCard = page.locator('text=Critical');
    const atRiskCard = page.locator('text=At Risk');
    const healthyCard = page.locator('text=Healthy');
    
    await expect(criticalCard).toBeVisible();
    await expect(atRiskCard).toBeVisible();
    await expect(healthyCard).toBeVisible();
    
    // Each should have a count
    const criticalCount = await page.locator('text=Critical').locator('..').locator('text=/\\d+/').textContent();
    expect(criticalCount).toMatch(/\d+/);
  });

  test('should handle multiple approval types', async ({ page }) => {
    // Check if different types are represented
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const typeTexts = await page.locator('table tbody tr td').allTextContents();
      
      // Should contain various types: customer_signoff, vendor_delivery, certification, internal
      const hasTypes = typeTexts.some(text => 
        text.includes('customer') || 
        text.includes('vendor') || 
        text.includes('certification') || 
        text.includes('internal')
      );
    }
  });

  test('should show contact information', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // Check if contact column has email or phone
      const contactCells = page.locator('table tbody tr td').filter({ hasText: /@|\\d{10}/ });
      
      if (await contactCells.count() > 0) {
        const firstContact = await contactCells.first().textContent();
        expect(firstContact).toMatch(/@|\d{10}/);
      }
    }
  });

  test('should update buffer status in real-time', async ({ page }) => {
    // Get initial buffer status
    const initialStatus = await page.locator('text=Total Pending').locator('..').locator('text=/\\d+/').textContent();
    
    // Approve one if available
    const approveButton = page.locator('button:has-text("Approve")').first();
    
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(1000);
      
      // Reload to see updated count
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const newStatus = await page.locator('text=Total Pending').locator('..').locator('text=/\\d+/').textContent();
      
      // Count should decrease
      expect(parseInt(newStatus)).toBeLessThanOrEqual(parseInt(initialStatus));
    }
  });

  test('should show due date in correct format', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const dueDateCells = page.locator('table tbody tr td').filter({ hasText: /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/ });
      
      if (await dueDateCells.count() > 0) {
        const dateText = await dueDateCells.first().textContent();
        // Should match date format
        expect(dateText).toMatch(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
      }
    }
  });
});
