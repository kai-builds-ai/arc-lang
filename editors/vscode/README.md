# Arc Language VS Code Extension

Syntax highlighting and language server support for the [Arc programming language](https://github.com/kai-builds-ai/arc-lang).

## Features

- **Syntax Highlighting** — Keywords, strings with interpolation, numbers, comments, operators, tool calls, pipe operator
- **Diagnostics** — Parse errors and semantic warnings shown inline
- **Hover** — Type information on hover
- **Go to Definition** — Jump to function/variable definitions
- **Completion** — Keywords, in-scope variables, stdlib functions
- **Document Symbols** — Outline of functions, types, and variables

## Installation

### From Source

1. Clone the repo and `cd editors/vscode`
2. `npm install`
3. `npm run compile`
4. Copy/symlink this folder to `~/.vscode/extensions/arc-lang`
5. Reload VS Code

### Development

1. Open this folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Open any `.arc` file

## Requirements

- The Arc compiler must be available at `../../compiler/` relative to this extension
- `tsx` must be installed (`npm install -g tsx`)
