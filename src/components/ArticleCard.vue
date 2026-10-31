<script setup lang="ts">
import { IconCalendar, IconClock } from '@tabler/icons-vue';
import type { Article } from '@/articles/articles.types';

const props = defineProps<{ article: Article }>();
const { article } = toRefs(props);
</script>

<template>
  <router-link :to="article.path" class="block h-full decoration-none">
    <c-card class="h-full flex flex-col justify-between transition transition-duration-0.3s !border-2px !hover:border-primary">
      <div>
        <div v-if="article.cover" class="mb-12px overflow-hidden rounded-6px">
          <img
            :src="article.cover"
            :alt="article.title"
            loading="lazy"
            decoding="async"
            class="block h-160px w-full object-cover transition-transform duration-300 hover:scale-103"
          >
        </div>

        <div v-if="article.tags.length > 0" class="mb-8px flex flex-wrap gap-6px">
          <span
            v-for="tag in article.tags.slice(0, 3)"
            :key="tag"
            class="rounded-full bg-primary/10 px-8px py-2px text-12px text-primary font-500"
          >
            #{{ tag }}
          </span>
        </div>

        <div class="line-clamp-2 my-6px text-lg text-black font-500 dark:text-white">
          {{ article.title }}
        </div>

        <div class="line-clamp-2 text-14px text-neutral-500 leading-relaxed dark:text-neutral-400">
          {{ article.description }}
        </div>
      </div>

      <div class="mt-14px flex items-center justify-between text-12px text-neutral-400">
        <span class="flex items-center gap-4px">
          <n-icon :component="IconCalendar" size="14" />
          {{ article.date }}
        </span>
        <span class="flex items-center gap-4px">
          <n-icon :component="IconClock" size="14" />
          {{ $t('articles.readingTime', { min: article.readingMinutes }, `${article.readingMinutes} 分钟阅读`) }}
        </span>
      </div>
    </c-card>
  </router-link>
</template>
