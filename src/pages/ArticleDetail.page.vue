<script setup lang="ts">
import { IconArrowLeft, IconArrowRight, IconCalendar, IconClock, IconList } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { useRoute } from 'vue-router';
import ArticleMarkdown from '@/articles/ArticleMarkdown.vue';
import { extractTocFromMarkdown, getAdjacentArticles, getArticleBySlug } from '@/articles/articles.service';

const route = useRoute();
const { t } = useI18n();

const slug = computed(() => String(route.params.slug || ''));
const article = computed(() => getArticleBySlug(slug.value));
const adjacent = computed(() => getAdjacentArticles(slug.value));
const toc = computed(() => (article.value ? extractTocFromMarkdown(article.value.content) : []));

useHead(computed(() => {
  if (!article.value) {
    return {
      title: `404 - ${t('articles.notFound', '文章不存在')} | IT Tools`,
    };
  }

  const pageTitle = `${article.value.title} - IT Tools`;
  const canonicalUrl = `https://888467.xyz${article.value.path}`;
  const ogImage = article.value.cover || 'https://888467.xyz/banner.png';
  const keywords = [...article.value.tags, 'IT Tools', '技术文章', '888467.xyz'].join(', ');

  return {
    title: pageTitle,
    meta: [
      { name: 'description', content: article.value.description },
      { name: 'keywords', content: keywords },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: article.value.description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: ogImage },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: article.value.description },
      { name: 'twitter:image', content: ogImage },
    ],
    link: [
      { rel: 'canonical', href: canonicalUrl },
    ],
  };
}));
</script>

<template>
  <div class="mx-auto max-w-1100px px-16px pb-60px pt-32px">
    <div class="mb-20px">
      <c-button to="/articles" variant="text" size="small">
        <n-icon :component="IconArrowLeft" class="mr-6px" />
        {{ $t('articles.backToList', '返回文章列表') }}
      </c-button>
    </div>

    <template v-if="article">
      <div class="flex flex-col gap-24px lg:flex-row lg:items-start">
        <article class="min-w-0 flex-1">
          <c-card class="p-24px sm:p-36px">
            <header class="mb-24px border-b border-neutral-200 pb-20px dark:border-neutral-800">
              <div v-if="article.tags.length > 0" class="mb-12px flex flex-wrap gap-8px">
                <span
                  v-for="tag in article.tags"
                  :key="tag"
                  class="rounded-full bg-primary/10 px-10px py-3px text-12px text-primary font-500"
                >
                  #{{ tag }}
                </span>
              </div>

              <h1 class="m-0 text-28px font-700 leading-snug sm:text-34px">
                {{ article.title }}
              </h1>

              <div class="mt-14px flex flex-wrap items-center gap-16px text-13px text-neutral-500 dark:text-neutral-400">
                <span class="flex items-center gap-5px">
                  <n-icon :component="IconCalendar" size="15" />
                  {{ article.date }}
                </span>
                <span class="flex items-center gap-5px">
                  <n-icon :component="IconClock" size="15" />
                  {{ $t('articles.readingTime', { min: article.readingMinutes }, `${article.readingMinutes} 分钟阅读`) }}
                </span>
                <span v-if="article.author">
                  {{ article.author }}
                </span>
              </div>

              <div v-if="article.cover" class="mt-20px overflow-hidden rounded-8px">
                <img
                  :src="article.cover"
                  :alt="article.title"
                  class="block max-h-420px w-full object-cover"
                >
              </div>
            </header>

            <ArticleMarkdown :markdown="article.content" />
          </c-card>

          <div
            v-if="adjacent.prev || adjacent.next"
            class="grid grid-cols-1 mt-20px gap-12px sm:grid-cols-2"
          >
            <router-link
              v-if="adjacent.prev"
              :to="adjacent.prev.path"
              class="block decoration-none"
            >
              <c-card class="h-full transition !border-2px !hover:border-primary">
                <div class="mb-4px flex items-center gap-4px text-12px text-neutral-400">
                  <n-icon :component="IconArrowLeft" size="14" />
                  {{ $t('articles.prevArticle', '上一篇') }}
                </div>
                <div class="line-clamp-1 font-500">
                  {{ adjacent.prev.title }}
                </div>
              </c-card>
            </router-link>
            <div v-else />

            <router-link
              v-if="adjacent.next"
              :to="adjacent.next.path"
              class="block text-right decoration-none"
            >
              <c-card class="h-full transition !border-2px !hover:border-primary">
                <div class="mb-4px flex items-center justify-end gap-4px text-12px text-neutral-400">
                  {{ $t('articles.nextArticle', '下一篇') }}
                  <n-icon :component="IconArrowRight" size="14" />
                </div>
                <div class="line-clamp-1 font-500">
                  {{ adjacent.next.title }}
                </div>
              </c-card>
            </router-link>
          </div>
        </article>

        <aside
          v-if="toc.length > 0"
          class="sticky top-24px hidden w-250px shrink-0 lg:block"
        >
          <c-card>
            <div class="mb-10px flex items-center gap-6px text-14px font-600 op-85">
              <n-icon :component="IconList" size="16" />
              {{ $t('articles.toc', '目录导航') }}
            </div>
            <nav class="flex flex-col gap-6px text-13px">
              <a
                v-for="item in toc"
                :key="item.id"
                :href="`#${item.id}`"
                class="line-clamp-1 text-neutral-500 decoration-none transition dark:text-neutral-400 hover:text-primary"
                :class="{ 'pl-12px text-12px': item.level === 3 }"
              >
                {{ item.text }}
              </a>
            </nav>
          </c-card>
        </aside>
      </div>
    </template>

    <c-card v-else class="mx-auto max-w-520px py-48px text-center">
      <h2 class="mt-0 text-22px">
        {{ $t('articles.notFound', '抱歉，未找到该文章') }}
      </h2>
      <p class="mb-20px op-65">
        {{ $t('articles.notFoundDesc', '文章可能已被移动或链接有误。') }}
      </p>
      <c-button to="/articles" type="primary">
        {{ $t('articles.backToList', '返回文章列表') }}
      </c-button>
    </c-card>
  </div>
</template>
