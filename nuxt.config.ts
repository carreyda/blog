export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  ui: {
    fonts: false,
  },
  icon: {
    mode: 'svg',
    serverBundle: {
      externalizeIconsJson: true,
    },
    clientBundle: {
      scan: true,
      icons: [
        'lucide:house',
        'lucide:notebook-text',
        'lucide:tag',
        'lucide:panels-top-left',
        'lucide:settings',
        'lucide:circle-check',
        'lucide:chart-no-axes-column-increasing',
        'lucide:x',
        'lucide:chevron-down',
        'lucide:external-link',
        'lucide:log-out',
        'lucide:menu',
        'lucide:arrow-left',
        'lucide:chevron-right',
        'lucide:pen-line',
        'lucide:loader-circle',
        'lucide:code-2',
        'logos:nuxt-icon',
        'logos:typescript-icon',
        'logos:postgresql',
        'simple-icons:github',
        'simple-icons:twitter',
        'simple-icons:linkedin',
        'simple-icons:juejin',
        'simple-icons:zhihu',
        'simple-icons:xiaohongshu',
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    sessionSecret: process.env.SESSION_SECRET || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#4493f8' },
      ],
    },
  },
})
