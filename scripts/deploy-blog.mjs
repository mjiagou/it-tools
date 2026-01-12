#!/usr/bin/env node

/**
 * CI/CD 部署脚本
 * 将构建好的 public/blog/* 部署到目标服务器的 /blog/ 目录
 * 适用于 GitHub Actions、GitLab CI、Jenkins、Docker 等常见 CI 平台
 *
 * 默认假设：
 * - 项目构建产物在 dist/ 目录
 * - 目标静态站点根路径为 /
 * - 需要把 dist/blog/* 拷贝到站点 /blog/ 下
 */

import { readFileSync, existsSync, cpSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PUBLIC_BLOG_DIR = resolve(PROJECT_ROOT, 'public', 'blog');
const DIST_DIR = resolve(PROJECT_ROOT, 'dist');
const DIST_BLOG_DIR = resolve(DIST_DIR, 'blog');

/**
 * 1. 确保 public/blog 存在（说明已执行过博客构建）
 */
if (!existsSync(PUBLIC_BLOG_DIR) || !statSync(PUBLIC_BLOG_DIR).isDirectory()) {
  console.error('❌ 未找到 public/blog 目录。请确保已在 CI 中运行 pnpm run script:build-blog');
  process.exit(1);
}

/**
 * 2. 拷贝 public/blog → dist/blog（如果构建产物目录未包含）
 */
if (!existsSync(DIST_BLOG_DIR)) {
  console.log('📁 拷贝 public/blog → dist/blog');
  cpSync(PUBLIC_BLOG_DIR, DIST_BLOG_DIR, { recursive: true });
} else {
  console.log('✅ dist/blog 已存在，跳过拷贝');
}

/**
 * 3. 输出下一步部署建议（可替换为你的 rsync/ftp/oss 等命令）
 */
console.log('🚀 构建完成，博客静态资源已就绪。');
console.log('你现在可以将 dist/blog/* 部署到站点 /blog/ 目录下。');
console.log('示例命令（请按实际情况替换服务器地址与路径）：');
console.log(`rsync -avz --delete ${DIST_BLOG_DIR}/ user@your-server:/var/www/html/blog/`);
console.log('或');
console.log(`aws s3 sync ${DIST_BLOG_DIR}/ s3://your-bucket/blog/ --delete`);
console.log('或');
console.log(`scp -r ${DIST_BLOG_DIR}/* user@your-server:/var/www/html/blog/`);
console.log('-----------------------------------');
console.log(
  '如果使用 GitHub Pages/Netlify/Vercel 等平台，直接将整个 dist 目录设为部署根目录即可，/blog/ 子路径会自动生效。',
);
