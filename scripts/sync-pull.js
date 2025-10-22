#!/usr/bin/env node

/**
 * 📥 PULL - Smart sync from GitHub to continue work
 * 
 * What it does:
 * 1. Checks for local uncommitted changes (prevents data loss!)
 * 2. Fetches latest from GitHub
 * 3. Detects conflicts before pulling
 * 4. Pulls code + chat context
 * 5. Loads chat context automatically
 * 6. Shows what's ready to work on
 * 
 * Usage: npm run sync:pull
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
  console.log('📥 PULL - Syncing from GitHub');
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

  // Step 3: Check for uncommitted local changes (SAFETY CHECK!)
  let hasLocalChanges = false;
  try {
    const status = execSilent('git status --porcelain');
    hasLocalChanges = status.trim().length > 0;
  } catch (error) {
    console.log('⚠️  Could not check git status\n');
  }

  if (hasLocalChanges) {
    console.log('⚠️  WARNING: You have uncommitted local changes!');
    console.log('   Pulling now might cause conflicts or lose your work.\n');
    
    console.log('📝 Your uncommitted changes:\n');
    try {
      exec('git status --short');
    } catch {}
    
    console.log('\n🤔 What would you like to do?\n');
    console.log('   1. Stash changes (save for later) and pull - RECOMMENDED');
    console.log('   2. Commit changes first, then pull');
    console.log('   3. Discard changes and pull (⚠️  DANGER: loses local work!)');
    console.log('   4. Cancel and handle manually\n');
    
    const choice = await question('   Your choice [1-4]: ');
    
    switch (choice.trim()) {
      case '1':
        console.log('\n💾 Stashing your local changes...');
        exec('git stash push -m "Auto-stash before pull"');
        console.log('✅ Changes stashed! (You can restore with: git stash pop)\n');
        break;
        
      case '2':
        console.log('\n💾 Please commit your changes first:');
        const commitMsg = await question('   Commit message: ');
        try {
          exec('git add -A');
          exec(`git commit -m "${commitMsg || 'WIP: Local changes'}"`);
          console.log('✅ Changes committed!\n');
        } catch (error) {
          console.log('❌ Commit failed. Cancelling pull.\n');
          rl.close();
          process.exit(1);
        }
        break;
        
      case '3':
        console.log('\n⚠️  ARE YOU SURE? This will DELETE your local work!');
        const confirm = await question('   Type "yes" to confirm: ');
        if (confirm.toLowerCase() !== 'yes') {
          console.log('🚫 Cancelled. Your changes are safe.\n');
          rl.close();
          process.exit(0);
        }
        console.log('\n🗑️  Discarding local changes...');
        exec('git reset --hard HEAD');
        console.log('✅ Local changes discarded\n');
        break;
        
      case '4':
      default:
        console.log('\n🚫 Pull cancelled. Please handle changes manually.\n');
        rl.close();
        process.exit(0);
    }
  }

  // Step 4: Fetch from remote
  console.log('🔍 Fetching latest from GitHub...');
  try {
    exec('git fetch origin');
    console.log('✅ Fetch successful\n');
  } catch (error) {
    console.log('❌ Could not fetch from GitHub. Check your internet connection.\n');
    rl.close();
    process.exit(1);
  }

  // Step 5: Check if remote has updates
  try {
    const localCommit = execSilent('git rev-parse HEAD').trim();
    const remoteCommit = execSilent(`git rev-parse origin/${branch}`).trim();
    
    if (localCommit === remoteCommit) {
      console.log('ℹ️  Already up to date! No new changes from remote.\n');
      
      // Still try to load chat context
      console.log('📖 Loading latest chat context...\n');
      try {
        exec('node scripts/load-chat-context.js');
      } catch {}
      
      rl.close();
      return;
    }
    
    const ahead = execSilent(`git rev-list origin/${branch}..HEAD --count`).trim();
    const behind = execSilent(`git rev-list HEAD..origin/${branch} --count`).trim();
    
    if (parseInt(ahead) > 0) {
      console.log(`ℹ️  Your local branch is ${ahead} commit(s) AHEAD of remote.`);
      console.log('   You might want to PUSH instead of PULL.\n');
      
      const proceed = await question('   Continue with pull anyway? [y/N]: ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('\n🚫 Pull cancelled.\n');
        rl.close();
        process.exit(0);
      }
    }
    
    console.log(`📥 Remote has ${behind} new commit(s). Pulling...\n`);
    
  } catch (error) {
    console.log('⚠️  Could not compare commits. Proceeding with pull...\n');
  }

  // Step 6: Pull with rebase (cleaner history)
  console.log('🔄 Pulling changes from GitHub...');
  try {
    exec('git pull --rebase origin ' + branch);
    console.log('\n✅ PULL SUCCESSFUL!\n');
  } catch (error) {
    console.log('\n❌ Pull failed with conflicts.');
    console.log('\n🛠️  To resolve:');
    console.log('   1. Fix conflicts in the files marked by Git');
    console.log('   2. Run: git add <fixed-files>');
    console.log('   3. Run: git rebase --continue');
    console.log('   4. Or run: git rebase --abort (to cancel)\n');
    rl.close();
    process.exit(1);
  }

  // Step 7: Load chat context
  console.log('📖 Loading chat context from remote...\n');
  console.log('='.repeat(80) + '\n');
  
  try {
    exec('node scripts/load-chat-context.js');
  } catch (error) {
    console.log('⚠️  Could not load chat context (file missing?)');
    console.log('   Check: docs/chat-context/latest.md\n');
  }

  // Step 8: Success summary
  console.log('\n' + '='.repeat(80));
  console.log('🎉 ALL SYNCED FROM GITHUB!');
  console.log('='.repeat(80));
  console.log('\n📋 Next steps:');
  console.log('   1. Copy the "What to Tell Copilot" section above');
  console.log('   2. Paste it into Copilot chat');
  console.log('   3. Continue working where you left off!\n');
  console.log('💡 Your environment is ready. Start with: npm run dev\n');

  rl.close();
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error.message);
  rl.close();
  process.exit(1);
});
