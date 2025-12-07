const http = require('http');

// Get a valid dev token from the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Create a dev user for testing
    const user = await prisma.user.findFirst({
      where: { email: 'user1@pramara.com' }
    });

    if (!user) {
      console.error('No user found');
      process.exit(1);
    }

    console.log(`Testing dashboard endpoint as ${user.email}...\n`);

    // Make the request
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/dashboard/overview?days=30',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.id}`,
        'Cookie': `auth-token=${user.id}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:');
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
          
          // Check the counts
          console.log('\n📊 Key Metrics:');
          console.log(`onTrackCount: ${json.onTrackCount}`);
          console.log(`needAttentionCount: ${json.needAttentionCount}`);
          console.log(`production.totalOutput: ${json.production.totalOutput}`);
          console.log(`projects.byHealth: ${JSON.stringify(json.projects.byHealth)}`);
        } catch (e) {
          console.log(data);
        }
        process.exit(0);
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e);
      process.exit(1);
    });

    req.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
