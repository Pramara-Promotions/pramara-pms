#!/usr/bin/env node

/**
 * Quick Setup Script for Multi-Device Development
 * 
 * Usage:
 *   node scripts/setup-env.js local    # Setup for single-machine development
 *   node scripts/setup-env.js network  # Setup for multi-device development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const mode = args[0];

if (!mode || !['local', 'network'].includes(mode)) {
  console.log('\n❌ Invalid mode. Usage:\n');
  console.log('   node scripts/setup-env.js local    # Single-machine development');
  console.log('   node scripts/setup-env.js network  # Multi-device development\n');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const templatePath = path.join(rootDir, `.env.${mode}`);

function copyEnvTemplate() {
  if (!fs.existsSync(templatePath)) {
    console.log(`\n❌ Template file not found: .env.${mode}\n`);
    process.exit(1);
  }

  // Backup existing .env if it exists
  if (fs.existsSync(envPath)) {
    const backupPath = path.join(rootDir, `.env.backup.${Date.now()}`);
    fs.copyFileSync(envPath, backupPath);
    console.log(`\n📦 Backed up existing .env to: ${path.basename(backupPath)}`);
  }

  // Copy template to .env
  fs.copyFileSync(templatePath, envPath);
  console.log(`✅ Copied .env.${mode} to .env\n`);
}

function getNetworkIP() {
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && 
            !name.toLowerCase().includes('vmware') && 
            !name.toLowerCase().includes('virtualbox') &&
            !name.toLowerCase().includes('vethernet')) {
          return iface.address;
        }
      }
    }
  } catch (err) {
    console.error('Error detecting network IP:', err.message);
  }
  return null;
}

function replaceNetworkIP() {
  const ip = getNetworkIP();
  
  if (!ip) {
    console.log('⚠️  Could not auto-detect network IP.');
    console.log('   Please manually edit .env and replace YOUR_NETWORK_IP with your actual IP.\n');
    console.log('   Run: node scripts/get-network-ip.js to find your IP\n');
    return;
  }

  console.log(`🔍 Detected network IP: ${ip}\n`);

  let content = fs.readFileSync(envPath, 'utf8');
  content = content.replace(/YOUR_NETWORK_IP/g, ip);
  fs.writeFileSync(envPath, content, 'utf8');

  console.log('✅ Updated .env with your network IP\n');
}

function displayInstructions() {
  if (mode === 'local') {
    console.log('📌 Local development mode configured!\n');
    console.log('   Services will run on localhost only.');
    console.log('   Access the app at: http://localhost:5173\n');
  } else {
    const ip = getNetworkIP();
    console.log('📌 Network development mode configured!\n');
    
    if (ip) {
      console.log('   Access from this machine:');
      console.log(`   - Frontend: http://localhost:5173 or http://${ip}:5173`);
      console.log(`   - API:      http://localhost:4000 or http://${ip}:4000`);
      console.log(`   - MinIO:    http://localhost:9001 or http://${ip}:9001\n`);
      
      console.log('   Access from other devices on the same network:');
      console.log(`   - Frontend: http://${ip}:5173`);
      console.log(`   - API:      http://${ip}:4000`);
      console.log(`   - MinIO:    http://${ip}:9001\n`);
    }
    
    console.log('   ⚠️  Make sure to:');
    console.log('   1. Start Vite with: npm run dev -- --host');
    console.log('   2. Configure firewall to allow ports 4000, 5173, 9000, 9001');
    console.log('   3. See docs/MULTI_DEVICE_SETUP.md for detailed instructions\n');
  }

  console.log('🚀 Next steps:');
  console.log('   1. docker-compose up -d');
  console.log('   2. cd api && npm run dev');
  console.log('   3. cd web && npm run dev' + (mode === 'network' ? ' -- --host' : ''));
  console.log();
}

function main() {
  console.log(`\n🔧 Setting up environment for ${mode} development...\n`);
  
  copyEnvTemplate();
  
  if (mode === 'network') {
    replaceNetworkIP();
  }
  
  displayInstructions();
}

main();
