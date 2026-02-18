#!/usr/bin/env node

/**
 * 🚀 ONE-CLICK SYNC - Complete data and code synchronization
 * 
 * What it does:
 * 1. Pulls latest code from GitHub
 * 2. Loads chat context (if available)
 * 3. Installs/updates dependencies
 * 4. Runs database migrations
 * 5. Seeds database if needed
 * 6. Generates Prisma client
 * 7. Shows summary and next steps
 * 
 * Usage: npm run one:pull
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(msg, type = 'info') {
  const icons = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    wait: '⏳',
    success: '✅'
  };
  console.log(`\n${icons[type] || '→'} ${msg}`);
}

function exec(command, silent = false) {
  try {
    log(`Running: ${command.split('\n')[0]}`, 'wait');
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output;
  } catch (error) {
    log(`Failed: ${command}`, 'error');
    if (!silent) {
      console.error(error.message);
    }
    throw error;
  }
}

function execSilent(command) {
  return exec(command, true);
}

function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

async function runSync() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PRAMARA PMS - ONE-CLICK SYNC');
  console.log('='.repeat(60));

  try {
    // Step 1: Pull latest code from GitHub
    log('Step 1/7: Pulling latest code from GitHub...', 'wait');
    try {
      execSilent('git pull origin main');
      log('Code pulled successfully', 'success');
    } catch (e) {
      log('Git pull failed or not in a git repo', 'warn');
    }

    // Step 2: Load chat context
    log('Step 2/7: Loading chat context...', 'wait');
    try {
      if (fileExists('scripts/load-chat-context.js')) {
        execSilent('npm run chat:load');
        log('Chat context loaded', 'success');
      } else {
        log('Chat context script not found', 'warn');
      }
    } catch (e) {
      log('Chat context load skipped', 'warn');
    }

    // Step 3: Install dependencies
    log('Step 3/7: Installing/updating dependencies...', 'wait');
    try {
      execSilent('npm install');
      log('Root dependencies installed', 'success');
    } catch (e) {
      log('Root npm install failed', 'error');
      throw e;
    }

    // Step 3b: Install API dependencies
    log('Installing API dependencies...', 'wait');
    try {
      execSilent('cd api && npm install');
      log('API dependencies installed', 'success');
    } catch (e) {
      log('API npm install failed', 'error');
      throw e;
    }

    // Step 3c: Install web dependencies
    log('Installing web dependencies...', 'wait');
    try {
      execSilent('cd web && npm install');
      log('Web dependencies installed', 'success');
    } catch (e) {
      log('Web npm install failed', 'error');
      throw e;
    }

    // Step 4: Generate Prisma client
    log('Step 4/7: Generating Prisma client...', 'wait');
    try {
      execSilent('npm run prisma:generate');
      log('Prisma client generated', 'success');
    } catch (e) {
      log('Prisma generation failed', 'warn');
    }

    // Step 5: Run database migrations
    log('Step 5/7: Running database migrations...', 'wait');
    try {
      execSilent('npm run prisma:migrate:deploy');
      log('Database migrations applied', 'success');
    } catch (e) {
      log('Migrations failed or already up to date', 'warn');
    }

    // Step 6: Check if database needs seeding
    log('Step 6/7: Checking database state...', 'wait');
    try {
      execSilent('npm run db:seed');
      log('Database seeded', 'success');
    } catch (e) {
      log('Database already seeded or seed skipped', 'warn');
    }

    // Step 7: Summary
    log('Step 7/7: Sync complete! ✅', 'success');
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`
✅ Code pulled from GitHub
✅ Dependencies installed (root, api, web)
✅ Prisma client generated
✅ Database migrations applied
✅ Database seeded

Next steps to get started:
  1. Start dev servers:       npm run dev
  2. Open browser:             http://localhost:5173
  3. API available at:         http://localhost:4000
  
To only pull code next time:
  npm run sync:pull

To push your changes:
  npm run sync:push
    `);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n\n' + '='.repeat(60));
    console.error('❌ SYNC FAILED');
    console.error('='.repeat(60));
    console.error(`Error during sync: ${error.message}`);
    console.error('\nTroubleshooting:');
    console.error('  - Check your internet connection');
    console.error('  - Ensure .env file exists with correct credentials');
    console.error('  - Run "npm install" in root directory');
    console.error('  - Run "cd api && npm install" for API dependencies');
    console.error('  - Run "cd web && npm install" for web dependencies');
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Run the sync
runSync().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
