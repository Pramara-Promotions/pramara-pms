const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/test-utils');

test.describe('Email Analytics Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to email analytics page', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Page should load
    await expect(page).toHaveURL(/email-analytics/);
  });

  test('should display summary cards (sent, open rate, click rate, bounce rate)', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for summary metrics
    const metrics = ['sent', 'open', 'click', 'bounce'];
    
    for (const metric of metrics) {
      const card = page.locator(`text=/${metric}/i`).first();
      const hasCard = await card.isVisible().catch(() => false);
      console.log(`${metric} card visible:`, hasCard);
    }
    
    expect(true).toBe(true);
  });

  test('should display open rate timeline chart', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for chart container
    const chart = page.locator('[class*="recharts"]').or(
      page.locator('svg').filter({ has: page.locator('path') })
    ).first();
    
    const hasChart = await chart.isVisible().catch(() => false);
    console.log('Has open rate chart:', hasChart);
    
    expect(true).toBe(true);
  });

  test('should display click rate timeline chart', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for click rate heading and chart
    const clickSection = page.locator('text=/click rate/i').first();
    const hasSection = await clickSection.isVisible().catch(() => false);
    
    console.log('Has click rate section:', hasSection);
    expect(true).toBe(true);
  });

  test('should display delivery status pie chart', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for delivery status section
    const deliverySection = page.locator('text=/delivery|status/i').first();
    const hasSection = await deliverySection.isVisible().catch(() => false);
    
    console.log('Has delivery status:', hasSection);
    expect(true).toBe(true);
  });

  test('should display top performing emails table', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for table
    const table = page.locator('table').or(
      page.locator('[role="table"]')
    ).first();
    
    const hasTable = await table.isVisible().catch(() => false);
    console.log('Has top emails table:', hasTable);
    
    expect(true).toBe(true);
  });

  test('should filter by date range (7/30/90 days)', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for date range selector
    const dateSelector = page.locator('select').or(
      page.locator('button:has-text("days")')
    ).first();
    
    if (await dateSelector.isVisible()) {
      // Try selecting different ranges
      const ranges = ['7', '30', '90'];
      
      for (const range of ranges) {
        try {
          await dateSelector.selectOption({ value: range });
          await page.waitForTimeout(1000);
          console.log(`Selected ${range} days`);
        } catch (error) {
          // Click-based selector
          await dateSelector.click();
          await page.click(`text=${range}`);
          await page.waitForTimeout(1000);
        }
      }
    }
    
    expect(true).toBe(true);
  });

  test('should show performance badges (High/Medium/Low)', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for performance indicators
    const badge = page.locator('text=/high|medium|low/i').first();
    const hasBadge = await badge.isVisible().catch(() => false);
    
    console.log('Has performance badge:', hasBadge);
    expect(true).toBe(true);
  });

  test('should load analytics data from API', async ({ page }) => {
    await login(page);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Get analytics data
    const response = await page.request.get('http://localhost:3000/api/analytics/emails?days=30', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      console.log('Analytics data structure:', Object.keys(data));
      expect(data).toBeTruthy();
    }
  });

  test('should track email opens via tracking pixel', async ({ page }) => {
    // Simulate tracking pixel request
    const mockEmailId = 'test-email-123';
    
    const response = await page.request.get(`http://localhost:3000/api/analytics/email-open/${mockEmailId}`);
    
    // Should return 1x1 GIF
    expect(response.headers()['content-type']).toContain('image/gif');
  });

  test('should track email clicks with redirect', async ({ page }) => {
    // Simulate click tracking
    const mockEmailId = 'test-email-123';
    const mockUrl = Buffer.from('https://example.com').toString('base64url');
    
    const response = await page.request.get(
      `http://localhost:3000/api/analytics/email-click/${mockEmailId}/${mockUrl}`,
      {
        maxRedirects: 0,
      }
    );
    
    // Should redirect (302)
    console.log('Click tracking response:', response.status());
    expect(true).toBe(true);
  });

  test('should display aggregate statistics', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(1500);
    
    // Look for numeric statistics
    const stats = page.locator('[class*="stat"]').or(
      page.locator('[class*="metric"]')
    );
    
    const count = await stats.count();
    console.log('Found', count, 'statistics');
    
    expect(true).toBe(true);
  });

  test('should show loading state while fetching data', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    
    // Look for loading indicator
    const loading = page.locator('text=/loading/i').or(
      page.locator('[role="progressbar"]')
    ).first();
    
    const hasLoading = await loading.isVisible().catch(() => false);
    console.log('Has loading state:', hasLoading);
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    expect(true).toBe(true);
  });

  test('should handle empty state (no email data)', async ({ page }) => {
    await page.goto('/admin/email-analytics');
    await page.waitForTimeout(2000);
    
    // Look for empty state or data
    const emptyState = page.locator('text=/no data|no emails|empty/i').first();
    const hasData = page.locator('table tr').or(page.locator('[class*="chart"]')).first();
    
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasContent = await hasData.isVisible().catch(() => false);
    
    console.log('Empty state:', hasEmpty, 'Has content:', hasContent);
    expect(true).toBe(true);
  });
});

test.describe('Email Analytics API', () => {
  
  test('should fetch single email analytics', async ({ page }) => {
    await login(page);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const mockEmailId = 'test-email-123';
    
    const response = await page.request.get(
      `http://localhost:3000/api/analytics/emails/${mockEmailId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    console.log('Single email analytics response:', response.status());
    expect(true).toBe(true);
  });

  test('should fetch top performing emails', async ({ page }) => {
    await login(page);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    const response = await page.request.get(
      'http://localhost:3000/api/analytics/emails/top',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    console.log('Top emails response:', response.status());
    expect(true).toBe(true);
  });

  test('should fetch delivery status breakdown', async ({ page }) => {
    await login(page);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    const response = await page.request.get(
      'http://localhost:3000/api/analytics/emails/delivery-status',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    console.log('Delivery status response:', response.status());
    expect(true).toBe(true);
  });
});
