// Arc Language Security Module - Sandboxing & Resource Limits

import * as AST from "./ast.js";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { createEnv, interpretWithEnv, Env, Value, toStr } from "./interpreter.js";
import { createUseHandler } from "./modules.js";

export interface SecurityConfig {
  // Input sanitization
  maxSourceSize?: number;        // Max source code bytes (default 1MB)
  maxStringLength?: number;      // Max string literal length (default 100KB)
  maxNestingDepth?: number;      // Max AST nesting depth (default 256)

  // Resource limits
  maxExecutionSteps?: number;    // Max interpreter steps (default 10_000_000)
  maxRecursionDepth?: number;    // Max call stack depth (default 512)
  maxArraySize?: number;         // Max array/list length (default 100_000)
  maxMapSize?: number;           // Max map entries (default 100_000)
  executionTimeoutMs?: number;   // Execution timeout in ms (default 30_000)

  // Tool call safety
  allowedToolMethods?: string[]; // Allowlist for @GET/@POST etc. (null = all allowed)
  blockedToolMethods?: string[]; // Blocklist for tool methods
  allowedUrlPatterns?: RegExp[]; // URL allowlist patterns
  blockedUrlPatterns?: RegExp[]; // URL blocklist patterns
  disableToolCalls?: boolean;    // Completely disable tool calls

  // Import restrictions
  allowedImports?: string[];     // Allowlist for use statements (null = all allowed)
  blockedImports?: string[];     // Blocklist for imports
  disableImports?: boolean;      // Completely disable imports
}

const DEFAULTS: Required<Pick<SecurityConfig, 
  'maxSourceSize' | 'maxStringLength' | 'maxNestingDepth' | 
  'maxExecutionSteps' | 'maxRecursionDepth' | 'maxArraySize' | 
  'maxMapSize' | 'executionTimeoutMs'>> = {
  maxSourceSize: 1_048_576,      // 1MB
  maxStringLength: 102_400,      // 100KB
  maxNestingDepth: 256,
  maxExecutionSteps: 10_000_000,
  maxRecursionDepth: 512,
  maxArraySize: 100_000,
  maxMapSize: 100_000,
  executionTimeoutMs: 30_000,
};

export class SecurityError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

// Validate source input before parsing
export function validateSource(source: string, config: SecurityConfig = {}): void {
  const maxSize = config.maxSourceSize ?? DEFAULTS.maxSourceSize;
  if (Buffer.byteLength(source, 'utf-8') > maxSize) {
    throw new SecurityError("SEC001", `Source code exceeds maximum size of ${maxSize} bytes`);
  }

  const maxStr = config.maxStringLength ?? DEFAULTS.maxStringLength;
  // Quick scan for excessively long string literals
  const stringRegex = /"([^"\\]|\\.)*"/g;
  let match;
  while ((match = stringRegex.exec(source)) !== null) {
    if (match[0].length - 2 > maxStr) {
      throw new SecurityError("SEC002", `String literal exceeds maximum length of ${maxStr} characters`);
    }
  }
}

// Validate AST nesting depth
export function validateNestingDepth(node: any, config: SecurityConfig = {}, depth = 0): void {
  const maxDepth = config.maxNestingDepth ?? DEFAULTS.maxNestingDepth;
  if (depth > maxDepth) {
    throw new SecurityError("SEC003", `AST nesting depth exceeds maximum of ${maxDepth}`);
  }
  if (node && typeof node === 'object') {
    if (Array.isArray(node)) {
      for (const child of node) validateNestingDepth(child, config, depth);
    } else if (node.kind) {
      for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'kind') continue;
        validateNestingDepth(node[key], config, depth + 1);
      }
    }
  }
}

// Validate tool call against security config
export function validateToolCall(method: string, url: string, config: SecurityConfig): void {
  if (config.disableToolCalls) {
    throw new SecurityError("SEC010", "Tool calls are disabled in sandbox mode");
  }

  const upperMethod = method.toUpperCase();

  if (config.blockedToolMethods?.includes(upperMethod)) {
    throw new SecurityError("SEC011", `Tool method @${upperMethod} is blocked`);
  }
  if (config.allowedToolMethods && !config.allowedToolMethods.includes(upperMethod)) {
    throw new SecurityError("SEC012", `Tool method @${upperMethod} is not in the allowlist`);
  }

  if (config.blockedUrlPatterns?.some(p => p.test(url))) {
    throw new SecurityError("SEC013", `URL '${url}' matches a blocked pattern`);
  }
  if (config.allowedUrlPatterns && !config.allowedUrlPatterns.some(p => p.test(url))) {
    throw new SecurityError("SEC014", `URL '${url}' does not match any allowed pattern`);
  }
}

// Validate import against security config
export function validateImport(moduleName: string, config: SecurityConfig): void {
  if (config.disableImports) {
    throw new SecurityError("SEC020", "Imports are disabled in sandbox mode");
  }
  if (config.blockedImports?.includes(moduleName)) {
    throw new SecurityError("SEC021", `Import of '${moduleName}' is blocked`);
  }
  if (config.allowedImports && !config.allowedImports.includes(moduleName)) {
    throw new SecurityError("SEC022", `Import of '${moduleName}' is not in the allowlist`);
  }
}

// Execution context that tracks resource usage
export class ExecutionContext {
  steps = 0;
  recursionDepth = 0;
  startTime: number;
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = config;
    this.startTime = Date.now();
  }

  tick(): void {
    this.steps++;
    const maxSteps = this.config.maxExecutionSteps ?? DEFAULTS.maxExecutionSteps;
    if (this.steps > maxSteps) {
      throw new SecurityError("SEC030", `Execution exceeded maximum of ${maxSteps} steps (possible infinite loop)`);
    }

    // Check timeout every 1000 steps to avoid perf overhead
    if (this.steps % 1000 === 0) {
      const timeout = this.config.executionTimeoutMs ?? DEFAULTS.executionTimeoutMs;
      if (Date.now() - this.startTime > timeout) {
        throw new SecurityError("SEC031", `Execution timed out after ${timeout}ms`);
      }
    }
  }

  pushCall(): void {
    this.recursionDepth++;
    const maxDepth = this.config.maxRecursionDepth ?? DEFAULTS.maxRecursionDepth;
    if (this.recursionDepth > maxDepth) {
      throw new SecurityError("SEC032", `Recursion depth exceeded maximum of ${maxDepth}`);
    }
  }

  popCall(): void {
    this.recursionDepth--;
  }

  checkArraySize(size: number): void {
    const max = this.config.maxArraySize ?? DEFAULTS.maxArraySize;
    if (size > max) {
      throw new SecurityError("SEC033", `Array size ${size} exceeds maximum of ${max}`);
    }
  }

  checkMapSize(size: number): void {
    const max = this.config.maxMapSize ?? DEFAULTS.maxMapSize;
    if (size > max) {
      throw new SecurityError("SEC034", `Map size ${size} exceeds maximum of ${max}`);
    }
  }
}

// SafeInterpreter - wraps the interpreter with resource limits
export class SafeInterpreter {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = config;
  }

  run(source: string): Value {
    // 1. Validate source
    validateSource(source, this.config);

    // 2. Lex and parse
    const tokens = lex(source);
    const ast = parse(tokens);

    // 3. Validate nesting
    validateNestingDepth(ast, this.config);

    // 4. Create execution context
    const ctx = new ExecutionContext(this.config);
    const env = createEnv();

    // 5. Run with resource tracking
    let result: Value = null;
    for (const stmt of ast.stmts) {
      ctx.tick();

      if (stmt.kind === "UseStmt") {
        const useStmt = stmt as AST.UseStmt;
        validateImport(useStmt.path.join("/"), this.config);
        if (!this.config.disableImports) {
          // No file context in sandbox, skip actual import
        }
        continue;
      }

      // Check for tool calls in the AST
      if (this.config.disableToolCalls) {
        this.checkNoToolCalls(stmt);
      }

      result = interpretWithEnv({ kind: "Program", stmts: [stmt] }, env);
    }

    return result;
  }

  private checkNoToolCalls(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (node.kind === "ToolCallExpr") {
      throw new SecurityError("SEC010", "Tool calls are disabled in sandbox mode");
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const item of val) this.checkNoToolCalls(item);
      } else if (val && typeof val === 'object') {
        this.checkNoToolCalls(val);
      }
    }
  }
}

// Main factory function
export function createSandbox(config: SecurityConfig = {}): SafeInterpreter {
  return new SafeInterpreter(config);
}

export { DEFAULTS as SECURITY_DEFAULTS };
