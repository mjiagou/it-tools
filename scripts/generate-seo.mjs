import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const BASE_URL = 'https://888467.xyz';
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

// 1. Read locale files
const zhFile = path.join(rootDir, 'locales/zh.yml');
const enFile = path.join(rootDir, 'locales/en.yml');

const zh = YAML.parse(fs.readFileSync(zhFile, 'utf8')) || {};
const en = YAML.parse(fs.readFileSync(enFile, 'utf8')) || {};

const zhTools = zh.tools || {};
const enTools = en.tools || {};

// 2. Discover all tool definitions
const toolsDir = path.join(rootDir, 'src/tools');
const toolDirs = fs.readdirSync(toolsDir).filter((f) => {
  const stat = fs.statSync(path.join(toolsDir, f));
  return stat.isDirectory();
});

const tools = [];
const redirects = [];

for (const dir of toolDirs) {
  const indexPath = path.join(toolsDir, dir, 'index.ts');
  if (!fs.existsSync(indexPath)) {
    continue;
  }

  const content = fs.readFileSync(indexPath, 'utf8');
  const pathMatch = content.match(/path:\s*['"]([^'"]+)['"]/);
  const redirectMatch = content.match(/redirectFrom:\s*\[([^\]]*)\]/);
  const keywordsMatch = content.match(/keywords:\s*\[([^\]]*)\]/);

  const toolPath = pathMatch ? pathMatch[1] : `/${dir}`;
  const toolRedirects = redirectMatch
    ? redirectMatch[1].replace(/['"\s]/g, '').split(',').filter(Boolean)
    : [];
  const toolKeywords = keywordsMatch
    ? keywordsMatch[1].replace(/['"\s]/g, '').split(',').filter(Boolean)
    : [];

  for (const r of toolRedirects) {
    redirects.push({ from: r, to: toolPath });
  }

  const zhInfo = zhTools[dir] || {};
  const enInfo = enTools[dir] || {};

  tools.push({
    dir,
    path: toolPath,
    keywords: toolKeywords,
    zhTitle: zhInfo.title || '',
    zhDesc: zhInfo.description || '',
    enTitle: enInfo.title || dir.replace(/-/g, ' '),
    enDesc: enInfo.description || '',
  });
}

console.log(`Discovered ${tools.length} tools and ${redirects.length} redirect rules.`);

// 2b. Discover all Markdown articles in content/articles
function collectArticleFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectArticleFiles(full));
    }
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
      files.push(full);
    }
  }
  return files;
}

const articlesRoot = path.join(rootDir, 'content/articles');
const articles = [];

for (const filePath of collectArticleFiles(articlesRoot)) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = fmMatch ? (YAML.parse(fmMatch[1]) || {}) : {};
  const body = fmMatch ? fmMatch[2] : raw;

  if (fm.draft === true) {
    continue;
  }

  const relPath = path.relative(articlesRoot, filePath).replace(/\\/g, '/');
  const defaultSlug = relPath.toLowerCase().endsWith('/index.md')
    ? relPath.slice(0, -'/index.md'.length).replace(/\//g, '-')
    : relPath.replace(/\.md$/i, '').replace(/\//g, '-');
  const slug = String(fm.slug || defaultSlug).trim();

  const headingMatch = body.match(/^\s*#\s+(.+?)\s*$/m);
  const title = String(fm.title || headingMatch?.[1] || slug).trim();

  const plainBody = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const desc = String(fm.description || plainBody.slice(0, 150)).trim();
  const rawDate = fm.date instanceof Date ? fm.date.toISOString().split('T')[0] : String(fm.date || '').trim();
  const dateMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : new Date().toISOString().split('T')[0];

  const tags = Array.isArray(fm.tags)
    ? fm.tags.map(t => String(t).trim()).filter(Boolean)
    : fm.tags
      ? String(fm.tags).split(/[,，]/).map(t => t.trim()).filter(Boolean)
      : [];

  const mdImgMatch = body.match(/!\[[^\]]*\]\((?:<([^>\n]+)>|([^\s)\n]+))/);
  const firstImg = mdImgMatch ? (mdImgMatch[1] || mdImgMatch[2] || '').trim() : '';
  const cover = String(fm.cover || fm.image || firstImg || '').trim();

  articles.push({
    slug,
    path: `/articles/${slug}`,
    title,
    desc,
    date,
    tags,
    cover,
    excerpt: plainBody.slice(0, 500),
  });
}

articles.sort((a, b) => b.date.localeCompare(a.date));
console.log(`Discovered ${articles.length} published articles.`);

// 3. Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt);
}

// 4. Generate _redirects
const redirectsContent = `# Cloudflare Pages Redirects
${redirects.map(r => `${r.from}  ${r.to}  301`).join('\n')}

# Cloudflare Pages SPA fallback
/*  /index.html  200
`;

fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent);
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent);
}

// 5. Generate sitemap.xml
const today = new Date().toISOString().split('T')[0];

const sitemapUrls = [
  { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily', lastmod: today },
  { loc: `${BASE_URL}/articles`, priority: '0.9', changefreq: 'daily', lastmod: articles[0]?.date || today },
  { loc: `${BASE_URL}/about`, priority: '0.5', changefreq: 'monthly', lastmod: today },
  ...articles.map(a => ({
    loc: `${BASE_URL}${a.path}`,
    priority: '0.8',
    changefreq: 'monthly',
    lastmod: a.date || today,
  })),
  ...tools.map(t => ({
    loc: `${BASE_URL}${t.path}`,
    priority: '0.8',
    changefreq: 'weekly',
    lastmod: today,
  })),
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
}
console.log(`Generated sitemap.xml with ${sitemapUrls.length} URLs.`);

// 6. Generate static pre-rendered HTML for each tool in dist/
const distIndexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(distIndexHtmlPath)) {
  const indexHtmlTemplate = fs.readFileSync(distIndexHtmlPath, 'utf8');

  // Update dist/index.html as well to guarantee no old it-tools.tech references
  const updatedRootHtml = indexHtmlTemplate.replaceAll('https://it-tools.tech', BASE_URL);
  fs.writeFileSync(distIndexHtmlPath, updatedRootHtml);

  // Generate /about/index.html
  const aboutDir = path.join(distDir, 'about');
  fs.mkdirSync(aboutDir, { recursive: true });
  const aboutTitle = '关于 IT-Tools (About) - 在线开发人员实用工具箱';
  const aboutDesc = '关于 IT-Tools 在线工具箱 (888467.xyz)，为开发者和 IT 从业人员打造的免费、极速、开箱即用的实用工具集合。';
  const aboutCanonical = `${BASE_URL}/about`;
  const aboutHtml = injectSeoTags(indexHtmlTemplate, {
    title: aboutTitle,
    desc: aboutDesc,
    canonical: aboutCanonical,
    keywords: 'IT Tools, 关于, 在线工具箱, 开发者工具, 888467.xyz',
    heading: aboutTitle,
  });
  fs.writeFileSync(path.join(aboutDir, 'index.html'), aboutHtml);

  // Generate /articles/index.html
  const articlesIndexDir = path.join(distDir, 'articles');
  fs.mkdirSync(articlesIndexDir, { recursive: true });
  const articlesListTitle = '技术文章与实用指南 - IT Tools 在线工具箱';
  const articlesListDesc = 'IT Tools (888467.xyz) 技术文章专栏，分享开发者工具使用技巧、编码解码原理解析、正则表达式与日常开发效率指南。';
  const articlesListHtml = injectSeoTags(indexHtmlTemplate, {
    title: articlesListTitle,
    desc: articlesListDesc,
    canonical: `${BASE_URL}/articles`,
    keywords: 'IT Tools, 技术文章, 开发指南, 在线工具教程, 888467.xyz',
    heading: articlesListTitle,
  });
  fs.writeFileSync(path.join(articlesIndexDir, 'index.html'), articlesListHtml);

  // Generate HTML for each article
  for (const a of articles) {
    const articleTargetDir = path.join(distDir, 'articles', a.slug);
    fs.mkdirSync(articleTargetDir, { recursive: true });

    const pageTitle = `${a.title} - IT Tools`;
    const canonical = `${BASE_URL}${a.path}`;
    const ogImage = a.cover && /^https?:\/\//i.test(a.cover) ? a.cover : `${BASE_URL}/banner.png`;
    const allKeywords = [...a.tags, 'IT Tools', '技术文章', '888467.xyz'].filter(Boolean).join(', ');

    const articleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': a.title,
      'description': a.desc,
      'datePublished': a.date,
      'image': ogImage,
      'url': canonical,
      'publisher': {
        '@type': 'Organization',
        'name': 'IT Tools',
        'url': BASE_URL,
      },
    };

    const articleHtml = injectSeoTags(indexHtmlTemplate, {
      title: pageTitle,
      desc: a.desc,
      canonical,
      keywords: allKeywords,
      jsonLd: articleJsonLd,
      heading: a.title,
      ogImage,
      ogType: 'article',
      extraSemanticText: a.excerpt,
    });

    fs.writeFileSync(path.join(articleTargetDir, 'index.html'), articleHtml);
  }
  if (articles.length > 0) {
    console.log(`Generated ${articles.length} static article pages for instant crawler indexing!`);
  }

  // Generate HTML for each tool
  let generatedPages = 0;
  for (const t of tools) {
    const targetDir = path.join(distDir, t.path.replace(/^\//, ''));
    fs.mkdirSync(targetDir, { recursive: true });

    const titleZh = t.zhTitle ? `${t.zhTitle} (${t.enTitle})` : t.enTitle;
    const pageTitle = `${titleZh} - IT Tools 在线工具箱`;
    const desc = t.zhDesc || t.enDesc || `${t.enTitle} online developer tool on 888467.xyz`;
    const canonical = `${BASE_URL}${t.path}`;
    const allKeywords = [
      ...t.keywords,
      t.zhTitle,
      t.enTitle,
      'IT Tools',
      '在线工具',
      '888467.xyz',
    ].filter(Boolean).join(', ');

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': t.zhTitle || t.enTitle,
      'alternateName': t.enTitle,
      'description': desc,
      'url': canonical,
      'applicationCategory': 'DeveloperApplication',
      'operatingSystem': 'All',
      'browserRequirements': 'Requires JavaScript. Requires HTML5.',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
      },
    };

    const toolHtml = injectSeoTags(indexHtmlTemplate, {
      title: pageTitle,
      desc,
      canonical,
      keywords: allKeywords,
      jsonLd,
      heading: titleZh,
    });

    fs.writeFileSync(path.join(targetDir, 'index.html'), toolHtml);
    generatedPages++;
  }
  console.log(`Generated ${generatedPages} static tool pages for instant crawler indexing!`);
}

function injectSeoTags(template, { title, desc, canonical, keywords, jsonLd, heading, ogImage, ogType, extraSemanticText }) {
  let html = template;
  const resolvedOgImage = ogImage || `${BASE_URL}/banner.png`;

  // Replace original domain
  html = html.replaceAll('https://it-tools.tech', BASE_URL);

  // Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace itemprops
  html = html.replace(/<meta[^>]*?itemprop="name"[^>]*?>/i, `<meta itemprop="name" content="${escapeAttr(title)}" />`);
  html = html.replace(/<meta[^>]*?itemprop="description"[^>]*?>/i, `<meta itemprop="description" content="${escapeAttr(desc)}" />`);

  // Replace meta description
  html = html.replace(/<meta[^>]*?name="description"[^>]*?>/i, `<meta name="description" content="${escapeAttr(desc)}" />`);

  // Replace or inject keywords
  if (/<meta[^>]*?name="keywords"[^>]*?>/i.test(html)) {
    html = html.replace(/<meta[^>]*?name="keywords"[^>]*?>/i, `<meta name="keywords" content="${escapeAttr(keywords)}" />`);
  }
  else {
    html = html.replace('</title>', `</title>\n    <meta name="keywords" content="${escapeAttr(keywords)}" />`);
  }

  // Replace canonical
  html = html.replace(/<link[^>]*?rel="canonical"[^>]*?>/i, `<link rel="canonical" href="${canonical}" />`);

  // Replace OpenGraph
  if (ogType) {
    html = html.replace(/<meta[^>]*?property="og:type"[^>]*?>/i, `<meta property="og:type" content="${escapeAttr(ogType)}" />`);
  }
  html = html.replace(/<meta[^>]*?property="og:url"[^>]*?>/i, `<meta property="og:url" content="${canonical}" />`);
  html = html.replace(/<meta[^>]*?property="og:title"[^>]*?>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
  html = html.replace(/<meta[^>]*?property="og:description"[^>]*?>/i, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
  html = html.replace(/<meta[^>]*?property="og:image"[^>]*?>/i, `<meta property="og:image" content="${escapeAttr(resolvedOgImage)}" />`);

  // Replace Twitter
  html = html.replace(/<meta[^>]*?name="twitter:title"[^>]*?>/i, `<meta name="twitter:title" content="${escapeAttr(title)}" />`);
  html = html.replace(/<meta[^>]*?name="twitter:description"[^>]*?>/i, `<meta name="twitter:description" content="${escapeAttr(desc)}" />`);
  html = html.replace(/<meta[^>]*?name="twitter:image"[^>]*?>/i, `<meta name="twitter:image" content="${escapeAttr(resolvedOgImage)}" />`);

  // Inject JSON-LD before </head>
  if (jsonLd) {
    const jsonLdTag = `  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>\n</head>`;
    html = html.replace('</head>', jsonLdTag);
  }

  // Inject semantic content inside #app for bots
  const extraP = extraSemanticText ? `<p>${escapeHtml(extraSemanticText)}</p>` : '';
  const semanticBody = `<div id="app"><div class="seo-crawler-content" style="opacity:0.001;position:absolute;pointer-events:none;"><h1>${escapeHtml(heading || title)}</h1><p>${escapeHtml(desc)}</p>${extraP}<p>${escapeHtml(keywords || '')}</p></div></div>`;
  html = html.replace(/<div id="app">[\s\S]*?<\/div>/, semanticBody);

  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
