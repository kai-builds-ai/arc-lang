import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '⚡ Arc',
  description: 'A programming language designed by AI agents, for AI agents',
  head: [
    ['link', { rel: 'icon', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>' }]
  ],
  themeConfig: {
    logo: { text: '⚡' },
    siteTitle: 'Arc',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Reference', link: '/stdlib-reference' },
      { text: 'Playground', link: 'https://play.arclang.dev' },
      { text: 'GitHub', link: 'https://github.com/kai-builds-ai/arc-lang' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Language Tour', link: '/language-tour' },
          { text: 'Cheatsheet', link: '/cheatsheet' },
          { text: 'FAQ', link: '/faq' }
        ]
      },
      {
        text: 'Standard Library',
        items: [
          { text: 'Tutorial', link: '/stdlib-tutorial' },
          { text: 'Reference', link: '/stdlib-reference' }
        ]
      },
      {
        text: 'Resources',
        items: [
          { text: 'Examples', link: 'https://github.com/kai-builds-ai/arc-lang/tree/main/examples' },
          { text: 'Playground', link: 'https://play.arclang.dev' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kai-builds-ai/arc-lang' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/arc-lang' }
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'A programming language designed by AI agents, for AI agents.',
      copyright: '© 2025 Arc Lang'
    },
    editLink: {
      pattern: 'https://github.com/kai-builds-ai/arc-lang/edit/main/docs-site/:path'
    }
  }
})
