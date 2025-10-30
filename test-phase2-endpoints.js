// Test script for Phase 2 batch tracking endpoints
const http = require('http');

// Helper to make HTTP requests
function makeRequest(method, path, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Phase 2 Batch Tracking API Tests\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣  Authenticating...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@pramara.local',
      password: 'test123'
    });

    if (loginRes.status !== 200) {
      console.error('❌ Login failed:', loginRes.data);
      return;
    }

    // Extract token from Set-Cookie header
    const setCookie = loginRes.headers['set-cookie'];
    const tokenMatch = setCookie && setCookie[0].match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.error('❌ No token received');
      return;
    }

    console.log('✅ Authenticated successfully\n');
    const cookie = `token=${token}`;

    // Step 2: Test batch creation
    console.log('2️⃣  Testing batch creation endpoint...');
    const batchData = {
      projectId: 1,
      projectSkuId: 1,
      stationId: 1,
      quantity: 1000,
      operatorId: 'user-123',
      materialLots: ['MAT-001', 'MAT-002'],
      totalWeight: 25.5,
      containerWeight: 2.0,
      unitWeight: 0.023,
      quantityMethod: 'weighed',
      subSkuIdentifier: 'RED-LARGE'
    };

    const createRes = await makeRequest('POST', '/api/batches', batchData, cookie);
    console.log(`Status: ${createRes.status}`);
    console.log('Response:', JSON.stringify(createRes.data, null, 2));

    if (createRes.status === 201 || createRes.status === 200) {
      console.log('✅ Batch creation successful\n');
      
      const batchId = createRes.data.batch?.id;
      if (batchId) {
        // Step 3: Test batch retrieval
        console.log('3️⃣  Testing batch retrieval endpoint...');
        const getRes = await makeRequest('GET', `/api/batches/${batchId}`, null, cookie);
        console.log(`Status: ${getRes.status}`);
        console.log('Response:', JSON.stringify(getRes.data, null, 2).substring(0, 500) + '...');
        console.log(getRes.status === 200 ? '✅ Batch retrieval successful\n' : '❌ Batch retrieval failed\n');

        // Step 4: Test batch movement
        console.log('4️⃣  Testing batch movement endpoint...');
        const moveRes = await makeRequest('POST', `/api/batches/${batchId}/move`, {
          toStationId: 2,
          operatorId: 'user-456',
          quantity: 1000,
          condition: 'good',
          notes: 'Test movement'
        }, cookie);
        console.log(`Status: ${moveRes.status}`);
        console.log('Response:', JSON.stringify(moveRes.data, null, 2));
        console.log(moveRes.status === 200 ? '✅ Batch movement successful\n' : '❌ Batch movement failed\n');
      }
    } else {
      console.log('❌ Batch creation failed\n');
    }

    // Step 5: Test batch list
    console.log('5️⃣  Testing batch list endpoint...');
    const listRes = await makeRequest('GET', '/api/batches', null, cookie);
    console.log(`Status: ${listRes.status}`);
    console.log(`Batches found: ${Array.isArray(listRes.data) ? listRes.data.length : 'N/A'}`);
    console.log(listRes.status === 200 ? '✅ Batch list successful\n' : '❌ Batch list failed\n');

    // Step 6: Test stub endpoints
    console.log('6️⃣  Testing stub endpoints...');
    const stubEndpoints = [
      { method: 'POST', path: '/api/batches/batch-id/split', name: 'Split' },
      { method: 'POST', path: '/api/batches/batch-id/reject', name: 'Reject' },
      { method: 'POST', path: '/api/batches/batch-id/rework-complete', name: 'Rework' },
      { method: 'POST', path: '/api/batches/assemble', name: 'Assemble' },
      { method: 'GET', path: '/api/batches/batch-id/trace-forward', name: 'Trace Forward' },
      { method: 'GET', path: '/api/batches/batch-id/trace-backward', name: 'Trace Backward' },
      { method: 'GET', path: '/api/batches/material-recall?materialLotCode=MAT-001', name: 'Material Recall' },
      { method: 'GET', path: '/api/batches/operator-tracking?operatorId=user-123', name: 'Operator Tracking' },
      { method: 'GET', path: '/api/batches/batch-id/handover-sheet', name: 'Handover Sheet' },
      { method: 'GET', path: '/api/batches/batch-id/qr-code', name: 'QR Code' },
    ];

    for (const endpoint of stubEndpoints) {
      const res = await makeRequest(endpoint.method, endpoint.path, endpoint.method === 'POST' ? {} : null, cookie);
      const status = res.status === 200 ? '✅' : '❌';
      console.log(`  ${status} ${endpoint.name}: ${res.status} - ${res.data.message || 'OK'}`);
    }

    console.log('\n7️⃣  Testing lot endpoints...');
    const lotEndpoints = [
      { method: 'POST', path: '/api/lots', name: 'Create Lot' },
      { method: 'GET', path: '/api/lots/lot-id', name: 'Get Lot' },
      { method: 'POST', path: '/api/lots/lot-id/add-batch', name: 'Add Batch to Lot' },
      { method: 'POST', path: '/api/lots/lot-id/ship', name: 'Ship Lot' },
      { method: 'GET', path: '/api/lots/lot-id/packing-list', name: 'Packing List' },
    ];

    for (const endpoint of lotEndpoints) {
      const res = await makeRequest(endpoint.method, endpoint.path, endpoint.method === 'POST' ? {} : null, cookie);
      const status = res.status === 200 ? '✅' : '❌';
      console.log(`  ${status} ${endpoint.name}: ${res.status} - ${res.data.message || 'OK'}`);
    }

    console.log('\n✅ All Phase 2 endpoint tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
runTests();
