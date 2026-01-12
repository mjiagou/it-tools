#!/bin/bash
# 处理 SIGINT (control + c) 并返回 0
trap 'echo ""; exit 0' INT

# 构建博客静态页（自动扫描 blog/content/*.md）
echo "Building blog..."
node blog/scripts/build.js

pnpm exec vite
