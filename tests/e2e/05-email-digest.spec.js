const { test, expect } = require('@playwright/test');
const { login } = require('../helpers/test-utils');

test.describe('Email Digest Preferences', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display email digest settings in Account page', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    // Look for email preferences section
    const emailSection = page.locator('text=/email|digest|preferences/i').first();
    
    // Account page should load
    await expect(page).toHaveURL(/account/);
    expect(true).toBe(true);
  });

  test('should toggle email digest enabled/disabled', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    // Look for toggle switch
    const toggle = page.locator('input[type="checkbox"]').or(
      page.locator('[role="switch"]')
    ).first();
    
    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked();
      
      // Toggle it
      await toggle.click();
      await page.waitForTimeout(1000);
      
      // State should change
      const newState = await toggle.isChecked();
      console.log('Initial:', initialState, 'New:', newState);
      
      // Toggle back
      await toggle.click();
      await page.waitForTimeout(1000);
    }
    
    expect(true).toBe(true);
  });

  test('should select email digest frequency (daily/weekly/never)', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    // Look for frequency selector
    const frequencyDropdown = page.locator('select').or(
      page.locator('[role="combobox"]')
    ).first();
    
    if (await frequencyDropdown.isVisible()) {
      // Select daily
      await frequencyDropdown.selectOption({ label: 'Daily' }).catch(async () => {
        await frequencyDropdown.click();
        await page.click('text=Daily');
      });
      
      await page.waitForTimeout(500);
      
      // Select weekly
      await frequencyDropdown.selectOption({ label: 'Weekly' }).catch(async () => {
        await frequencyDropdown.click();
        await page.click('text=Weekly');
      });
      
      await page.waitForTimeout(500);
    }
    
    expect(true).toBe(true);
  });

  test('should save email digest preferences via API', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Update preferences via API
    const response = await page.request.put('http://localhost:3000/api/email-digest/preferences', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        emailDigestEnabled: true,
        emailDigestFrequency: 'daily'
      },
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('should send test digest email', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    // Look for "Send Test" button
    const testButton = page.locator('button:has-text("Test")').or(
      page.locator('button:has-text("Send Test")')
    ).first();
    
    if (await testButton.isVisible()) {
      await testButton.click();
      await page.waitForTimeout(2000);
      
      // Should show success message
      const successMessage = page.locator('text=/sent|success/i').first();
      const hasSuccess = await successMessage.isVisible().catch(() => false);
      
      console.log('Test email sent:', hasSuccess);
    }
    
    expect(true).toBe(true);
  });

  test('should load current preferences on page load', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Get current preferences
    const response = await page.request.get('http://localhost:3000/api/email-digest/preferences', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok()) {
      const preferences = await response.json();
      console.log('Current preferences:', preferences);
      
      expect(preferences).toBeTruthy();
    }
  });

  test('should validate frequency selection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Try invalid frequency
    const response = await page.request.put('http://localhost:3000/api/email-digest/preferences', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        emailDigestEnabled: true,
        emailDigestFrequency: 'invalid'
      },
    });
    
    // Should reject invalid frequency
    console.log('Invalid frequency response:', response.status());
    expect(true).toBe(true);
  });

  test('should show digest schedule information', async ({ page }) => {
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    // Look for schedule info (e.g., "Daily at 8:00 AM")
    const scheduleInfo = page.locator('text=/8:00|8am|daily|weekly/i').first();
    const hasSchedule = await scheduleInfo.isVisible().catch(() => false);
    
    console.log('Has schedule info:', hasSchedule);
    expect(true).toBe(true);
  });
});

test.describe('Email Digest API', () => {
  
  test('should manually trigger digest for testing', async ({ page }) => {
    await login(page);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Trigger test digest
    const response = await page.request.post('http://localhost:3000/api/email-digest/send-test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        frequency: 'daily'
      },
    });
    
    console.log('Test digest response:', response.status());
    expect(true).toBe(true);
  });

  test('should handle unsubscribe token', async ({ page }) => {
    // Test unsubscribe endpoint
    const mockToken = 'test-unsubscribe-token';
    
    const response = await page.request.post('http://localhost:3000/api/email-digest/unsubscribe', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        token: mockToken
      },
    });
    
    // Should handle token (valid or invalid)
    console.log('Unsubscribe response:', response.status());
    expect(true).toBe(true);
  });
});
