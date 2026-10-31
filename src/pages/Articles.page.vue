<script setup lang="ts">
import { IconArticle, IconSearch } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import ArticleCard from '@/components/ArticleCard.vue';
import { allArticleTags, allArticles } from '@/articles/articles.service';

const { t } = useI18n();

const searchQuery = ref('');
const selectedTag = ref<string | null>(null);

useHead(computed(() => {
  const pageTitle = `${t('articles.pageTitle', '技术文章与实用指南')} - IT Tools`;
  const pageDesc = t(
    'articles.pageDescription',
    'IT Tools (888467.xyz) 技术文章专栏，分享开发者工具使用技巧、编码解码原理解析、正则表达式与日常开发效率指南。',
  );

  return {
    title: pageTitle,
    meta: [
      { name: 'description', content: pageDesc },
      { name: 'keywords', content: ['IT Tools', '技术文章', '开发指南', '在线工具教程', ...allArticleTags].join(', ') },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: pageDesc },
      { property: 'og:url', content: 'https://888467.xyz/articles' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: pageDesc },
    ],
    link: [
      { rel: 'canonical', href: 'https://888467.xyz/articles' },
    ],
  };
}));

const filteredArticles = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return allArticles.filter((article) => {
    if (selectedTag.value && !article.tags.includes(selectedTag.value)) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      article.title.toLowerCase().includes(q)
      || article.description.toLowerCase().includes(q)
      || article.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });
});

function toggleTag(tag: string) {
  selectedTag.value = selectedTag.value === tag ? null : tag;
}
</script>

<template>
  <div class="mx-auto max-w-1100px px-16px pb-60px pt-40px">
    <div class="mb-28px">
      <div class="flex items-center gap-10px">
        <n-icon :component="IconArticle" size="34" class="text-primary" />
        <h1 class="m-0 text-32px font-600 op-90">
          {{ $t('articles.heading', '技术文章与指南') }}
        </h1>
      </div>
      <div class="my-12px h-2px w-180px bg-neutral-400 op-20" />
      <p class="m-0 text-15px op-70">
        {{ $t('articles.subheading', '深入解析常用开发工具原理、排错实战技巧与效率提升指南') }}
      </p>
    </div>

    <div class="mb-24px flex flex-col gap-14px md:flex-row md:items-center md:justify-between">
      <div v-if="allArticleTags.length > 0" class="flex flex-wrap items-center gap-8px">
        <c-button
          size="small"
          :type="selectedTag === null ? 'primary' : 'default'"
          @click="selectedTag = null"
        >
          {{ $t('articles.allTags', '全部') }} ({{ allArticles.length }})
        </c-button>
        <c-button
          v-for="tag in allArticleTags"
          :key="tag"
          size="small"
          :type="selectedTag === tag ? 'primary' : 'default'"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
        </c-button>
      </div>

      <div class="w-full md:w-280px">
        <c-input-text
          v-model:value="searchQuery"
          :placeholder="$t('articles.searchPlaceholder', '搜索文章标题或标签...')"
          clearable
          raw-text
        >
          <template #prefix>
            <n-icon :component="IconSearch" class="mr-6px op-50" />
          </template>
        </c-input-text>
      </div>
    </div>

    <div
      v-if="filteredArticles.length > 0"
      class="grid grid-cols-1 gap-16px lg:grid-cols-3 sm:grid-cols-2"
    >
      <ArticleCard
        v-for="article in filteredArticles"
        :key="article.slug"
        :article="article"
      />
    </div>

    <c-card v-else class="py-48px text-center">
      <div class="text-16px op-60">
        {{ $t('articles.empty', '暂无匹配的文章') }}
      </div>
    </c-card>
  </div>
</template>

