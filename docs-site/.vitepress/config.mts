import { defineConfig } from 'vitepress'

export default defineConfig({
  cleanUrls: true,
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
      { text: 'GitHub', link: 'https://github.com/kai-builds-ai/arc-lang' },
      { text: 'Discord', link: 'https://discord.gg/BTcakNB6Jd' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Language Tour', link: '/language-tour' },
          { text: 'Cheatsheet', link: '/cheatsheet' },
          { text: 'Cookbook', link: '/cookbook' },
          { text: 'How Arc Compiles', link: '/architecture' },
          { text: 'FAQ', link: '/faq' }
        ]
      },
      {
        text: 'Standard Library',
        items: [
          { text: 'Tutorial', link: '/stdlib-tutorial' },
          { text: 'Reference (Full)', link: '/stdlib-reference' },
          { text: 'Overview', link: '/stdlib/' },
          {
            text: 'Modules',
            collapsed: true,
            items: [
              { text: 'math', link: '/stdlib/math' },
              { text: 'strings', link: '/stdlib/strings' },
              { text: 'collections', link: '/stdlib/collections' },
              { text: 'map', link: '/stdlib/map' },
              { text: 'io', link: '/stdlib/io' },
              { text: 'http', link: '/stdlib/http' },
              { text: 'json', link: '/stdlib/json' },
              { text: 'csv', link: '/stdlib/csv' },
              { text: 'test', link: '/stdlib/test' },
              { text: 'result', link: '/stdlib/result' },
              { text: 'time', link: '/stdlib/time' },
              { text: 'regex', link: '/stdlib/regex' },
              { text: 'datetime', link: '/stdlib/datetime' },
              { text: 'os', link: '/stdlib/os' },
              { text: 'error', link: '/stdlib/error' },
              { text: 'net', link: '/stdlib/net' },
              { text: 'crypto', link: '/stdlib/crypto' },
              { text: 'prompt', link: '/stdlib/prompt' },
              { text: 'embed', link: '/stdlib/embed' },
              { text: 'llm', link: '/stdlib/llm' },
              { text: 'store', link: '/stdlib/store' },
              { text: 'yaml', link: '/stdlib/yaml' },
              { text: 'toml', link: '/stdlib/toml' },
              { text: 'html', link: '/stdlib/html' },
              { text: 'path', link: '/stdlib/path' },
              { text: 'env', link: '/stdlib/env' },
              { text: 'log', link: '/stdlib/log' }
            ]
          }
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
      copyright: '© 2026 Arc Lang'
    },
    editLink: {
      pattern: 'https://github.com/kai-builds-ai/arc-lang/edit/main/docs-site/:path'
    }
  }
})
