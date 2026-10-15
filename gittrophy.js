#!/usr/bin/env node

/**
 * GitTrophy Launcher Wrapper
 * Cho phép chạy trực tiếp bằng: node gittrophy.js [options]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const distScript = path.resolve(__dirname, 'dist', 'index.js');
const tsxBin = path.resolve(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

let executable = process.execPath;
let execArgs = [distScript, ...args];

if (!fs.existsSync(distScript)) {
  executable = tsxBin;
  execArgs = [path.resolve(__dirname, 'src', 'index.ts'), ...args];
}

const child = spawn(executable, execArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32' && executable.endsWith('.cmd'),
  cwd: __dirname,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
