import messages from '@intlify/unplugin-vue-i18n/messages';
import { get } from '@vueuse/core';
import type { Plugin } from 'vue';
import { createI18n } from 'vue-i18n';

export const i18n = createI18n({
  legacy: false,
  // 优先使用 'zh'，或者保留 localStorage 逻辑但把默认值改为 'zh'
  locale: localStorage.getItem('locale') || 'zh',
  fallbackLocale: 'en', // 备用语言可以保留为英文
  messages,
  // ...
});

export const i18nPlugin: Plugin = {
  install: (app) => {
    app.use(i18n);
  },
};

export const translate = function (localeKey: string) {
  const hasKey = i18n.global.te(localeKey, get(i18n.global.locale));
  return hasKey ? i18n.global.t(localeKey) : localeKey;
};
