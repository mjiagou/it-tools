<script setup lang="ts">
import { useHead } from '@vueuse/head';

useHead({
  title: '关于 IT-Tools (About) - 在线开发人员实用工具箱',
  meta: [
    {
      name: 'description',
      content: '关于 IT-Tools 在线工具箱 (888467.xyz)，为开发者和 IT 从业人员打造的免费、极速、开箱即用的实用工具集合。',
    },
    {
      property: 'og:title',
      content: '关于 IT-Tools (About) - 在线开发人员实用工具箱',
    },
    {
      property: 'og:url',
      content: 'https://888467.xyz/about',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://888467.xyz/about',
    },
  ],
});
</script>

<template>
  <c-markdown :markdown="$t('about.content')" mx-auto mt-50px max-w-600px />
</template>
