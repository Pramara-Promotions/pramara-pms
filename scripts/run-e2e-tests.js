#!/usr/bin/env node
/**
 * E2E Test Runner - Executes all Phase 2 tests
 * Usage: npm run test:all
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function runTest(name, command, directory) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🧪 Running: ${name}`, 'bright');
  log('='.repeat(60), 'cyan');
  
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execPromise(command, { cwd: directory });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log(`✅ ${name} PASSED (${duration}s)`, 'green');
    
    return {
      name,
      status: 'passed',
      duration,
      output: stdout
    };
  } catch ({ error, stdout, stderr }) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log(`❌ ${name} FAILED (${duration}s)`, 'red');
    if (stderr) log(`Error: ${stderr}`, 'red');
    
    return {
      name,
      status: 'failed',
      duration,
      output: stdout,
      error: stderr || error.message
    };
  }
}

async function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'yellow');
  
  // Check if backend is running
  try {
    const { stdout } = await execPromise('curl -s http://localhost:3000/api/debug');
    log('✅ Backend server is running', 'green');
  } catch (error) {
    log('⚠️  Backend server not detected on port 3000', 'yellow');
    log('   Please start with: cd api && npm run dev', 'yellow');
    return false;
  }
  
  // Check if frontend is running
  try {
    const { stdout } = await execPromise('curl -s http://localhost:5173');
    log('✅ Frontend server is running', 'green');
  } catch (error) {
    log('⚠️  Frontend server not detected on port 5173', 'yellow');
    log('   Please start with: cd web && npm run dev', 'yellow');
    return false;
  }
  
  // Check if database is accessible
  try {
    await execPromise('node scripts/test-neon-connection.js');
    log('✅ Database connection successful', 'green');
  } catch (error) {
    log('⚠️  Database connection failed', 'yellow');
    log('   Check DATABASE_URL in .env', 'yellow');
    return false;
  }
  
  return true;
}

async function main() {
  log('\n' + '🚀 '.repeat(30), 'cyan');
  log('PHASE 2 E2E TEST SUITE', 'bright');
  log('🚀 '.repeat(30) + '\n', 'cyan');
  
  // Check prerequisites
  const prereqsPassed = await checkPrerequisites();
  if (!prereqsPassed) {
    log('\n❌ Prerequisites not met. Please fix the issues above and try again.', 'red');
    process.exit(1);
  }
  
  const results = [];
  const apiDir = path.join(__dirname, '..', 'api');
  const rootDir = path.join(__dirname, '..');
  
  // Test Suite 1: Backend API Tests
  log('\n📦 CATEGORY 1: Backend API Tests', 'blue');
  results.push(await runTest(
    'Backend API Tests',
    'npm test',
    apiDir
  ));
  
  // Test Suite 2: Integration Tests
  log('\n🔗 CATEGORY 2: Integration Tests', 'blue');
  results.push(await runTest(
    'Integration Tests',
    'npm run test:integration',
    apiDir
  ));
  
  // Test Suite 3: Frontend E2E Tests
  log('\n🌐 CATEGORY 3: Frontend E2E Tests', 'blue');
  results.push(await runTest(
    'Frontend E2E Tests',
    'npx playwright test',
    rootDir
  ));
  
  // Generate Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'bright');
  log('='.repeat(60), 'cyan');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + parseFloat(r.duration), 0).toFixed(2);
  
  log(`\nTotal Tests: ${total}`, 'bright');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`⏱️  Total Duration: ${totalDuration}s`, 'cyan');
  
  // Detailed Results
  log('\n📋 Detailed Results:', 'blue');
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    const color = result.status === 'passed' ? 'green' : 'red';
    log(`${icon} ${result.name}: ${result.status.toUpperCase()} (${result.duration}s)`, color);
  });
  
  // Generate Report File
  const reportDir = path.join(rootDir, 'test-results');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      duration: totalDuration
    },
    results
  };
  
  const reportPath = path.join(reportDir, 'test-summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Test report saved: ${reportPath}`, 'cyan');
  
  // Exit with appropriate code
  if (failed > 0) {
    log('\n❌ Some tests failed. Please review the errors above.', 'red');
    process.exit(1);
  } else {
    log('\n🎉 All tests passed! Phase 2 implementation verified.', 'green');
    process.exit(0);
  }
}

// Run the test suite
main().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
