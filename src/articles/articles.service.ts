import YAML from 'yaml';
import type { Article, ArticleFrontmatter, ArticleTocItem } from './articles.types';

const rawArticleModules = import.meta.glob('/content/articles/**/*.md', {
  as: 'raw',
  eager: true,
}) as Record<string, string>;

function normalizeDate(val?: string | Date): string {
  if (!val) {
    return '';
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
}

function normalizeTags(tags?: string[] | string): string[] {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(Boolean);
  }
  return String(tags)
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(Boolean);
}

function extractSlugFromPath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, '/');
  const withoutPrefix = normalized.replace(/^\/?content\/articles\//, '');
  if (withoutPrefix.toLowerCase().endsWith('/index.md')) {
    return withoutPrefix.slice(0, -'/index.md'.length).replace(/\//g, '-');
  }
  return withoutPrefix.replace(/\.md$/i, '').replace(/\//g, '-');
}

function extractFirstImage(markdownBody: string): string | undefined {
  const withoutCode = markdownBody
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');

  const mdImg = withoutCode.match(/!\[[^\]]*\]\((?:<([^>\n]+)>|([^\s)\n]+))/);
  if (mdImg) {
    return (mdImg[1] || mdImg[2] || '').trim() || undefined;
  }

  const htmlImg = withoutCode.match(/<img\b[^>]*?\bsrc=["']([^"']+)["']/i);
  if (htmlImg?.[1]) {
    return htmlImg[1].trim();
  }

  return undefined;
}

function extractPlainExcerpt(markdownBody: string, maxLength = 150): string {
  const plain = markdownBody
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/[*_~`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength).trim()}...`;
}

function estimateReadingMinutes(markdownBody: string): number {
  const cjkCount = (markdownBody.match(/[\u4E00-\u9FA5]/g) || []).length;
  const wordCount = (markdownBody.replace(/[\u4E00-\u9FA5]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
  const minutes = cjkCount / 350 + wordCount / 200;
  return Math.max(1, Math.ceil(minutes));
}

function parseFrontmatterAndBody(raw: string): { frontmatter: ArticleFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }
  try {
    const frontmatter = (YAML.parse(match[1]) || {}) as ArticleFrontmatter;
    return { frontmatter, body: match[2] };
  }
  catch {
    return { frontmatter: {}, body: match[2] };
  }
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\u4E00-\u9FA5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

export function extractTocFromMarkdown(markdownBody: string): ArticleTocItem[] {
  const withoutCode = markdownBody
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');

  const items: ArticleTocItem[] = [];
  const usedIds = new Map<string, number>();

  for (const line of withoutCode.split(/\r?\n/)) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) {
      continue;
    }
    const level = match[1].length;
    const cleanText = match[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_~]/g, '')
      .trim();
    if (!cleanText) {
      continue;
    }

    const baseId = slugifyHeading(cleanText);
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count}`;

    items.push({ id, text: cleanText, level });
  }

  return items;
}

function parseArticleEntry(rawPath: string, rawContent: string): Article | null {
  const fileName = rawPath.split('/').pop() || '';
  if (fileName.toLowerCase() === 'readme.md') {
    return null;
  }

  const { frontmatter, body: rawBody } = parseFrontmatterAndBody(rawContent);
  if (frontmatter.draft === true) {
    return null;
  }

  const slug = (frontmatter.slug || extractSlugFromPath(rawPath)).trim();
  const headingMatch = rawBody.match(/^\s*#\s+(.+?)\s*$/m);
  const title = (frontmatter.title || headingMatch?.[1] || slug).trim();

  // Avoid duplicate H1 if body starts with `# <same title>`
  let content = rawBody.trim();
  const leadingH1Match = content.match(/^#\s+(.+?)(?:\r?\n|$)/);
  if (leadingH1Match && leadingH1Match[1].trim() === title) {
    content = content.slice(leadingH1Match[0].length).trim();
  }

  const description = (frontmatter.description || extractPlainExcerpt(content)).trim();
  const date = normalizeDate(frontmatter.date) || '2026-10-30';
  const updated = frontmatter.updated ? normalizeDate(frontmatter.updated) : undefined;
  const tags = normalizeTags(frontmatter.tags);
  const cover = (frontmatter.cover || frontmatter.image || extractFirstImage(content))?.trim() || undefined;
  const readingMinutes = estimateReadingMinutes(content);

  return {
    slug,
    path: `/articles/${slug}`,
    title,
    description,
    date,
    updated,
    tags,
    cover,
    author: frontmatter.author?.trim() || undefined,
    readingMinutes,
    content,
    rawPath,
  };
}

export const allArticles: Article[] = Object.entries(rawArticleModules)
  .map(([rawPath, rawContent]) => parseArticleEntry(rawPath, rawContent))
  .filter((item): item is Article => item !== null)
  .sort((a, b) => b.date.localeCompare(a.date));

export const allArticleTags: string[] = Array.from(
  new Set(allArticles.flatMap(article => article.tags)),
);

export function getArticleBySlug(slug: string): Article | undefined {
  return allArticles.find(article => article.slug === slug);
}

export function getAdjacentArticles(slug: string): { prev?: Article; next?: Article } {
  const index = allArticles.findIndex(article => article.slug === slug);
  if (index === -1) {
    return {};
  }
  return {
    prev: index > 0 ? allArticles[index - 1] : undefined,
    next: index < allArticles.length - 1 ? allArticles[index + 1] : undefined,
  };
}

