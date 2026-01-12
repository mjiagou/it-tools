<script setup lang="ts">
const props = defineProps<{
  article: { title: string; excerpt: string; image?: string; link?: string; tags?: string[] }
}>();
const { article } = toRefs(props);
</script>

<template>
  <c-card class="h-full transition transition-duration-0.5s !border-2px !hover:border-primary">
    <img v-if="article.image" :src="article.image" alt="" class="h-40 w-full object-cover">
    <div class="p-3">
      <a :href="article.link || '#'" class="decoration-none">
        <div class="mt-2 truncate text-lg text-black font-semibold dark:text-white hover:text-primary">
          {{ article.title }}
        </div>
      </a>
      <div class="line-clamp-2 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {{ article.excerpt }}
      </div>
      <div v-if="article.tags && article.tags.length" class="mt-2 flex flex-wrap gap-1">
        <span
          v-for="tag in article.tags"
          :key="tag"
          class="inline-block rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </c-card>
</template>
