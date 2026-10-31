<script setup lang="ts">
import MarkdownIt from 'markdown-it';
import DomPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bashHljs from 'highlight.js/lib/languages/bash';
import cssHljs from 'highlight.js/lib/languages/css';
import goHljs from 'highlight.js/lib/languages/go';
import iniHljs from 'highlight.js/lib/languages/ini';
import javascriptHljs from 'highlight.js/lib/languages/javascript';
import jsonHljs from 'highlight.js/lib/languages/json';
import markdownHljs from 'highlight.js/lib/languages/markdown';
import pythonHljs from 'highlight.js/lib/languages/python';
import sqlHljs from 'highlight.js/lib/languages/sql';
import typescriptHljs from 'highlight.js/lib/languages/typescript';
import xmlHljs from 'highlight.js/lib/languages/xml';
import yamlHljs from 'highlight.js/lib/languages/yaml';
import { useThemeVars } from 'naive-ui';
import { slugifyHeading } from './articles.service';

const props = withDefaults(defineProps<{ markdown?: string }>(), { markdown: '' });
const { markdown } = toRefs(props);

hljs.registerLanguage('bash', bashHljs);
hljs.registerLanguage('sh', bashHljs);
hljs.registerLanguage('shell', bashHljs);
hljs.registerLanguage('css', cssHljs);
hljs.registerLanguage('go', goHljs);
hljs.registerLanguage('ini', iniHljs);
hljs.registerLanguage('toml', iniHljs);
hljs.registerLanguage('javascript', javascriptHljs);
hljs.registerLanguage('js', javascriptHljs);
hljs.registerLanguage('json', jsonHljs);
hljs.registerLanguage('markdown', markdownHljs);
hljs.registerLanguage('md', markdownHljs);
hljs.registerLanguage('python', pythonHljs);
hljs.registerLanguage('py', pythonHljs);
hljs.registerLanguage('sql', sqlHljs);
hljs.registerLanguage('typescript', typescriptHljs);
hljs.registerLanguage('ts', typescriptHljs);
hljs.registerLanguage('html', xmlHljs);
hljs.registerLanguage('xml', xmlHljs);
hljs.registerLanguage('yaml', yamlHljs);
hljs.registerLanguage('yml', yamlHljs);

const router = useRouter();
const themeVars = useThemeVars();
const previewImageUrl = ref<string | null>(null);
const previewImageAlt = ref<string>('');

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const renderedHtml = computed(() => {
  const usedIds = new Map<string, number>();

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(str, lang) {
      const normalizedLang = (lang || '').trim().toLowerCase();
      if (normalizedLang && hljs.getLanguage(normalizedLang)) {
        try {
          const highlighted = hljs.highlight(str, { language: normalizedLang, ignoreIllegals: true }).value;
          return `<pre class="article-code-block"><div class="code-lang">${escapeHtml(normalizedLang)}</div><code class="hljs language-${escapeHtml(normalizedLang)}">${highlighted}</code></pre>`;
        }
        catch {
          // Fall through to plain block
        }
      }
      return `<pre class="article-code-block"><code class="hljs">${escapeHtml(str)}</code></pre>`;
    },
  });

  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx];
    const inlineToken = tokens[idx + 1];
    if (inlineToken && inlineToken.type === 'inline') {
      const baseId = slugifyHeading(inlineToken.content);
      const count = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count}`;
      token.attrSet('id', id);
    }
    return self.renderToken(tokens, idx, options);
  };

  const defaultLinkOpen = md.renderer.rules.link_open
    || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') || '';
    const isExternal = /^https?:\/\//i.test(href) && !href.startsWith('https://888467.xyz');
    if (isExternal) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx];
    const src = token.attrGet('src') || '';
    const alt = token.content || '';
    const title = token.attrGet('title') || '';
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const captionHtml = alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : '';
    return `<figure class="article-figure"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr} loading="lazy" decoding="async" data-zoomable="true" />${captionHtml}</figure>`;
  };

  const rawHtml = md.render(markdown.value || '');
  return DomPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'rel', 'loading', 'decoding', 'data-zoomable', 'id'],
  });
});

function handleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }

  if (target.tagName === 'IMG') {
    const img = target as HTMLImageElement;
    if (img.src) {
      previewImageUrl.value = img.src;
      previewImageAlt.value = img.alt || '';
    }
    return;
  }

  const anchor = target.closest('a');
  if (!anchor) {
    return;
  }
  const href = anchor.getAttribute('href') || '';
  if (href.startsWith('/') && !href.startsWith('//') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    router.push(href);
  }
  else if (href.startsWith('https://888467.xyz/')) {
    const localPath = href.slice('https://888467.xyz'.length);
    if (localPath && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      router.push(localPath);
    }
  }
}
</script>

<template>
  <div>
    <div class="article-markdown-body" @click="handleContentClick" v-html="renderedHtml" />

    <n-modal
      :show="Boolean(previewImageUrl)"
      preset="card"
      :title="previewImageAlt || '图片预览'"
      style="max-width: 92vw; width: fit-content"
      @update:show="(val: boolean) => { if (!val) previewImageUrl = null; }"
    >
      <div flex items-center justify-center>
        <img
          v-if="previewImageUrl"
          :src="previewImageUrl"
          :alt="previewImageAlt"
          style="max-height: 82vh; max-width: 86vw; object-fit: contain; border-radius: 6px"
        >
      </div>
    </n-modal>
  </div>
</template>

<style lang="less" scoped>
.article-markdown-body {
  line-height: 1.8;
  font-size: 16px;
  color: v-bind('themeVars.textColor1');
  word-break: break-word;

  ::v-deep(h2) {
    font-size: 24px;
    font-weight: 600;
    margin: 36px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid v-bind('themeVars.dividerColor');
    scroll-margin-top: 24px;
  }

  ::v-deep(h3) {
    font-size: 19px;
    font-weight: 600;
    margin: 26px 0 10px;
    scroll-margin-top: 24px;
  }

  ::v-deep(h4) {
    font-size: 16px;
    font-weight: 600;
    margin: 20px 0 8px;
  }

  ::v-deep(p) {
    margin: 14px 0;
  }

  ::v-deep(a) {
    color: v-bind('themeVars.primaryColor');
    text-decoration: none;
    transition: opacity 0.2s ease;

    &:hover {
      text-decoration: underline;
      opacity: 0.85;
    }
  }

  ::v-deep(ul),
  ::v-deep(ol) {
    padding-left: 24px;
    margin: 12px 0;

    li {
      margin: 6px 0;
    }
  }

  ::v-deep(blockquote) {
    margin: 18px 0;
    padding: 10px 18px;
    border-left: 4px solid v-bind('themeVars.primaryColor');
    background-color: v-bind('themeVars.actionColor');
    border-radius: 0 6px 6px 0;
    color: v-bind('themeVars.textColor2');

    p {
      margin: 6px 0;
    }
  }

  ::v-deep(code:not(.hljs)) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: v-bind('themeVars.codeColor');
    color: v-bind('themeVars.primaryColor');
  }

  ::v-deep(.article-code-block) {
    position: relative;
    margin: 18px 0;
    padding: 16px 18px;
    border-radius: 8px;
    background-color: #18181c;
    color: #e5e7eb;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.08);

    .code-lang {
      position: absolute;
      top: 8px;
      right: 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255, 255, 255, 0.45);
      user-select: none;
    }

    code.hljs {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      line-height: 1.65;
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-built_in {
      color: #c084fc;
    }

    .hljs-string,
    .hljs-attr {
      color: #4ade80;
    }

    .hljs-number,
    .hljs-literal {
      color: #fb923c;
    }

    .hljs-title,
    .hljs-function {
      color: #60a5fa;
    }

    .hljs-comment,
    .hljs-quote {
      color: #9ca3af;
      font-style: italic;
    }
  }

  ::v-deep(.article-figure) {
    margin: 22px 0;
    text-align: center;

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid v-bind('themeVars.borderColor');
      cursor: zoom-in;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
    }

    figcaption {
      margin-top: 8px;
      font-size: 13px;
      color: v-bind('themeVars.textColor3');
    }
  }

  ::v-deep(img:not([data-zoomable])) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    cursor: zoom-in;
  }

  ::v-deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 14px;
    overflow-x: auto;
    display: block;

    th,
    td {
      border: 1px solid v-bind('themeVars.borderColor');
      padding: 10px 14px;
      text-align: left;
    }

    th {
      background-color: v-bind('themeVars.actionColor');
      font-weight: 600;
    }
  }

  ::v-deep(hr) {
    border: none;
    border-top: 1px solid v-bind('themeVars.dividerColor');
    margin: 28px 0;
  }
}
</style>

