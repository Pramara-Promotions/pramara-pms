#!/usr/bin/env node

/**
 * Save Chat Context - Creates a timestamped conversation checkpoint
 * Usage: node scripts/save-chat-context.js "Brief description of what we did"
 */

const fs = require('fs');
const path = require('path');

const contextDir = path.join(__dirname, '..', 'docs', 'chat-context');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const description = process.argv.slice(2).join(' ') || 'Checkpoint';

// Ensure directory exists
if (!fs.existsSync(contextDir)) {
  fs.mkdirSync(contextDir, { recursive: true });
}

// Read current context file if it exists
const currentContextPath = path.join(__dirname, '..', 'docs', 'CLOUD_SETUP_CONTEXT.md');
let currentContext = '';
if (fs.existsSync(currentContextPath)) {
  currentContext = fs.readFileSync(currentContextPath, 'utf8');
}

// Create checkpoint content
const checkpointContent = `# Chat Context Checkpoint
**Timestamp:** ${new Date().toLocaleString()}  
**Description:** ${description}

---

## Current State Summary
${currentContext || '*No context file found*'}

---

## What to Tell Copilot on Next Device

Copy and paste this to Copilot when you switch devices:

\`\`\`
I'm continuing from another device. Please read:
1. docs/CLOUD_SETUP_CONTEXT.md (current project state)
2. docs/chat-context/${timestamp}.md (last conversation checkpoint)

Quick summary: ${description}

What's our next step?
\`\`\`

---

## Recent Git Activity
`;

// Get recent git log
const { execSync } = require('child_process');
try {
  const gitLog = execSync('git log --oneline -10', { encoding: 'utf8' });
  const checkpointWithGit = checkpointContent + '```\n' + gitLog + '```\n';
  
  // Save checkpoint
  const checkpointPath = path.join(contextDir, `${timestamp}.md`);
  fs.writeFileSync(checkpointPath, checkpointWithGit);
  
  // Update latest.md symlink/copy
  const latestPath = path.join(contextDir, 'latest.md');
  fs.writeFileSync(latestPath, checkpointWithGit);
  
  console.log('\n✅ Chat context saved!');
  console.log(`📁 Checkpoint: docs/chat-context/${timestamp}.md`);
  console.log(`📌 Latest: docs/chat-context/latest.md`);
  console.log('\n💡 Tip: Commit this checkpoint to Git so it syncs to your other device.');
  console.log('\nOn your other device, tell Copilot:');
  console.log(`"Read docs/chat-context/latest.md and continue from there"\n`);
  
} catch (error) {
  console.error('Error getting git log:', error.message);
  // Save without git log
  const checkpointPath = path.join(contextDir, `${timestamp}.md`);
  fs.writeFileSync(checkpointPath, checkpointContent);
  console.log('\n✅ Chat context saved (without git history)!');
  console.log(`📁 Checkpoint: docs/chat-context/${timestamp}.md`);
}
