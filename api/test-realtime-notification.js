// Send test notification via API
const http = require('http');

const data = JSON.stringify({
  type: 'success',
  title: 'Real-time Socket.IO Test',
  message: 'This notification should appear instantly via WebSocket!'
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
    console.log('Response status:', res.statusCode);
    console.log('Response body:', body);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
