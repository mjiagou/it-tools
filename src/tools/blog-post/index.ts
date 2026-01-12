import { IconArticle } from '@tabler/icons-vue';
import type { Tool } from '@/tools/tools.types';

export const tool: Tool = {
  name: 'blog-post',
  path: '/blog/:slug',
  description: '动态渲染博客文章页面',
  keywords: [],
  component: () => import('./blog-post.vue'),
  icon: IconArticle,
  isNew: false,
  redirectFrom: [],
};
