#!/usr/bin/env node
import { spawn } from 'node:child_process';

const vite = spawn('vite', [], { stdio: 'inherit' });

// 正确处理退出码
vite.on('exit', (code, signal) => {
  // SIGINT (control + c) 的退出码通常是 130，我们视其为正常退出
  if (signal === 'SIGINT') {
    console.log('\nDev server stopped.');
    process.exit(0);
  }
  // 其他退出码保持原样
  process.exit(code ?? 0);
});

vite.on('error', (err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
