const { expect } = require('@playwright/test');

/**
 * Login helper function
 */
async function login(page, email = 'admin@pramara.com', password = 'admin123') {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL(/\/(dashboard|\/)/);
  
  // Store auth token
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return token;
}

/**
 * Logout helper function
 */
async function logout(page) {
  await page.click('button[aria-label="User menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/login');
}

/**
 * Create a test user via API
 */
async function createTestUser(page, userData = {}) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  const defaultUser = {
    email: `test${Date.now()}@test.com`,
    name: 'Test User',
    password: 'Test123!@#',
    isActive: true,
    ...userData
  };
  
  const response = await page.request.post('http://localhost:3000/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: defaultUser,
  });
  
  return await response.json();
}

/**
 * Delete a test user via API
 */
async function deleteTestUser(page, userId) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  await page.request.delete(`http://localhost:3000/api/admin/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

/**
 * Wait for WebSocket connection
 */
async function waitForWebSocket(page) {
  await page.waitForFunction(() => {
    return window.socket && window.socket.connected;
  }, { timeout: 10000 });
}

/**
 * Trigger a notification via API
 */
async function triggerNotification(page, notificationData = {}) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  const defaultNotification = {
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info',
    priority: 'medium',
    ...notificationData
  };
  
  const response = await page.request.post('http://localhost:3000/api/notifications', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: defaultNotification,
  });
  
  return await response.json();
}

/**
 * Clear all notifications
 */
async function clearNotifications(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  await page.request.delete('http://localhost:3000/api/notifications/clear', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

/**
 * Get current user's devices
 */
async function getDevices(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  const response = await page.request.get('http://localhost:3000/api/auth/sessions', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return await response.json();
}

/**
 * Trust current device
 */
async function trustDevice(page, duration = 30) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  const response = await page.request.post('http://localhost:3000/api/auth/trust-device', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { duration },
  });
  
  return await response.json();
}

/**
 * Wait for element with retry
 */
async function waitForElement(page, selector, options = {}) {
  const { timeout = 10000, visible = true } = options;
  
  await page.waitForSelector(selector, {
    timeout,
    state: visible ? 'visible' : 'attached',
  });
}

/**
 * Check if element exists
 */
async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Database cleanup helper (resets test data)
 */
async function cleanupDatabase(page) {
  // This would connect to the test database and clean up
  // For now, we'll use API endpoints to clean specific data
  await clearNotifications(page);
}

module.exports = {
  login,
  logout,
  createTestUser,
  deleteTestUser,
  waitForWebSocket,
  triggerNotification,
  clearNotifications,
  getDevices,
  trustDevice,
  waitForElement,
  elementExists,
  cleanupDatabase,
};
