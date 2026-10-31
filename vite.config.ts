import process from 'node:process';
import { resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import VueI18n from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import Unocss from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import markdown from 'vite-plugin-vue-markdown';
import svgLoader from 'vite-svg-loader';
import { configDefaults } from 'vitest/config';
import { processAllMarkdownFiles, processMarkdownFile } from './scripts/r2-uploader.mjs';

const VueI18nPlugin = (VueI18n as any).default ?? VueI18n;
const markdownPlugin = (markdown as any).default ?? markdown;
const ComponentsPlugin = (Components as any).default ?? Components;

const baseUrl = process.env.BASE_URL ?? '/';

function r2MarkdownImagesPlugin(): Plugin {
  let isBuild = false;
  const activeFiles = new Set<string>();

  return {
    name: 'vite-plugin-r2-markdown-images',
    enforce: 'pre',
    configResolved(resolvedConfig) {
      isBuild = resolvedConfig.command === 'build';
    },
    async buildStart() {
      if (!isBuild || process.env.SKIP_VITE_R2_UPLOAD === '1') {
        return;
      }
      await processAllMarkdownFiles();
    },
    configureServer(server) {
      const contentDir = resolve(__dirname, 'content');
      const srcDir = resolve(__dirname, 'src');
      server.watcher.add(contentDir);

      // Initial non-blocking scan on dev server startup
      processAllMarkdownFiles().catch((err) => {
        console.warn('[r2-upload] Dev 初始扫描异常:', err);
      });

      const onFileChange = async (filePath: string) => {
        if (!filePath.endsWith('.md') || filePath.toLowerCase().endsWith('readme.md')) {
          return;
        }
        if (!filePath.startsWith(contentDir) && !filePath.startsWith(srcDir)) {
          return;
        }
        if (activeFiles.has(filePath)) {
          return;
        }
        activeFiles.add(filePath);
        try {
          await processMarkdownFile(filePath);
        }
        catch (err) {
          console.warn(`[r2-upload] 处理文件异常 (${filePath}):`, err);
        }
        finally {
          setTimeout(() => activeFiles.delete(filePath), 300);
        }
      };

      server.watcher.on('add', onFileChange);
      server.watcher.on('change', onFileChange);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    r2MarkdownImagesPlugin(),
    VueI18nPlugin({
      runtimeOnly: true,
      jitCompilation: true,
      compositionOnly: true,
      fullInstall: true,
      strictMessage: false,
      include: [resolve(__dirname, 'locales/**')],
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        'vue-i18n',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
      vueTemplate: true,
      eslintrc: {
        enabled: true,
      },
    }),
    Icons({ compiler: 'vue3' }),
    vue({
      include: [/\.vue$/, /\.md$/],
      exclude: [/content\/articles\//],
    }),
    vueJsx(),
    markdownPlugin({
      exclude: [/content\/articles\//],
    }),
    svgLoader(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'IT Tools',
        description: 'Aggregated set of useful tools for developers.',
        display: 'standalone',
        lang: 'fr-FR',
        start_url: `${baseUrl}?utm_source=pwa&utm_medium=pwa`,
        orientation: 'any',
        theme_color: '#18a058',
        background_color: '#f1f5f9',
        icons: [
          {
            src: '/favicon-16x16.png',
            type: 'image/png',
            sizes: '16x16',
          },
          {
            src: '/favicon-32x32.png',
            type: 'image/png',
            sizes: '32x32',
          },
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    ComponentsPlugin({
      dirs: ['src/'],
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [NaiveUiResolver(), IconsResolver({ prefix: 'icon' })],
    }),
    Unocss(),
  ],
  base: baseUrl,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  envPrefix: ['VITE_', 'CF_PAGES_'],
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  test: {
    exclude: [...configDefaults.exclude, '**/*.e2e.spec.ts'],
  },
  build: {
    target: 'esnext',
  },
});
