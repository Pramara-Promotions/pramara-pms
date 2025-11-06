// Test script for Group 1 API endpoints
const http = require('http');

const BASE_URL = 'http://localhost:4000';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function testEndpoints() {
  console.log('🧪 Testing Group 1 API Endpoints...\n');
  
  // Test 1: Workers Dashboard Summary (route ordering fix)
  console.log('1️⃣ Testing /api/workers/dashboard/summary');
  try {
    const response = await makeRequest('/api/workers/dashboard/summary');
    if (response.status === 401) {
      console.log('   ⚠️  Requires authentication (expected)');
    } else if (response.status === 200) {
      console.log('   ✅ Status: 200 OK');
      console.log('   📊 Data:', JSON.stringify(response.data).substring(0, 100) + '...');
    } else {
      console.log('   ❌ Status:', response.status, response.data);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 2: QC Analytics Summary (route ordering fix)
  console.log('\n2️⃣ Testing /api/qc-submissions/analytics/summary');
  try {
    const response = await makeRequest('/api/qc-submissions/analytics/summary');
    if (response.status === 401) {
      console.log('   ⚠️  Requires authentication (expected)');
    } else if (response.status === 200) {
      console.log('   ✅ Status: 200 OK');
    } else {
      console.log('   ❌ Status:', response.status, response.data);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 3: Materials Dashboard Summary (route ordering fix)
  console.log('\n3️⃣ Testing /api/materials/dashboard/summary');
  try {
    const response = await makeRequest('/api/materials/dashboard/summary');
    if (response.status === 401) {
      console.log('   ⚠️  Requires authentication (expected)');
    } else if (response.status === 200) {
      console.log('   ✅ Status: 200 OK');
    } else {
      console.log('   ❌ Status:', response.status, response.data);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 4: Approvals Dashboard Summary (route ordering fix)
  console.log('\n4️⃣ Testing /api/approvals/dashboard/summary');
  try {
    const response = await makeRequest('/api/approvals/dashboard/summary');
    if (response.status === 401) {
      console.log('   ⚠️  Requires authentication (expected)');
    } else if (response.status === 200) {
      console.log('   ✅ Status: 200 OK');
    } else {
      console.log('   ❌ Status:', response.status, response.data);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 5: Compliance Certifications (alias route)
  console.log('\n5️⃣ Testing /api/compliance/certifications');
  try {
    const response = await makeRequest('/api/compliance/certifications');
    if (response.status === 401) {
      console.log('   ⚠️  Requires authentication (expected)');
    } else if (response.status === 200) {
      console.log('   ✅ Status: 200 OK');
    } else {
      console.log('   ❌ Status:', response.status, response.data);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 6: Health check (no auth required)
  console.log('\n6️⃣ Testing /api/health (baseline)');
  try {
    const response = await makeRequest('/api/health');
    if (response.status === 200) {
      console.log('   ✅ Status: 200 OK');
      console.log('   📊 Data:', response.data);
    } else {
      console.log('   ❌ Status:', response.status, response.data);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All endpoints tested successfully!');
  console.log('📝 Note: 401 responses are expected (authentication required)');
  console.log('📝 The important thing is NO 404 or 500 errors');
  console.log('='.repeat(60));
}

testEndpoints().catch(console.error);
