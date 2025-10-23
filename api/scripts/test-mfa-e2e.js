// api/scripts/test-mfa-e2e.js
// Minimal E2E test for login -> MFA setup -> verify -> authenticated /api/me
// Requires API running at http://localhost:4000

const BASE = process.env.API_BASE || 'http://localhost:4000';

// Wait for API to be ready
async function waitForAPI(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const r = await fetch(`${BASE}/api/me`);
      console.log(`[e2e] API is reachable (status: ${r.status})`);
      return true;
    } catch (err) {
      console.log(`[e2e] Waiting for API... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('API not reachable after retries');
}

async function main() {
  await waitForAPI();
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pramara.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
  const testEmail = `mfa-e2e+${Date.now()}@pramara.local`;

  const adminJar = { cookie: '' };
  const userJar = { cookie: '' };
  const speakeasy = require('speakeasy');

  const r1 = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const loginData = await r1.json();
  if (!r1.ok) {
    throw new Error(`Admin login failed: ${r1.status} - ${JSON.stringify(loginData)}`);
  }

  // If admin needs MFA setup, do it first
  if (loginData.requiresMfaSetup) {
    console.log('[e2e] Admin needs MFA setup, setting it up...');
    
    // Get MFA setup
    const rSetup = await fetch(`${BASE}/api/mfa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.tempToken}` },
    });
    const setupData = await rSetup.json();
    if (!rSetup.ok) throw new Error(`Admin MFA setup failed: ${JSON.stringify(setupData)}`);
    
    // Generate TOTP and verify
    const adminCode = speakeasy.totp({ secret: setupData.base32, encoding: 'base32', window: 1 });
    const rVerify = await fetch(`${BASE}/api/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.tempToken}` },
      body: JSON.stringify({ base32: setupData.base32, token: adminCode }),
    });
    const setCookieAdmin = rVerify.headers.get('set-cookie') || '';
    if (!rVerify.ok || !setCookieAdmin) throw new Error('Admin MFA verify failed');
    adminJar.cookie = setCookieAdmin.split(',')[0].split(';')[0];
    console.log('[e2e] Admin MFA setup complete, cookie set');
  } else if (loginData.requiresMfa) {
    console.log('[e2e] Admin needs MFA verification...');
    
    // Get admin's MFA secret to generate code
    // For test purposes, we'll fetch it from DB (in real world, user scans from app)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { mfaSecret: true }
    });
    await prisma.$disconnect();
    
    if (!admin || !admin.mfaSecret) throw new Error('Admin has MFA enabled but no secret found');
    
    // Generate TOTP and verify login
    const adminCode = speakeasy.totp({ secret: admin.mfaSecret, encoding: 'base32', window: 1 });
    const rMfaLogin = await fetch(`${BASE}/api/mfa/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken: loginData.tempToken, totpToken: adminCode, trustDevice: false }),
    });
    const setCookieAdmin = rMfaLogin.headers.get('set-cookie') || '';
    const mfaLoginData = await rMfaLogin.json();
    console.log('[e2e] MFA verify-login response:', mfaLoginData);
    console.log('[e2e] MFA verify-login Set-Cookie:', setCookieAdmin || '(none)');
    if (!rMfaLogin.ok) {
      throw new Error(`Admin MFA login failed (${rMfaLogin.status}): ${JSON.stringify(mfaLoginData)}`);
    }
    if (!setCookieAdmin) {
      throw new Error('No Set-Cookie on MFA verify-login response');
    }
    adminJar.cookie = setCookieAdmin.split(',')[0].split(';')[0];
    console.log('[e2e] Admin MFA login complete, cookie set');
  } else {
    const setCookie1 = r1.headers.get('set-cookie') || '';
    if (!setCookie1) throw new Error('No cookie in admin login response');
    adminJar.cookie = setCookie1.split(',')[0].split(';')[0];
  }
  console.log('[e2e] Admin login OK, cookie:', adminJar.cookie);

  // Create user (ACTIVE, no invite)
  const r2 = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminJar.cookie },
    body: JSON.stringify({ email: testEmail, name: 'MFA E2E', sendInvite: false }),
  });
  const newUser = await r2.json();
  if (!r2.ok) throw new Error(`Create user failed: ${r2.status} ${JSON.stringify(newUser)}`);
  console.log('[e2e] Created user:', newUser.id, newUser.email);

  // User login -> should require MFA setup and return temp token
  const r3 = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'ChangeMe@123' }),
  });
  const loginJson = await r3.json();
  if (!r3.ok) throw new Error(`User login failed: ${r3.status} ${JSON.stringify(loginJson)}`);
  if (!loginJson.requiresMfaSetup || !loginJson.tempToken) {
    throw new Error('Expected requiresMfaSetup with tempToken');
  }
  const tempToken = loginJson.tempToken;
  console.log('[e2e] Login returned temp token');

  // Start MFA setup
  const r4 = await fetch(`${BASE}/api/mfa/setup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempToken}` },
  });
  const setupJson = await r4.json();
  if (!r4.ok) throw new Error(`MFA setup failed: ${r4.status} ${JSON.stringify(setupJson)}`);
  const base32 = setupJson.base32;
  if (!base32) throw new Error('No base32 secret returned');
  console.log('[e2e] Got base32 secret');

  // Generate a TOTP code
  const code = speakeasy.totp({ secret: base32, encoding: 'base32', window: 1 });

  // Verify -> should set Set-Cookie: token=...
  const r5 = await fetch(`${BASE}/api/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempToken}` },
    body: JSON.stringify({ base32, token: code }),
  });
  const setCookie2 = r5.headers.get('set-cookie') || '';
  const verifyJson = await r5.json();
  if (!r5.ok) throw new Error(`MFA verify failed: ${r5.status} ${JSON.stringify(verifyJson)}`);
  if (!setCookie2) throw new Error('No Set-Cookie on MFA verify response');
  userJar.cookie = setCookie2.split(',')[0].split(';')[0];
  console.log('[e2e] MFA verified, cookie:', userJar.cookie);

  // Call /api/me with user cookie
  const r6 = await fetch(`${BASE}/api/me`, { headers: { Cookie: userJar.cookie } });
  const me = await r6.json();
  if (!r6.ok) throw new Error(`/api/me failed: ${r6.status} ${JSON.stringify(me)}`);
  console.log('[e2e] /api/me OK:', { id: me.id, email: me.email, name: me.name });

  // Cleanup user
  const r7 = await fetch(`${BASE}/api/admin/users/${newUser.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminJar.cookie },
  });
  if (!r7.ok) throw new Error(`Cleanup delete failed: ${r7.status}`);
  console.log('[e2e] Cleanup: user deleted');

  console.log('\n[e2e] PASS: MFA setup and login flow works end-to-end');
}

main().catch((err) => {
  console.error('\n[e2e] FAIL:', err);
  process.exit(1);
});
