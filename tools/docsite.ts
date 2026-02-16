/**
 * Arc Documentation Site Generator
 * 
 * Reads .md files from docs/, spec/, stdlib/ and generates a static HTML site.
 * Usage: npx tsx tools/docsite.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "site");

// Arc syntax highlighting keywords
const ARC_KEYWORDS = [
  "fn", "let", "mut", "type", "use", "pub", "match", "if", "el", "for", "in",
  "do", "while", "until", "async", "await", "ret", "true", "false", "nil",
  "and", "or", "not", "where", "matching", "fetch"
];

const ARC_OPERATORS = ["|>", "=>", "->", "@", "++", "..", "==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%", "=", "|", "?"];

interface DocPage {
  title: string;
  slug: string;
  section: string;
  content: string;
  headings: { level: number; text: string; id: string }[];
  htmlContent: string;
}

function highlightArc(code: string): string {
  // Escape HTML first
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight strings
  html = html.replace(/"([^"\\]|\\.)*"/g, '<span class="hl-string">"$&"</span>'.replace('"$&"', '$&'));
  html = html.replace(/"([^"\\]|\\.)*"/g, '<span class="hl-string">$&</span>');

  // Highlight comments
  html = html.replace(/(#.*)$/gm, '<span class="hl-comment">$1</span>');

  // Highlight numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');

  // Highlight keywords
  for (const kw of ARC_KEYWORDS) {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, "g"), '<span class="hl-keyword">$1</span>');
  }

  // Highlight @ tool calls
  html = html.replace(/@(\w+)/g, '<span class="hl-tool">@$1</span>');

  // Highlight |> pipe
  html = html.replace(/\|&gt;/g, '<span class="hl-operator">|&gt;</span>');
  html = html.replace(/=&gt;/g, '<span class="hl-operator">=&gt;</span>');
  html = html.replace(/-&gt;/g, '<span class="hl-operator">-&gt;</span>');

  return html;
}

function parseMarkdown(md: string): { html: string; headings: { level: number; text: string; id: string }[] } {
  const headings: { level: number; text: string; id: string }[] = [];
  let html = "";
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeContent = "";
  let inList = false;

  const lines = md.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        const highlighted = codeBlockLang === "arc" ? highlightArc(codeContent) : escapeHtml(codeContent);
        html += `<pre><code class="lang-${codeBlockLang}">${highlighted}</code></pre>\n`;
        inCodeBlock = false;
        codeContent = "";
        codeBlockLang = "";
      } else {
        if (inList) { html += "</ul>\n"; inList = false; }
        inCodeBlock = true;
        codeBlockLang = line.trim().replace("```", "").trim() || "text";
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? "\n" : "") + line;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (inList) { html += "</ul>\n"; inList = false; }
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      headings.push({ level, text, id });
      html += `<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>\n`;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += "<hr>\n";
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      if (inList) { html += "</ul>\n"; inList = false; }
      html += `<blockquote><p>${inlineMarkdown(line.slice(2))}</p></blockquote>\n`;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { html += "<ul>\n"; inList = true; }
      html += `<li>${inlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>\n`;
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList) { html += "<ul>\n"; inList = true; }
      html += `<li>${inlineMarkdown(line.replace(/^\s*\d+\.\s+/, ""))}</li>\n`;
      continue;
    }

    if (inList && line.trim() === "") {
      html += "</ul>\n";
      inList = false;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      html += "\n";
      continue;
    }

    // Paragraph
    if (inList) { html += "</ul>\n"; inList = false; }
    html += `<p>${inlineMarkdown(line)}</p>\n`;
  }

  if (inList) html += "</ul>\n";
  if (inCodeBlock) {
    html += `<pre><code class="lang-${codeBlockLang}">${highlightArc(codeContent)}</code></pre>\n`;
  }

  return { html, headings };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMarkdown(text: string): string {
  let r = text;
  r = r.replace(/`([^`]+)`/g, "<code>$1</code>");
  r = r.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  r = r.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return r;
}

function collectMarkdownFiles(dir: string, section: string): DocPage[] {
  if (!existsSync(dir)) return [];
  const pages: DocPage[] = [];
  
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      const filePath = join(dir, entry.name);
      const content = readFileSync(filePath, "utf-8");
      const slug = entry.name.replace(/\.md$/, "");
      
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1] : slug;
      
      const { html, headings } = parseMarkdown(content);
      
      pages.push({
        title,
        slug: `${section}-${slug}`,
        section,
        content,
        headings,
        htmlContent: html,
      });
    } else if (entry.isDirectory()) {
      const subPages = collectMarkdownFiles(join(dir, entry.name), section);
      pages.push(...subPages);
    }
  }
  
  return pages;
}

function generateCSS(): string {
  return `
:root {
  --bg: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --text: #e6edf3;
  --text-secondary: #8b949e;
  --accent: #58a6ff;
  --accent-dim: #1f6feb;
  --border: #30363d;
  --green: #3fb950;
  --orange: #d29922;
  --red: #f85149;
  --purple: #bc8cff;
  --sidebar-width: 280px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  font-size: 16px;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Sidebar */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 1rem 0;
  z-index: 100;
}

.sidebar-header {
  padding: 0.5rem 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.5rem;
}

.sidebar-header h1 {
  font-size: 1.25rem;
  color: var(--accent);
  font-weight: 700;
}

.sidebar-header .tagline {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.sidebar-section {
  padding: 0.5rem 0;
}

.sidebar-section h3 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  padding: 0.5rem 1.25rem 0.25rem;
}

.sidebar-section a {
  display: block;
  padding: 0.3rem 1.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  transition: all 0.15s;
}

.sidebar-section a:hover,
.sidebar-section a.active {
  color: var(--text);
  background: var(--bg-tertiary);
  text-decoration: none;
}

/* Search */
.search-box {
  padding: 0.75rem 1.25rem;
}

.search-box input {
  width: 100%;
  padding: 0.4rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.85rem;
  outline: none;
}

.search-box input:focus {
  border-color: var(--accent);
}

.search-results {
  padding: 0 1.25rem;
  max-height: 300px;
  overflow-y: auto;
}

.search-results a {
  display: block;
  padding: 0.35rem 0;
  font-size: 0.8rem;
  color: var(--accent);
}

/* Main content */
.main {
  margin-left: var(--sidebar-width);
  max-width: 850px;
  padding: 2rem 3rem;
}

.main h1 { font-size: 2rem; margin: 1.5rem 0 1rem; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
.main h2 { font-size: 1.5rem; margin: 1.5rem 0 0.75rem; color: var(--text); }
.main h3 { font-size: 1.2rem; margin: 1.25rem 0 0.5rem; color: var(--text); }
.main h4 { font-size: 1rem; margin: 1rem 0 0.5rem; color: var(--text); }

.main p { margin: 0.5rem 0; color: var(--text-secondary); }
.main ul, .main ol { margin: 0.5rem 0 0.5rem 1.5rem; color: var(--text-secondary); }
.main li { margin: 0.25rem 0; }

.main blockquote {
  border-left: 3px solid var(--accent-dim);
  padding: 0.5rem 1rem;
  margin: 1rem 0;
  background: var(--bg-secondary);
  border-radius: 0 6px 6px 0;
}

.main code {
  background: var(--bg-tertiary);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.875em;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.main pre {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.main pre code {
  background: none;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1.5;
}

.main hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
.main strong { color: var(--text); }

/* Syntax highlighting */
.hl-keyword { color: #ff7b72; font-weight: 600; }
.hl-string { color: #a5d6ff; }
.hl-number { color: #79c0ff; }
.hl-comment { color: #8b949e; font-style: italic; }
.hl-operator { color: #ff7b72; }
.hl-tool { color: var(--orange); font-weight: 600; }

/* Table of contents */
.toc {
  position: fixed;
  right: 2rem;
  top: 2rem;
  width: 200px;
  font-size: 0.8rem;
}

.toc h4 {
  color: var(--text-secondary);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}

.toc a {
  display: block;
  padding: 0.15rem 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.toc a:hover { color: var(--text); }
.toc .toc-h3 { padding-left: 0.75rem; }
.toc .toc-h4 { padding-left: 1.5rem; }

/* Navigation */
.page-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.page-nav a {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  transition: border-color 0.15s;
}

.page-nav a:hover {
  border-color: var(--accent);
  text-decoration: none;
}

/* Mobile */
.menu-toggle {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 200;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .menu-toggle { display: block; }
  .sidebar { transform: translateX(-100%); transition: transform 0.2s; }
  .sidebar.open { transform: translateX(0); }
  .main { margin-left: 0; padding: 1rem 1.5rem; padding-top: 3.5rem; }
  .toc { display: none; }
}

@media (max-width: 1200px) {
  .toc { display: none; }
}
`;
}

function generateSearchJS(pages: DocPage[]): string {
  const searchData = pages.map(p => ({
    title: p.title,
    slug: p.slug,
    content: p.content.replace(/[#*`\[\]()]/g, "").substring(0, 500),
  }));

  return `
const searchData = ${JSON.stringify(searchData)};

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  if (input) {
    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) { results.innerHTML = ''; return; }
      const matches = searchData.filter(p =>
        p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      ).slice(0, 10);
      results.innerHTML = matches.map(m =>
        '<a href="' + m.slug + '.html">' + m.title + '</a>'
      ).join('');
    });
  }

  // Highlight active link
  const current = location.pathname.split('/').pop()?.replace('.html', '');
  document.querySelectorAll('.sidebar-section a').forEach(a => {
    if (a.getAttribute('href')?.replace('.html', '') === current + '.html'.replace('.html','')) {
      a.classList.add('active');
    }
  });
});
`;
}

function generatePage(page: DocPage, pages: DocPage[], idx: number, css: string, js: string): string {
  const sectionNames: Record<string, string> = { docs: "Documentation", spec: "Specification", stdlib: "Standard Library" };
  const sections = ["docs", "spec", "stdlib"];

  const sidebarHtml = sections.map(section => {
    const sectionPages = pages.filter(p => p.section === section);
    if (sectionPages.length === 0) return "";
    return `<div class="sidebar-section">
      <h3>${sectionNames[section]}</h3>
      ${sectionPages.map(p => `<a href="${p.slug}.html"${p.slug === page.slug ? ' class="active"' : ''}>${p.title}</a>`).join("\n")}
    </div>`;
  }).join("\n");

  const tocHtml = page.headings
    .filter(h => h.level >= 2 && h.level <= 4)
    .map(h => `<a href="#${h.id}" class="toc-h${h.level}">${h.text}</a>`)
    .join("\n");

  const prev = idx > 0 ? pages[idx - 1] : null;
  const next = idx < pages.length - 1 ? pages[idx + 1] : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} — Arc Language</title>
  <style>${css}</style>
</head>
<body>
  <button class="menu-toggle" id="menu-toggle">☰</button>
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>⚡ Arc</h1>
      <div class="tagline">Language Documentation</div>
    </div>
    <div class="search-box">
      <input type="text" id="search-input" placeholder="Search docs...">
    </div>
    <div id="search-results" class="search-results"></div>
    ${sidebarHtml}
  </nav>
  <main class="main">
    ${page.htmlContent}
    <nav class="page-nav">
      ${prev ? `<a href="${prev.slug}.html">← ${prev.title}</a>` : "<span></span>"}
      ${next ? `<a href="${next.slug}.html">${next.title} →</a>` : "<span></span>"}
    </nav>
  </main>
  ${tocHtml ? `<aside class="toc"><h4>On this page</h4>${tocHtml}</aside>` : ""}
  <script>${js}</script>
</body>
</html>`;
}

export function buildSite() {
  console.log("Building Arc documentation site...\n");

  // Collect pages
  const pages: DocPage[] = [
    ...collectMarkdownFiles(join(ROOT, "docs"), "docs"),
    ...collectMarkdownFiles(join(ROOT, "spec"), "spec"),
    ...collectMarkdownFiles(join(ROOT, "stdlib"), "stdlib"),
  ];

  if (pages.length === 0) {
    console.log("No markdown files found.");
    return;
  }

  console.log(`Found ${pages.length} pages:`);
  pages.forEach(p => console.log(`  ${p.section}/${p.slug}: ${p.title}`));

  // Create output directory
  mkdirSync(OUT, { recursive: true });

  const css = generateCSS();
  const js = generateSearchJS(pages);

  // Generate each page
  for (let i = 0; i < pages.length; i++) {
    const html = generatePage(pages[i], pages, i, css, js);
    writeFileSync(join(OUT, `${pages[i].slug}.html`), html, "utf-8");
  }

  // Generate index.html (redirect to first page)
  const indexHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=${pages[0].slug}.html">
<title>Arc Documentation</title></head>
<body><a href="${pages[0].slug}.html">Go to documentation</a></body></html>`;
  writeFileSync(join(OUT, "index.html"), indexHtml, "utf-8");

  console.log(`\nGenerated ${pages.length + 1} files in site/`);
}

// CLI entry point
if (process.argv[1]?.includes("docsite")) {
  buildSite();
}
