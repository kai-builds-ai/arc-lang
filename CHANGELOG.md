# Changelog

All notable changes to Arc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.5.9] — 2026-02-16

### Added — AI-Native Stdlib Modules

**4 new standard library modules for AI agent workflows (21 stdlib modules total):**

- **`prompt`** — Template filling (`template`), token counting (`token_count`, `token_truncate`), context windowing (`context_window`, `chunk`), message formatting (`system_prompt`, `user_message`, `assistant_message`, `format_chat`)
- **`embed`** — Vector math (`dot_product`, `magnitude`, `cosine_similarity`, `normalize`, `euclidean_distance`, `centroid`), similarity search (`most_similar`), text chunking (`chunk_and_embed`)
- **`llm`** — Multi-provider LLM API (`chat`, `complete`, `stream`, `models`, `estimate_cost`, `providers`) supporting OpenAI and Anthropic
- **`store`** — Persistent JSON-backed key-value storage (`store_open`, `store_get`, `store_set`, `store_delete`, `store_has`, `store_keys`, `store_values`, `store_entries`, `store_clear`, `store_size`, `store_merge`, `store_get_or_set`)

## [0.5.8] — 2026-02-16

### Fixed — Parser, Examples & Native IO/HTTP

**Parser fixes:**
- Fixed multiple parser edge cases identified during example verification

**Example fixes:**
- Corrected syntax across example files to match current language spec

**Native implementations:**
- Native IO module (read/write via Node.js fs)
- Native HTTP module (real fetch via sync bridge)

**Security:**
- Added SECURITY.md with vulnerability reporting guidelines

## [0.5.6] — 2026-02-16

### Changed — Restructure, Verify, Integrate

**Restructured content:**
- Removed `docs/tutorials/` (6 markdown tutorials)
- Extracted tutorial code into `examples/learn/` (5 standalone .arc files + README)
- Moved tutorial 06 (real-world news digest project) to `showcase/news-digest/`
- Updated all cross-references in README, docs, examples, and showcase READMEs

**Verified all examples:**
- Tested 71 .arc files across `examples/` and `showcase/`
- 39 pass end-to-end, 32 depend on external services or advanced runtime features (websockets, external APIs, etc.)
- 0 syntax/parse errors — every file compiles cleanly
- Fixed ~30 example files with corrected syntax, keywords, and API usage

**Native stdlib integration (all 8 modules now have native implementations):**
- Wired up native implementations for `regex` (11 functions), `datetime` (7 functions), `os` (16 functions)
- Wired up native implementations for `io` (4 functions: read/write via Node.js fs) and `http` (5 functions: real fetch via sync bridge)
- `crypto` (6 functions), `error` (4 functions), `net` (5 functions) were already natively implemented
- ReDoS protection for regex patterns with nested quantifiers
- Command injection protection for `os.exec` (rejects shell metacharacters)
- 10s timeout on `os.exec`
- **Complete native stdlib coverage** — all 8 native-capable modules (regex, datetime, os, io, http, crypto, error, net) now execute real system calls

**Bug fixes (Audit Round 3 — 10 fixes):**
- `slice()` null-end bug — null cast to NaN before nullish check
- `regex_find_all` / `regex_captures_all` infinite loop on zero-length matches
- Typechecker crash on spread entries in MapLiteral
- IR crash when ForStmt variable is a destructure target
- Formatter missing cases for SpreadExpr, OptionalMemberExpr, TryExpr, ConstructorPattern, MapLiteral spreads
- Linter and semantic analyzer ForStmt + MapLiteral spread crashes

**Stdlib fixes:**
- `regex.arc escape()` — replaced nonexistent `each()` call with for loop
- `result.arc try_fn()` — now delegates to native try/catch instead of broken `Ok(f())`

**Added:**
- Result type builtins: Ok, Err, is_ok, is_err, unwrap, unwrap_or, map_result
- Default params, rest params, destructuring support
- 78 new native stdlib tests (vitest)
- `examples/learn/` — 5 learning-focused example files
- `showcase/news-digest/` — full news aggregator project

## [0.5.5] — 2026-02-16

### Fixed — 16 Bug Fixes (Deep Audit Round 3)

**Lexer (1 fix):**
- Number literal no longer consumes dot for member access (`42.x` now correctly lexes as int + dot + ident)

**Parser (1 fix):**
- `not` operator precedence lowered to below comparisons (`not x == 5` now correctly parses as `not (x == 5)`)

**Interpreter (2 fixes):**
- Pipeline operator now catches `ReturnSignal` from user-defined functions using `ret`
- `zip` with mismatched-length arrays now truncates instead of leaking `undefined`

**Semantic Analyzer (1 fix):**
- `ret` statements now analyzed for undefined variables (was silently skipping)

**IR Generator (2 fixes):**
- Map literal expression keys now properly lowered (were silently replaced with empty string)
- `AsyncExpr` now saves/restores `scopeStack` (was corrupting outer scope)

**Codegen (1 fix):**
- `println` builtin now has runtime implementation and emitCall routing

**Security (1 fix):**
- Timeout now checked for programs under 1000 execution steps

**Type Checker (3 fixes):**
- `walkExpr` now traverses all expression kinds (lambdas, calls, binaries, lists, maps, etc.)
- `DoStmt` bodies now traversed for type checking
- Match exhaustiveness warnings now apply to all subject types (not just identifiers)

**Toolchain (4 fixes):**
- CLI now wires up `build`, `test`, `new`, and all `pkg` subcommands
- REPL `:reset` now actually clears the environment
- `compareSemver` now compares pre-release tags lexically
- Package manager handles trailing slash in `github:user/` URLs

### Added
- 783 new tests (508 → 1,291 total), all passing
- 11 extended test suites covering lexer, parser, interpreter, semantic, optimizer, codegen, security, errors, formatter, linter, edge cases
- 6 new integration test files: closures, math-ops, string-ops, control-flow, advanced-match, list-ops
- 4 round-3 regression test files

## [0.5.4] — 2026-02-16

### Fixed — 25 Bug Fixes (Deep Audit Round 2)

**Interpreter & Parser (8 fixes):**
- Exponentiation `**` now right-associative (`2 ** 3 ** 2` = 512, not 64)
- Unary minus precedence fixed (`-x ** 2` = -4, not 4)
- String interpolation with expressions now works (`"{x + y}"` no longer crashes)
- `+` operator explicit string/number handling instead of JS coercion
- `nil.foo` returns nil instead of crashing
- Array patterns in match (`[a, b, c] =>`) now parse correctly
- Negative number patterns in match (`-1 =>`) now parse correctly
- Or-patterns in match (`1 | 2 =>`) now parse correctly

**Lexer, Modules & Security (8 fixes):**
- Added escape sequences: `\0`, `\r`, `\xNN`, `\uNNNN`, `\u{NNNN}`, `\{`
- Empty interpolation `"{}"` no longer crashes
- Interpolation brace counting now skips string literals
- Circular imports now produce clear error instead of silent empty exports
- **Security: `validateImport()` now checks correct `.path` property** (was checking non-existent `.module`, making import blocking completely non-functional)
- Semver comparison handles partial versions and pre-release tags without NaN
- Caret range `^0.x.y` now properly constrains minor version
- REPL brace counting now skips strings and comments

**Codegen, IR & Optimizer (9 fixes):**
- JS codegen print output now matches interpreter formatting
- Added missing builtins to codegen runtime (`upper`, `lower`, `type_of`)
- Null-safe member access in compiled output
- IR variable shadowing fixed with full scope stack and name mangling
- Match guard evaluation order fixed (pattern bindings now exist before guard runs)
- Added `fold` builtin to interpreter (was only in codegen)
- Fixed function hoisting self-reference producing undefined
- Documented: nested function closures can't capture outer params (IR architectural limitation)
- Documented: for-loop closure variable capture (shared loop variable)

## [0.5.3] — 2026-02-16

### Fixed — 11 Bug Fixes (Compiler, Stdlib, Toolchain Audit)

**Compiler (4 fixes):**
- Unterminated strings no longer silently accepted — lexer now throws proper error
- Escape sequence at EOF no longer produces "undefined" in string
- Division and modulo by zero now throw runtime error instead of returning Infinity/NaN
- `ret` keyword now fully functional — was lexed but never parsed or interpreted

**Standard Library (4 fixes):**
- `math.floor()` no longer double-floors negative numbers (`floor(-2.3)` → `-3` not `-4`)
- `math.ceil()` now correct for negative non-integers (`ceil(-2.3)` → `-2` not `-3`)
- `json._quote()` now properly escapes double quotes inside strings
- `strings.pad_left()`/`pad_right()` no longer overshoot target width with multi-char pad strings

**Toolchain (3 fixes):**
- JS codegen control flow fixed — if/else and match expressions no longer always execute last branch
- `arc build new` project templates now use valid `{}` syntax instead of unsupported `do/end`
- Formatter now respects maxLineLength for if/else expressions

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
