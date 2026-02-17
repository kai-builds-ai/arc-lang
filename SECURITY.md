# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x:                |

Arc is pre-release software. Security patches are applied to the latest minor version only.

## Reporting a Vulnerability

**Please do not open public issues for security vulnerabilities.**

Email security reports to: **nebula7458@proton.me**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment (if possible)

You should receive an acknowledgment within 72 hours. We'll work with you on a fix before any public disclosure.

## Security Features

Arc includes several built-in protections, primarily through the `SafeInterpreter` sandbox and runtime checks.

### SafeInterpreter Sandbox

The `SafeInterpreter` (`createSandbox()`) wraps the interpreter with configurable resource limits:

| Resource              | Default Limit |
| --------------------- | ------------- |
| Source code size       | 1 MB          |
| String literal length  | 100 KB        |
| AST nesting depth      | 256           |
| Execution steps        | 10,000,000    |
| Recursion depth        | 512           |
| Array size             | 100,000       |
| Map size               | 100,000       |
| Execution timeout      | 30 seconds    |

All limits are configurable via `SecurityConfig`.

### Import Control

- Imports can be restricted via allowlists (`allowedImports`) or blocklists (`blockedImports`)
- Imports can be completely disabled (`disableImports: true`)

### Tool Call Restrictions

- Tool calls (HTTP requests via `@GET`, `@POST`, etc.) can be disabled entirely (`disableToolCalls: true`)
- Method-level allowlists/blocklists (`allowedToolMethods`, `blockedToolMethods`)
- URL pattern allowlists/blocklists (`allowedUrlPatterns`, `blockedUrlPatterns`)

### Command Injection Protection

`os.exec` rejects commands containing shell metacharacters:
- `;`, `&`, `|` (command chaining)
- Backticks, `$()` (command substitution)
- `>>`, `<<` (redirection)
- `eval`, `source` keywords

Commands that fail this check throw a `SecurityError` and are never executed.

### os.exec Timeout

All `os.exec` calls have a hard 10-second timeout to prevent hanging processes.

### ReDoS Protection

`regex_new()` rejects patterns with nested quantifiers (e.g., `(a+)+`, `(a*)*`) that can cause catastrophic backtracking.

## Known Limitations

- **Pre-release software** — Arc has not undergone a formal security audit.
- **No filesystem sandbox** — `os.*` file operations (`read`, `write`, `remove`, `mkdir`, etc.) have no path restrictions outside of the sandbox. The `SafeInterpreter` disables imports but does not restrict native file I/O functions available in the base environment.
- **No network sandbox** — Outside the `SafeInterpreter`, HTTP tool calls (`@GET`, `@POST`) are unrestricted.
- **os.exec exists** — Even with injection protection, `os.exec` runs real system commands. The regex-based filter may not catch all attack vectors.
- **No memory limits** — There is no hard memory cap; sufficiently large allocations within step limits can still exhaust system memory.
- **Synchronous execution** — The interpreter is single-threaded and blocking, which limits but does not eliminate denial-of-service risks.

## Best Practices for Running Untrusted Code

1. **Always use `createSandbox()`** with explicit limits:
   ```typescript
   import { createSandbox } from "arc/security";

   const sandbox = createSandbox({
     disableToolCalls: true,
     disableImports: true,
     maxExecutionSteps: 1_000_000,
     executionTimeoutMs: 5_000,
   });

   sandbox.run(untrustedSource);
   ```

2. **Disable tool calls and imports** for untrusted input — these are the largest attack surface.

3. **Lower resource limits** based on your use case. The defaults are generous; tighten them.

4. **Do not expose `os.exec`** to untrusted code. Even with injection protection, it runs real commands.

5. **Run in an isolated environment** (container, VM) when executing code from untrusted sources.
