# Changelog

All notable changes to Arc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.5.0] — 2026-02-16

### Added — Phase 5: Production Hardening
- Version system with semver support (`arc --version`, `arc version`)
- Version compatibility checking for `arc.toml` manifests
- Deprecation warning system with migration hints
- Production deployment guide
- Dockerfile for containerized runtime
- GitHub Actions CI/CD workflow
- Case studies with real-world examples
- Stability guarantees and versioning policy
- npm package configuration with `bin` entry

## [0.4.0] — 2026-02-16

### Added — Phase 4: Tooling & Ecosystem
- Package manager (`arc pkg init/add/remove/list/install`)
- Build system (`arc build/run/test/new`)
- LSP server with diagnostics, hover, go-to-definition, completions, document symbols
- VS Code extension with TextMate syntax highlighting
- Code formatter (`arc fmt`) with `--write` flag
- Linter (`arc lint`) with configurable rules
- Documentation site generator (`arc docs`)
- JS→Arc migration tool
- Python→Arc migration tool
- 358 tests passing

## [0.3.0] — 2026-02-16

### Added — Phase 3: Standard Library
- 11 stdlib modules: `math`, `strings`, `collections`, `map`, `io`, `http`, `json`, `csv`, `test`, `result`, `time`
- Full API reference documentation
- 8-section stdlib tutorial
- Auto-documentation generator
- 272 tests passing

## [0.2.0] — 2026-02-16

### Added — Phase 2: Core Compiler
- Semantic analyzer (name resolution, scope validation, mutability checking, arity checking, match exhaustiveness)
- SSA-based IR generator (three-address code)
- 6 optimization passes: constant folding, constant propagation, dead code elimination, CSE, tool-call batching, pipeline fusion
- JavaScript code generation backend
- WebAssembly Text (WAT) code generation backend
- Benchmarks showing 18–47% fewer tokens vs JavaScript
- 264 tests passing

## [0.1.0] — 2026-02-16

### Added — Phase 1: Specification & Prototype
- EBNF grammar specification
- Type system with `where`/`matching` constraints, enums, generics
- Type checker
- Stdlib API design
- Tree-walking interpreter
- Interactive REPL
- 248 tests passing
- Full documentation and browser playground
- Mutable assignment (`mut`)
- Async/await with parallel `fetch`
- Module system with `pub` exports
- Stdlib modules: `math`, `strings`
- 14 example programs
- 53+ prelude functions

## [0.0.1] — 2026-02-16

### Added — Phase 0: Foundation
- Repository structure and initial design
- Philosophy documentation
- Formal language specification (grammar, syntax, semantics)
- 14 examples demonstrating 62% average token reduction vs JS
- Contribution guidelines and code review standards
