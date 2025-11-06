/**
 * Quick Test Script for Workforce API
 * Run: node test-workforce-api.js
 */

const BASE_URL = 'http://localhost:3000';

async function testAPI(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    
    console.log(`\n✅ ${method} ${path}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    
    return { success: response.ok, data };
  } catch (error) {
    console.error(`\n❌ ${method} ${path}`);
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Workforce API Endpoints...\n');
  console.log('=' .repeat(60));
  
  // Test Dashboard
  await testAPI('GET', '/api/workforce/dashboard');
  
  // Test Workers List
  await testAPI('GET', '/api/workforce/workers?status=active');
  
  // Test Providers List
  await testAPI('GET', '/api/workforce/providers');
  
  // Test Leaderboard
  await testAPI('GET', '/api/workforce/performance/leaderboard?days=30&limit=10');
  
  // Test Compliance API (Group 1)
  await testAPI('GET', '/api/compliance?projectId=1');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('\nNote: 401 errors are expected if not authenticated.');
  console.log('Use Postman or browser with active session for full testing.');
}

runTests();
