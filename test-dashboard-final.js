/**
 * Test the actual /api/dashboard/overview endpoint with dev auth
 */
const http = require('http');

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `auth-token=${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    console.log('\n🔍 Testing Dashboard Endpoint\n');
    
    // Use a dev token
    const devToken = 'dev-token-test-user';
    
    console.log('Making request to /api/dashboard/overview?days=30');
    console.log(`Using dev token: ${devToken}\n`);
    
    const response = await makeRequest('/api/dashboard/overview?days=30', devToken);
    
    console.log(`Status: ${response.status}\n`);
    
    if (response.status === 200) {
      const data = response.body;
      console.log('✅ SUCCESS\n');
      console.log('📊 Key Metrics:');
      console.log(`  onTrackCount: ${data.onTrackCount}`);
      console.log(`  needAttentionCount: ${data.needAttentionCount}`);
      console.log(`  production.totalOutput: ${data.production.totalOutput}`);
      console.log(`  projects.byHealth: ${JSON.stringify(data.projects.byHealth)}`);
      
      if (data.onTrackCount === 0 && data.needAttentionCount === 20) {
        console.log('\n✅ Counts are correct! Dashboard should now display:');
        console.log(`  "On Track": ${data.onTrackCount}`);
        console.log(`  "Need Attention": ${data.needAttentionCount}`);
      }
    } else {
      console.log('❌ ERROR\n');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Request error:', e.message);
    process.exit(1);
  }
})();
