<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import type { HeadObject } from '@vueuse/head';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';

const route = useRoute();
const { t } = useI18n();

const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));

const head = computed<HeadObject>(() => {
  const currentTitle = toolTitle.value && toolTitle.value !== route.meta.name
    ? `${toolTitle.value} (${route.meta.name}) - IT Tools`
    : `${route.meta.name} - IT Tools`;
  const currentDesc = toolDescription.value || (route.meta?.description as string) || '';
  const canonicalUrl = `https://888467.xyz${route.path}`;
  const keywords = Array.isArray(route.meta.keywords)
    ? (route.meta.keywords as string[]).join(',')
    : '';

  return {
    title: currentTitle,
    meta: [
      {
        name: 'description',
        content: currentDesc,
      },
      {
        name: 'keywords',
        content: keywords,
      },
      {
        property: 'og:title',
        content: currentTitle,
      },
      {
        property: 'og:description',
        content: currentDesc,
      },
      {
        property: 'og:url',
        content: canonicalUrl,
      },
      {
        name: 'twitter:title',
        content: currentTitle,
      },
      {
        name: 'twitter:description',
        content: currentDesc,
      },
    ],
    link: [
      {
        rel: 'canonical',
        href: canonicalUrl,
      },
    ],
  };
});
useHead(head);
</script>

<template>
  <BaseLayout>
    <div class="tool-layout">
      <div class="tool-header">
        <div flex flex-nowrap items-center justify-between>
          <n-h1>
            {{ toolTitle }}
          </n-h1>

          <div>
            <FavoriteButton :tool="{ name: route.meta.name, path: route.path } as Tool" />
          </div>
        </div>

        <div class="separator" />

        <div class="description">
          {{ toolDescription }}
        </div>
      </div>
    </div>

    <div class="tool-content">
      <slot />
    </div>
  </BaseLayout>
</template>

<style lang="less" scoped>
.tool-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  ::v-deep(& > *) {
    flex: 0 1 600px;
  }
}

.tool-layout {
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;

  .tool-header {
    padding: 40px 0;
    width: 100%;

    .n-h1 {
      opacity: 0.9;
      font-size: 40px;
      font-weight: 400;
      margin: 0;
      line-height: 1;
    }

    .separator {
      width: 200px;
      height: 2px;
      background: rgb(161, 161, 161);
      opacity: 0.2;

      margin: 10px 0;
    }

    .description {
      margin: 0;

      opacity: 0.7;
    }
  }
}
</style>
