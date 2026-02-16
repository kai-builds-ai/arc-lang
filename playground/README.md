# Arc ⚡ Playground

A browser-based playground for the Arc programming language. Write and run Arc code instantly — no install needed.

## Usage

**Just open `index.html` in any browser.** That's it. No build step, no npm, no server required.

```bash
# Or serve with any static server:
npx serve .
python -m http.server 8000
```

## Features

- **Live interpreter** — Full Arc lexer, parser, and interpreter running in the browser
- **Syntax highlighting** — Keywords, strings, numbers, comments, tool calls
- **Examples dropdown** — Load pre-built demos instantly
- **Share button** — Encodes code in URL hash (base64) for easy sharing
- **Split-pane layout** — Resizable editor + output panels
- **Keyboard shortcuts** — Ctrl+Enter to run, Tab inserts spaces
- **Dark theme** — Easy on the eyes
- **Mobile friendly** — Responsive layout

## Supported Arc Features

- Variables: `let x = 42`, `let mut y = 0`
- Functions: `fn add(a, b) => a + b`
- Pattern matching: `match val { 0 => "zero", _ => "other" }`
- Pipelines: `data |> filter(x => x > 0) |> map(x => x * 2) |> sum`
- List comprehensions: `[x * 2 for x in 1..10 if x % 2 == 0]`
- String interpolation: `"Hello {name}"`
- If/el expressions: `if cond { a } el { b }`
- For loops, do/until, ranges
- Tool calls (mocked): `@GET "api/users"`
- Prelude functions: print, len, map, filter, reduce, sort, sum, join, split, trim, upper, lower, etc.

## Future

- Deploy to GitHub Pages
- Add more examples
- REPL mode
- Dark/light theme toggle
