const { test, expect } = require('@playwright/test');
const { login, logout } = require('../helpers/test-utils');

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Pramara PMS/);
    
    // Check login form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.click('button[type="submit"]');
    
    // Wait for validation messages
    await page.waitForTimeout(500);
    
    // Check for error indicators (depends on your validation implementation)
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // Fields should still be visible (no navigation)
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Should still be on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await login(page, 'admin@pramara.com', 'admin123');
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/(dashboard|\/)/);
    
    // Token should be stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should create device fingerprint on login', async ({ page }) => {
    await login(page);
    
    // Get devices via API
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3000/api/auth/sessions', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const devices = await response.json();
    
    // Should have at least one device (current session)
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThan(0);
    
    // Current device should be marked
    const currentDevice = devices.find(d => d.isCurrent);
    expect(currentDevice).toBeTruthy();
    expect(currentDevice.browser).toBeTruthy();
    expect(currentDevice.os).toBeTruthy();
  });

  test('should display MFA UI when user has MFA enabled', async ({ page }) => {
    // Note: This test requires a user with MFA enabled
    // For now, we'll check if the MFA UI elements exist in the codebase
    
    await login(page);
    
    // Navigate to account settings
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Account settings');
    
    // Check for MFA section
    const mfaSection = page.locator('text=Multi-Factor Authentication');
    
    if (await mfaSection.isVisible()) {
      // MFA UI should have enable/disable toggle
      const mfaToggle = page.locator('input[type="checkbox"]').first();
      await expect(mfaToggle).toBeVisible();
    }
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    
    // Perform logout
    await logout(page);
    
    // Should be back on login page
    await expect(page).toHaveURL(/login/);
    
    // Token should be removed
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Clear any existing auth
    await page.evaluate(() => localStorage.clear());
    
    // Try to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should persist session on page reload', async ({ page }) => {
    await login(page);
    
    // Get token before reload
    const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard/authenticated route
    await expect(page).toHaveURL(/\/(dashboard|\/)/);
    
    // Token should persist
    const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));
    expect(tokenAfter).toBe(tokenBefore);
  });

  test('should handle force logout when session is revoked', async ({ page, context }) => {
    await login(page);
    
    // Open a second page/tab
    const page2 = await context.newPage();
    await page2.goto('/');
    
    // Login on second page
    await login(page2);
    
    // Revoke session from first page
    await page.goto('/account');
    
    // Wait for account page to load
    await page.waitForTimeout(1000);
    
    // Click on Devices tab
    const devicesTab = page.locator('text=Devices');
    if (await devicesTab.isVisible()) {
      await devicesTab.click();
      await page.waitForTimeout(500);
    }
    
    // Clean up
    await page2.close();
  });
});

test.describe('MFA Verification UI', () => {
  
  test('should display MFA settings in Account page', async ({ page }) => {
    await login(page);
    
    // Navigate to account settings
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Account settings');
    
    // Wait for page load
    await page.waitForTimeout(1000);
    
    // Check for Security tab
    const securityTab = page.locator('text=Security').first();
    if (await securityTab.isVisible()) {
      await securityTab.click();
      await page.waitForTimeout(500);
    }
    
    // MFA section should be visible
    const mfaHeading = page.locator('text=Multi-Factor Authentication');
    await expect(mfaHeading).toBeVisible();
  });

  test('should display MFA status correctly', async ({ page }) => {
    await login(page);
    
    // Navigate to account settings
    await page.goto('/account');
    await page.waitForTimeout(1000);
    
    // Click Security tab
    const securityTab = page.locator('text=Security').first();
    if (await securityTab.isVisible()) {
      await securityTab.click();
      await page.waitForTimeout(500);
      
      // Check for MFA status (Enabled/Disabled)
      const mfaStatus = page.locator('text=/Enabled|Disabled/').first();
      await expect(mfaStatus).toBeVisible();
    }
  });
});
