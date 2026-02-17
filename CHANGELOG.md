# Changelog

All notable changes to Arc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.6.2] — 2026-02-16

### Fixed — 42 Bug Fixes (Stress Test Round 2)

**Language core (5 fixes):**
- Recursion limit reduced to 2000 (catches before Node.js stack overflow)
- Negative indexing: `"hello"[-1]` → `"o"`, `[1,2,3][-1]` → `3`
- Float string index now throws TypeError
- Duplicate function parameter names now caught by parser
- String/list negative index wrapping

**JSON/CSV/Collections (11 fixes):**
- JSON: `\uXXXX` unicode escapes now parsed
- JSON: Scientific notation (`1e5`, `1.5e-3`) now parsed
- JSON: `\r` now escaped in `to_json`
- `reduce([], fn, nil)` no longer leaks JS `undefined`
- `parse_csv_headers` now uses native RFC 4180 parser
- CSV native parser no longer trims field whitespace
- `chars()` and `split("", "")` now handle emoji/surrogate pairs correctly
- `flatten()` now deep-flattens (`flat(Infinity)`)
- `factorial(171+)` returns nil instead of Infinity
- `pow()` uses O(log n) exponentiation by squaring
- `lcm()` divides before multiplying to avoid precision loss

**YAML/TOML/HTML/Log (13 fixes):**
- YAML: inline comments stripped from values
- YAML: nested flow mappings with depth-aware splitting
- YAML: `---`/`...` document separators filtered
- TOML: escaped quotes `\"` properly handled
- TOML: comment stripper fixed for `\\"`
- TOML: multiline arrays with bracket balancing
- TOML: `True`/`False` returned as strings (spec compliance)
- TOML: datetime values parsed to timestamps
- TOML: hex/octal/binary/underscore integers supported
- TOML: duplicate section headers throw error
- HTML: nested same-tag elements correctly matched
- `log.json` now respects `set_level` threshold
- `log.json` validates level parameter

**System modules (7 fixes):**
- `os.env()` renamed to `os.get_env()` to prevent shadowing `env` module
- `datetime.day_of_week` fixed for pre-1960 dates (negative modulo)
- `datetime.parse` rejects invalid dates (Feb 30 → nil)
- `os.exec` now captures stderr
- `regex.is_valid` applies ReDoS protection
- `ip_is_valid` rejects leading zeros in octets
- `parse_query` preserves repeated keys as arrays

**AI-native modules (8 fixes):**
- `crypto_hmac`/`crypto_decode_base64` nil guards
- `crypto_random_bytes(-1)` returns empty
- `store.entries()` returns proper Arc MapValue objects
- `prompt.chunk` preserves emoji/unicode (codepoint splitting)
- `token_count` counts codepoints not UTF-16 units
- `is_ok`/`is_err` now tagged — won't false-positive on arbitrary maps

## [0.6.1] — 2026-02-16

### Fixed — 51 Bug Fixes (Stress Test Audit)

**Language core (6 fixes):**
- Infinite recursion protection — call depth limit of 10,000 with clear error message
- `!` operator now works as boolean negation (was a silent no-op)
- `ret` outside function now gives clean error instead of `[object Object]`
- Arithmetic type safety — `nil * 5`, `true + 1` now throw TypeErrors
- String repeat — `"ha" * 3` → `"hahaha"` (was returning NaN)
- String indexing — `"hello"[0]` → `"h"` (was returning nil)

**Math (7 fixes):**
- `gcd(0, 0)` returns 0 instead of crashing
- `pow(0, -1)` returns nil instead of division-by-zero crash
- `pow(2, 0.5)` now delegates to native `Math.pow` for float exponents
- `ceil()` now native — fixes all negative number cases (`ceil(-2.3)` → `-2`)
- `sum()` skips non-numbers instead of string concatenation
- `pad_left`/`pad_right` with empty pad string returns original (was infinite loop)
- `chunk()` with size ≤ 0 returns empty list (was infinite loop)

**Parser/security (17 fixes):**
- **SECURITY**: `{...}` patterns in YAML/TOML/HTML no longer evaluated as Arc code
- YAML: `yes`/`no`/`on`/`off` treated as booleans, nested lists, empty values, flow mappings
- TOML: multiline strings, `inf`/`nan` floats, dotted keys, inline comments, nil stringify
- HTML: comments and DOCTYPE skipped, script/style as raw text, numeric entities decoded
- Log: invalid level names now throw error

**System modules (7 fixes):**
- **CRITICAL**: `os` module filesystem/exec ops now functional (removed broken `require()` calls)
- `regex.escape()` reimplemented as native (was always crashing)
- `datetime.format()` replaces all occurrences (was only first)
- `datetime.parse()`/`from_iso()` return nil for invalid input (was NaN)
- `time.now()` returns actual timestamp (was hardcoded to 0)
- `time.sleep()` now functional with native busy-wait
- `os.exec()` injection filter relaxed for legitimate shell operators

**AI-native modules (10 fixes):**
- `prompt.chunk()` validates size > 0 (was crash/infinite loop)
- `crypto_hash`/`crypto_encode_base64` handle nil input
- `net_url_decode` catches malformed URIs, `net_query_parse`/`net_ip_is_valid` handle nil
- Embed functions validate vector length matches
- `error_try()` validates callable argument
- Store module API cleaned up (`store.open` instead of `store.store_open`)
- `env.set(key, nil)` removes variable instead of storing `"null"`

**JSON/CSV (4 fixes):**
- `json.to_json()` outputs `null` for Infinity/NaN (was invalid JSON)
- `json.from_json("")` returns nil (was NaN)
- CSV parser reimplemented as native with RFC 4180 support (quoted fields, commas in fields)
- `parse_csv("")` returns `[]` (was `[[]]`)

## [0.6.0] — 2026-02-16

### Added — 6 New Stdlib Modules (27 total)

**Expanded math module (25 functions, up from 7):**
- Trig: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`
- Log/Exp: `log`, `log2`, `log10`, `exp`
- Roots: `cbrt`, `hypot`
- Combinatorics: `factorial`, `gcd`, `lcm`
- Utility: `sign`, `round`, `sum`, `product`, `degrees`, `radians`
- Constants: `TAU`

**New modules:**
- **`yaml`** — Parse and stringify YAML (nested maps, lists, block scalars)
- **`toml`** — Parse and stringify TOML (sections, array of tables, inline tables)
- **`html`** — Parse HTML, CSS selectors (tag, .class, #id), text extraction, rendering
- **`path`** — Path manipulation (join, dirname, basename, extname, resolve, normalize)
- **`env`** — Environment variables (get, set, remove, has, list, require)
- **`log`** — Structured logging with levels, ANSI colors, child loggers, JSON output

All parsers implemented in pure JS (zero npm dependencies).

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
