#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const postsPath = path.resolve(__dirname, '..', 'data', 'posts.json');
let raw = '';
try {
  raw = fs.readFileSync(postsPath, 'utf8');
} catch (e) {
  raw = '[]';
}
let posts = [];
try {
  posts = JSON.parse(raw);
} catch (e) {
  posts = [];
}

let title, excerpt, excerptMarkdown, content, contentMarkdown, date, slug, tags;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title') title = args[++i];
  if (args[i] === '--excerpt') excerpt = args[++i];
  if (args[i] === '--excerptMarkdown') excerptMarkdown = args[++i];
  if (args[i] === '--content') content = args[++i];
  if (args[i] === '--contentMarkdown') contentMarkdown = args[++i];
  if (args[i] === '--date') date = args[++i];
  if (args[i] === '--tags') tags = args[++i];
}
if (!title || !(content || contentMarkdown)) {
  console.error(
    'Usage: node blog/scripts/publish.js --title "Title" --contentMarkdown "## Header\\nParagraph..." [--excerptMarkdown "..."] [--date 2025-01-01] [--tags "tag1,tag2"]',
  );
  process.exit(1);
}
slug = slugify(title);
// Provide defaults
if (excerptMarkdown && !excerpt) {
  // Simple plaintext fallback from excerptMarkdown
  excerpt = excerptMarkdown.replace(/[#*`_]/g, '').slice(0, 80) + '...';
}
if (contentMarkdown && !content) {
  // Fallback to raw markdown as HTML placeholder
  content = `<pre>${contentMarkdown}</pre>`;
}
if (!excerptMarkdown && excerpt) {
  excerptMarkdown = excerpt;
}
if (!contentMarkdown && content) {
  contentMarkdown = content.replace(/<[^>]+>/g, '');
}
const tagArr = tags
  ? tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  : [];

const newPost = {
  id: Date.now(),
  slug,
  title,
  date: date || new Date().toISOString().slice(0, 10),
  excerptMarkdown,
  contentMarkdown,
  excerpt,
  content,
  image: `https://picsum.photos/seed/${slug}/600/360`,
  tags: tagArr,
};
posts.unshift(newPost);
try {
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');
  console.log('Post published:', newPost.title);
} catch (e) {
  console.error('Failed to write posts.json:', e.message);
  process.exit(1);
}
