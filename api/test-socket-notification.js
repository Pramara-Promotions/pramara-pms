// Test Socket.IO notification delivery with console output
const http = require('http');

console.log('🧪 Testing real-time Socket.IO notification delivery...\n');

const data = JSON.stringify({
  type: 'info',
  title: 'Real-time Delivery Test #' + Date.now(),
  message: 'Testing instant delivery via WebSocket connection'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/notifications/test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cookie': 'token=dev-token-admin'
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`✅ HTTP Response: ${res.statusCode}`);
    if (res.statusCode === 201) {
      const notification = JSON.parse(body);
      console.log(`📝 Notification created with ID: ${notification.id}`);
      console.log(`👤 User ID: ${notification.userId}`);
      console.log(`📨 Type: ${notification.type}`);
      console.log(`📋 Title: ${notification.title}`);
      console.log('\n✨ If Socket.IO is working, you should see a "Real-time notification sent" log in the server console.');
    } else {
      console.log('❌ Error response:', body);
    }
  });
});

req.on('error', error => {
  console.error('❌ Request error:', error.message);
});

console.log(`📤 Sending POST request to ${options.hostname}:${options.port}${options.path}...`);
req.write(data);
req.end();
