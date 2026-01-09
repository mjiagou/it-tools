<script lang="ts" setup>
import { computed } from 'vue'; // 确保引入了 computed
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';

import type { HeadObject } from '@vueuse/head'; // 引入 HeadObject 类型

import { useI18n } from 'vue-i18n'; // 引入 useI18n

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';

const route = useRoute();
const { t } = useI18n(); // 1. 【移动到顶部】先获取翻译工具 t

// 2. 【移动到这里】先计算出当前工具的中文名称和描述
const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));

// 3. 【修改配置】使用上面计算好的中文变量，以及全局网站名
const head = computed<HeadObject>(() => ({
  // 修改前: title: `${route.meta.name} - IT Tools`,
  // 修改后: 工具中文名 - 网站全局名(从语言包读取)
  title: `${toolTitle.value} - ${t('repository.title')}`,
  meta: [
    {
      name: 'description',
      // 修改后: 使用中文描述
      content: toolDescription.value,
    },
    {
      name: 'keywords',
      content: ((route.meta.keywords ?? []) as string[]).join(','),
    },
  ],
}));

// 4. 最后执行 SEO 设置
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
