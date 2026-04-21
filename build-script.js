#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Starting Next.js build...');
  execSync('npx next build', { stdio: 'inherit', shell: true });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
