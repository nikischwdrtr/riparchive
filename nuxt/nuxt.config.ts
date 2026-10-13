
export default defineNuxtConfig({
  modules: ['@unocss/nuxt'],
  compatibilityDate: '2026-10-13',

  runtimeConfig: {
    arenaToken: process.env.ARENA_TOKEN || '',

    public: {
      arenaChannel: 'doc-2glibd4reqc'
    }
  },

  app: {
    head: {
      title: 'archive',
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        { rel: 'icon', type: 'image/png', href: '/icon.png' },
      ]
    },
  }
})
