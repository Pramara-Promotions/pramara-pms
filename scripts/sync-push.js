#!/usr/bin/env node

/**
 * 🚀 PUSH - Smart sync to prepare for device switch
 * 
 * What it does:
 * 1. Saves current chat context
 * 2. Checks for uncommitted changes
 * 3. Stages all changes (code + context)
 * 4. Creates descriptive commit
 * 5. Pushes to GitHub
 * 6. Verifies sync success
 * 
 * Usage: npm run sync:push
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function exec(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output;
  } catch (error) {
    if (!silent) {
      console.error(`\n❌ Command failed: ${command}`);
      console.error(error.message);
    }
    throw error;
  }
}

function execSilent(command) {
  return exec(command, true);
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 PUSH - Preparing to sync to GitHub');
  console.log('='.repeat(80) + '\n');

  // Step 1: Check if we're in a git repo
  try {
    execSilent('git rev-parse --git-dir');
  } catch {
    console.error('❌ Not a git repository. Run this from your project root.\n');
    process.exit(1);
  }

  // Step 2: Check current branch
  const branch = execSilent('git branch --show-current').trim();
  console.log(`📍 Current branch: ${branch}\n`);

  // Step 3: Fetch latest from remote (don't pull yet, just check)
  console.log('🔍 Checking remote for updates...');
  try {
    execSilent('git fetch origin');
  } catch (error) {
    console.log('⚠️  Could not fetch from remote (network issue?). Continuing anyway...\n');
  }

  // Step 4: Check if remote is ahead (potential conflict)
  let remoteAhead = false;
  try {
    const localCommit = execSilent('git rev-parse HEAD').trim();
    const remoteCommit = execSilent(`git rev-parse origin/${branch}`).trim();
    
    if (localCommit !== remoteCommit) {
      const behind = execSilent(`git rev-list HEAD..origin/${branch} --count`).trim();
      if (parseInt(behind) > 0) {
        remoteAhead = true;
        console.log(`⚠️  WARNING: Remote is ${behind} commit(s) ahead!`);
        console.log('   This means changes were pushed from another device.\n');
        
        const answer = await question('   Do you want to PULL first? (recommended) [y/N]: ');
        if (answer.toLowerCase() === 'y') {
          console.log('\n📥 Pulling changes from remote...\n');
          try {
            exec('git pull --rebase origin ' + branch);
            console.log('\n✅ Pull successful! Continuing with push...\n');
          } catch (error) {
            console.log('\n❌ Pull failed. Please resolve conflicts manually and try again.\n');
            process.exit(1);
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Could not compare with remote. Continuing...\n');
  }

  // Step 5: Get commit description from user
  const defaultMsg = `Work in progress - ${new Date().toLocaleString()}`;
  console.log('💬 What did you accomplish in this session?');
  console.log('   (This helps you remember context on the next device)\n');
  const description = await question(`   Description [${defaultMsg}]: `);
  const commitDescription = description.trim() || defaultMsg;

  // Step 6: Save chat context
  console.log('\n💾 Saving chat context...');
  try {
    execSilent(`node scripts/save-chat-context.js "${commitDescription}"`);
    console.log('✅ Chat context saved!\n');
  } catch (error) {
    console.log('⚠️  Could not save chat context (script missing?). Continuing...\n');
  }

  // Step 7: Check for changes
  let hasChanges = false;
  try {
    const status = execSilent('git status --porcelain');
    hasChanges = status.trim().length > 0;
  } catch (error) {
    console.log('⚠️  Could not check git status\n');
  }

  if (!hasChanges) {
    console.log('ℹ️  No changes to commit. Already up to date!\n');
    
    // Still push in case remote is behind
    try {
      console.log('🔄 Pushing to ensure remote is up to date...');
      exec('git push origin ' + branch);
      console.log('\n✅ Remote is up to date!\n');
    } catch (error) {
      console.log('\n⚠️  Push failed (already up to date or network issue)\n');
    }
    
    rl.close();
    return;
  }

  // Step 8: Show what will be committed
  console.log('📝 Changes to be synced:\n');
  try {
    exec('git status --short');
  } catch (error) {
    console.log('⚠️  Could not show changes\n');
  }

  // Step 9: Confirm
  console.log('');
  const confirm = await question('📤 Ready to push everything? [Y/n]: ');
  if (confirm.toLowerCase() === 'n') {
    console.log('\n🚫 Push cancelled.\n');
    rl.close();
    process.exit(0);
  }

  // Step 10: Stage all changes
  console.log('\n📦 Staging all changes...');
  exec('git add -A');
  console.log('✅ All changes staged\n');

  // Step 11: Commit
  console.log('💾 Creating commit...');
  const commitMsg = `💾 ${commitDescription}`;
  try {
    exec(`git commit -m "${commitMsg}"`);
    console.log('✅ Commit created\n');
  } catch (error) {
    console.log('⚠️  Commit failed (might be nothing to commit)\n');
  }

  // Step 12: Push
  console.log('📤 Pushing to GitHub...');
  try {
    exec('git push origin ' + branch);
    console.log('\n✅ PUSH SUCCESSFUL!\n');
  } catch (error) {
    console.log('\n❌ Push failed. Check your network connection and try again.\n');
    rl.close();
    process.exit(1);
  }

  // Step 13: Success summary
  console.log('='.repeat(80));
  console.log('🎉 ALL SYNCED TO GITHUB!');
  console.log('='.repeat(80));
  console.log('\n📱 Next steps on your other device:');
  console.log('   1. Run: npm run sync:pull');
  console.log('   2. Continue working!\n');
  console.log('💡 Your code + chat context are now safely in the cloud.\n');

  rl.close();
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error.message);
  rl.close();
  process.exit(1);
});
