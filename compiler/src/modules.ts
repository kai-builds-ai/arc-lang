// Arc Module Resolver and Loader

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { createEnv, runStmt, Env, Value } from "./interpreter.js";
import type * as AST from "./ast.js";

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = dirname(__filename2);

export interface ModuleExports {
  [name: string]: Value;
}

const moduleCache = new Map<string, ModuleExports>();
const modulesInProgress = new Set<string>();

export function clearModuleCache(): void {
  moduleCache.clear();
  modulesInProgress.clear();
}

/**
 * Resolve a module path to a file path.
 * Search order: stdlib/ first (searching upward), then relative to basePath.
 * This prevents test files from shadowing stdlib modules.
 */
export function resolveModule(path: string[], basePath: string): string {
  const modulePath = path.join("/") + ".arc";

  // 1. Search up from basePath for a stdlib/ directory (stdlib takes priority)
  let dir = dirname(basePath);
  for (let i = 0; i < 10; i++) {
    const stdlibPath = resolve(dir, "stdlib", modulePath);
    if (existsSync(stdlibPath)) return stdlibPath;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // 2. Relative to current file's directory
  const relPath = resolve(dirname(basePath), modulePath);
  if (existsSync(relPath)) return relPath;

  // 3. Check compiler's sibling stdlib/
  const compilerStdlib = resolve(__dirname2, "..", "..", "stdlib", modulePath);
  if (existsSync(compilerStdlib)) return compilerStdlib;

  throw new Error(`Module not found: ${path.join("/")} (searched from ${basePath})`);
}

/**
 * Load a module, parse it, execute it, and return its pub exports.
 */
export function loadModule(filePath: string): ModuleExports {
  const absPath = resolve(filePath);

  // Detect circular imports — check before cache since cache is pre-populated with {}
  if (modulesInProgress.has(absPath)) {
    throw new Error(`Circular import detected: ${absPath}`);
  }

  if (moduleCache.has(absPath)) {
    return moduleCache.get(absPath)!;
  }

  modulesInProgress.add(absPath);

  // Pre-populate cache to handle any remaining edge cases
  moduleCache.set(absPath, {});

  const source = readFileSync(absPath, "utf-8");
  const tokens = lex(source);
  const ast = parse(tokens);
  const env = createEnv();

  // Execute the module, handling nested use statements
  for (const stmt of ast.stmts) {
    if (stmt.kind === "UseStmt") {
      handleUse(stmt as AST.UseStmt, env, absPath);
    } else {
      runStmt(stmt, env);
    }
  }

  // Collect pub exports
  const exports: ModuleExports = {};
  for (const stmt of ast.stmts) {
    if (stmt.kind === "LetStmt") {
      const ls = stmt as AST.LetStmt;
      if (ls.pub && typeof ls.name === "string") {
        exports[ls.name] = env.get(ls.name);
      }
    } else if (stmt.kind === "FnStmt") {
      const fs = stmt as AST.FnStmt;
      if (fs.pub) {
        exports[fs.name] = env.get(fs.name);
      }
    }
  }

  moduleCache.set(absPath, exports);
  modulesInProgress.delete(absPath);
  return exports;
}

/**
 * Handle a use statement: resolve, load, and bind imports into env.
 */
export function handleUse(stmt: AST.UseStmt, env: Env, currentFile: string): void {
  const modulePath = resolveModule(stmt.path, currentFile);
  const exports = loadModule(modulePath);

  if (stmt.wildcard) {
    for (const [name, value] of Object.entries(exports)) {
      env.set(name, value);
    }
  } else if (stmt.imports && stmt.imports.length > 0) {
    for (const name of stmt.imports) {
      if (!(name in exports)) {
        throw new Error(`Module ${stmt.path.join("/")} does not export '${name}'`);
      }
      env.set(name, exports[name]);
    }
  } else {
    // No selective imports: bind all exports
    for (const [name, value] of Object.entries(exports)) {
      env.set(name, value);
    }
  }
}

/**
 * Create a UseHandler bound to a specific file path.
 */
export function createUseHandler(currentFile: string) {
  return (stmt: AST.UseStmt, env: Env) => handleUse(stmt, env, currentFile);
}
