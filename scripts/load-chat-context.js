#!/usr/bin/env node

/**
 * Load Chat Context - Displays the latest conversation checkpoint
 * Usage: node scripts/load-chat-context.js
 */

const fs = require('fs');
const path = require('path');

const latestPath = path.join(__dirname, '..', 'docs', 'chat-context', 'latest.md');

if (!fs.existsSync(latestPath)) {
  console.log('\n⚠️  No saved chat context found.');
  console.log('💡 Tip: Run "npm run chat:save" to create a checkpoint.\n');
  process.exit(0);
}

const content = fs.readFileSync(latestPath, 'utf8');

console.log('\n' + '='.repeat(80));
console.log('📖 LATEST CHAT CONTEXT');
console.log('='.repeat(80) + '\n');
console.log(content);
console.log('\n' + '='.repeat(80));
console.log('💬 Copy the "What to Tell Copilot" section and paste it in your chat!');
console.log('='.repeat(80) + '\n');
