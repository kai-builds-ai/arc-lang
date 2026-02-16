import { Env, Value } from "./interpreter.js";
import type * as AST from "./ast.js";
export interface ModuleExports {
    [name: string]: Value;
}
export declare function clearModuleCache(): void;
/**
 * Resolve a module path to a file path.
 * Search order: stdlib/ first (searching upward), then relative to basePath.
 * This prevents test files from shadowing stdlib modules.
 */
export declare function resolveModule(path: string[], basePath: string): string;
/**
 * Load a module, parse it, execute it, and return its pub exports.
 */
export declare function loadModule(filePath: string): ModuleExports;
/**
 * Handle a use statement: resolve, load, and bind imports into env.
 */
export declare function handleUse(stmt: AST.UseStmt, env: Env, currentFile: string): void;
/**
 * Create a UseHandler bound to a specific file path.
 */
export declare function createUseHandler(currentFile: string): (stmt: AST.UseStmt, env: Env) => void;
