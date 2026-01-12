#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(BLOG_DIR, 'content');
const POSTS_JSON = path.join(BLOG_DIR, 'data', 'posts.json');
const PUBLIC_BLOG_DIR = path.resolve(__dirname, '..', '..', 'public', 'blog');

// Ensure output dirs exist
fs.mkdirSync(path.join(BLOG_DIR, 'data'), { recursive: true });
fs.mkdirSync(BLOG_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_BLOG_DIR, { recursive: true });

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

function readMarkdownFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  return files.map((file) => {
    const fullPath = path.join(CONTENT_DIR, file);
    const src = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(src);
    return {
      file,
      slug: data.slug || slugify(path.basename(file, '.md')),
      title: data.title || slugify(path.basename(file, '.md')),
      date: data.date || new Date().toISOString().slice(0, 10),
      excerpt: data.excerpt || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      image: data.image || `https://picsum.photos/seed/${data.slug || slugify(path.basename(file, '.md'))}/600/360`,
      content,
      contentMarkdown: content,
      excerptMarkdown: data.excerpt || '',
    };
  });
}

function generateHtmlPage(post) {
  const html = marked.parse(post.content);
  const pageHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${post.title} - Blog - 888467.xyz</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;margin:0;padding:0;background:#f7f7f7;color:#333;max-width:800px;margin:40px auto;line-height:1.6;}
    h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.8em;}
    a{color:#2563eb;}
    pre{background:#f1f5f9;border-radius:8px;padding:1em;overflow-x:auto;}
    code{background:#e5e7eb;padding:2px 5px;border-radius:4px;}
    .meta{font-size:0.9em;color:#888;margin-bottom:2em;}
    .tags{margin-top:2em;}
    .tag{display:inline-block;background:#e5e7eb;padding:4px 8px;border-radius:4px;margin-right:6px;font-size:0.8em;}
    .back-link{margin-bottom:2em;}
  </style>
</head>
<body>
  <a href="../" class="back-link">← 返回博客首页</a>
  <h1>${post.title}</h1>
  <div class="meta">
    <span>${post.date}</span>
    ${post.tags.length ? `<span> · 标签: ${post.tags.join(', ')}</span>` : ''}
  </div>
  <div>${html}</div>
  ${
    post.tags.length
      ? `
  <div class="tags">
    ${post.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
  </div>`
      : ''
  }
</body>
</html>`;
  return pageHtml;
}

function writePostsJson(posts) {
  const jsonPosts = posts.map(({ file, content, contentMarkdown, excerptMarkdown, ...rest }) => rest);
  // 同时写入两个位置
  fs.writeFileSync(POSTS_JSON, JSON.stringify(jsonPosts, null, 2), 'utf8');
  const publicPostsJson = path.join(PUBLIC_BLOG_DIR, 'data', 'posts.json');
  fs.mkdirSync(path.dirname(publicPostsJson), { recursive: true });
  fs.writeFileSync(publicPostsJson, JSON.stringify(jsonPosts, null, 2), 'utf8');
}

function generatePostPages(posts) {
  posts.forEach((post) => {
    const targetDir = path.join(PUBLIC_BLOG_DIR, post.slug);
    fs.mkdirSync(targetDir, { recursive: true });
    const pageHtml = generateHtmlPage(post);
    fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml, 'utf8');
  });
}

function main() {
  const posts = readMarkdownFiles();
  if (!posts.length) {
    console.log('No markdown files found in blog/content/');
    return;
  }
  generatePostPages(posts);
  writePostsJson(posts);
  console.log(`Built ${posts.length} post(s).`);
}

main();
