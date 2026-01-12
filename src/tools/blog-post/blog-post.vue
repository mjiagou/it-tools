<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
defineOptions({
  name: 'BlogPost',
});

const route = useRoute();
const slug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug;
const post = ref<any>(null);
const htmlContent = ref('');

onMounted(async () => {
  try {
    const resp = await fetch('/blog/data/posts.json');
    if (!resp.ok) {
      throw new Error('Failed to fetch posts');
    }
    const list = await resp.json();
    const found = list.find((p: any) => p.slug === slug);
    if (!found) {
      throw new Error('Post not found');
    }
    post.value = found;
    const htmlResp = await fetch(`/blog/${slug}`);
    if (!htmlResp.ok) {
      throw new Error('Post page not found');
    }
    const htmlText = await htmlResp.text();
    const match = htmlText.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (match) {
      htmlContent.value = match[1];
    } else {
      htmlContent.value = htmlText;
    }
  } catch (e) {
    console.error('Failed to load blog post:', e);
    htmlContent.value = '<p>加载失败</p>';
  }
});

// 动态更新 <title> 与 SEO 元信息，随文章标题变化
watchEffect(() => {
  if (post.value) {
    useHead({
      title: `${post.value.title} - Blog - IT Tools`,
      meta: [
        { name: 'description', content: post.value.excerpt },
        { name: 'keywords', content: (post.value.tags ?? []).join(',') },
      ],
    });
  }
});
</script>

<template>
  <div v-if="post" class="blog-post">
    <h1>{{ post.title }}</h1>
    <div class="meta">
      <span>{{ post.date }}</span>
      <span v-if="post.tags?.length" style="margin-left: 12px">标签: {{ post.tags.join(', ') }}</span>
    </div>
    <div class="content" v-html="htmlContent" />
  </div>
  <div v-else class="loading">
    <p>加载中...</p>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 40px;
}
.blog-post .meta {
  opacity: 0.7;
  margin-bottom: 24px;
}
.blog-post .content {
  line-height: 1.7;
  font-size: 15px;
}
</style>
