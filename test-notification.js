// Test script to create a test notification
const http = require('http');

const data = JSON.stringify({
  type: 'success',
  title: 'Test Notification',
  message: 'This is a test notification from the system. Everything is working correctly!'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/notifications/test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cookie': 'token=dev-token-' + Date.now()
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    if (res.statusCode === 201) {
      console.log('\n✅ Test notification created successfully!');
      console.log('Check your UI notification bell icon.');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
