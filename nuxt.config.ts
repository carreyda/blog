export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-svgo'],
  svgo: {
    autoImportPath: '~/assets/icons',
    componentPrefix: 'svgo',
    global: false,
    dts: true,
    // Import the raw svg component: the default 'componentext' wrapper forces
    // fill: currentColor, which turns these stroke icons into solid blobs.
    defaultImport: 'component',
    // The icons are stroke-only and inherit currentColor, so keep the original
    // fill/stroke attributes instead of letting preset-default strip them.
    svgoConfig: {
      plugins: [
        { name: 'preset-default', params: { overrides: { removeUselessStrokeAndFill: false } } },
        'removeDimensions',
      ],
    },
  },
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
        'lucide:search',
        'logos:nuxt-icon',
        'logos:typescript-icon',
        'logos:postgresql',
        'logos:html-5',
        'logos:css-3',
        'logos:javascript',
        'logos:vue',
        'logos:react',
        'logos:nextjs-icon',
        'simple-icons:github',
        'simple-icons:twitter',
        'simple-icons:linkedin',
        'simple-icons:juejin',
        'simple-icons:zhihu',
        'simple-icons:xiaohongshu',
      ],
    },
  },
  css: ['~/assets/css/main.css', '~/assets/css/admin-theme.css'],
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
