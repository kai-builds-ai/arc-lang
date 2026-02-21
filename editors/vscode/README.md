# Arc Language — VS Code Extension

Syntax highlighting and language server support for the [Arc programming language](https://arclang.dev).

## Features

- **Syntax Highlighting** — Keywords, strings with interpolation, numbers, comments, operators, tool calls, pipe operator
- **Diagnostics** — Parse errors and semantic warnings shown inline
- **Hover** — Type information on hover
- **Go to Definition** — Jump to function/variable definitions
- **Completion** — Keywords, in-scope variables, stdlib functions
- **Document Symbols** — Outline of functions, types, and variables

## Installation

### From VS Code Marketplace (recommended)

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "Arc Language"
4. Click Install

For full IntelliSense (diagnostics, hover, completions), also install the Arc compiler:

```bash
npm install -g arc-lang
```

Syntax highlighting works without the compiler installed.

### Development

1. Clone the [arc-lang repo](https://github.com/kai-builds-ai/arc-lang)
2. Open `editors/vscode` in VS Code
3. `npm install && npm run compile`
4. Press `F5` to launch Extension Development Host
5. Open any `.arc` file
