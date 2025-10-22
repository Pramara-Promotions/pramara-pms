#!/usr/bin/env node

/**
 * Get Network IP Address
 * 
 * This script detects and displays your machine's local network IP address.
 * Use this IP to configure multi-device development.
 */

const os = require('os');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          name,
          address: iface.address,
          netmask: iface.netmask,
          cidr: iface.cidr
        });
      }
    }
  }

  return ips;
}

function main() {
  console.log('\n🔍 Detecting network IP addresses...\n');

  const ips = getNetworkIP();

  if (ips.length === 0) {
    console.log('❌ No network interfaces found.');
    console.log('   Make sure you are connected to a network (WiFi or Ethernet).\n');
    process.exit(1);
  }

  console.log('✅ Found the following network interfaces:\n');

  ips.forEach((ip, index) => {
    console.log(`[${index + 1}] ${ip.name}`);
    console.log(`    IP Address: ${ip.address}`);
    console.log(`    Netmask:    ${ip.netmask}`);
    console.log(`    CIDR:       ${ip.cidr}`);
    console.log();
  });

  // Recommend the first non-virtual interface
  const recommended = ips.find(ip => 
    !ip.name.toLowerCase().includes('vmware') && 
    !ip.name.toLowerCase().includes('virtualbox') &&
    !ip.name.toLowerCase().includes('vethernet')
  ) || ips[0];

  console.log('📌 Recommended IP for multi-device development:');
  console.log(`   ${recommended.address}\n`);

  console.log('📝 Update your .env file with this IP:');
  console.log(`   APP_URL="http://${recommended.address}:4000"`);
  console.log(`   CORS_ORIGIN="http://${recommended.address}:5173,http://localhost:5173"`);
  console.log(`   S3_ENDPOINT="http://${recommended.address}:9000"`);
  console.log(`   S3_PUBLIC_BASE="http://${recommended.address}:9000/pramara"`);
  console.log(`   MINIO_ENDPOINT=${recommended.address}`);
  console.log();

  console.log('📚 For detailed setup instructions, see:');
  console.log('   docs/MULTI_DEVICE_SETUP.md\n');
}

main();
