/**
 * JavaScript → Arc Migration Tool
 * 
 * Best-effort automated migration from JavaScript/TypeScript to Arc.
 * Usage: npx tsx tools/migrate-js.ts <input.js> [output.arc]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export function migrateJS(source: string): string {
  let lines = source.split("\n");
  let result: string[] = [];

  for (let line of lines) {
    line = transformLine(line);
    result.push(line);
  }

  let output = result.join("\n");

  // Multi-pass transforms on the full text
  output = transformChains(output);

  return output;
}

function transformLine(line: string): string {
  const indent = line.match(/^(\s*)/)?.[1] ?? "";
  let l = line;

  // Comments: // → # (but not URLs like http://)
  l = l.replace(/(?<!:)\/\/(.*)$/gm, (_, comment) => `#${comment}`);

  // Block comment opening/closing
  l = l.replace(/\/\*\*/g, "#");
  l = l.replace(/\/\*/g, "#");
  l = l.replace(/\*\//g, "");
  l = l.replace(/^\s*\*\s?/gm, (match) => indent + "# ");

  // export async function → pub async fn
  l = l.replace(/\bexport\s+async\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, "pub async fn $1($2) {");
  // export function → pub fn
  l = l.replace(/\bexport\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, "pub fn $1($2) {");
  // export const → pub let
  l = l.replace(/\bexport\s+const\s+/g, "pub let ");
  // export let → pub let mut
  l = l.replace(/\bexport\s+let\s+/g, "pub let mut ");
  // export default → pub let  # TODO: manual review
  l = l.replace(/\bexport\s+default\s+/g, "pub let # TODO: manual review\n");

  // async function → async fn
  l = l.replace(/\basync\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, "async fn $1($2) {");
  // function → fn
  l = l.replace(/\bfunction\s+(\w+)\s*\(([^)]*)\)\s*\{/g, "fn $1($2) {");

  // Simple arrow functions: const foo = (x) => x + 1
  l = l.replace(/\b(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g, "fn $1($2) {");
  l = l.replace(/\b(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*(.+)/g, "fn $1($2) => $3");
  // Single param arrow: const foo = x => x + 1
  l = l.replace(/\b(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>\s*\{/g, "fn $1($2) {");
  l = l.replace(/\b(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\s*=>\s*(.+)/g, "fn $1($2) => $3");

  // Variable declarations: use placeholder to avoid conflicts
  // 1. const → let (immutable in Arc)
  l = l.replace(/\bconst\s+/g, "\x00ARCLET\x00 ");
  // 2. var/let → let mut (mutable in Arc)
  l = l.replace(/\bvar\s+/g, "let mut ");
  l = l.replace(/(?<!pub )\blet\s+(?!mut\b)/g, "let mut ");
  // 3. Restore placeholder
  l = l.replace(/\x00ARCLET\x00 /g, "let ");

  // import { foo } from './bar' → use "./bar"
  l = l.replace(/\bimport\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]\s*;?/g, 'use "$1"');
  // import foo from './bar' → use "./bar"
  l = l.replace(/\bimport\s+\w+\s+from\s+['"]([^'"]+)['"]\s*;?/g, 'use "$1"');
  // import './bar' → use "./bar"
  l = l.replace(/\bimport\s+['"]([^'"]+)['"]\s*;?/g, 'use "$1"');
  // require → use  # TODO: manual review
  l = l.replace(/\b(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)\s*;?/g, 'use "$2" # TODO: manual review');

  // } else if (...) { → } el if ... { (must be before if transform)
  l = l.replace(/\}\s*else\s+if\s*\((.+?)\)\s*\{/g, "} el if $1 {");
  l = l.replace(/\belse\s+if\s*\((.+?)\)\s*\{/g, "} el if $1 {");
  // } else { → } el {
  l = l.replace(/\}\s*else\s*\{/g, "} el {");
  l = l.replace(/\belse\s*\{/g, "} el {");
  // if (...) { → if ... {
  l = l.replace(/\bif\s*\((.+?)\)\s*\{/g, "if $1 {");

  // switch → match  # TODO: manual review
  l = l.replace(/\bswitch\s*\((.+?)\)\s*\{/g, "match $1 { # TODO: manual review");

  // return → ret
  l = l.replace(/\breturn\b/g, "ret");

  // console.log → print
  l = l.replace(/\bconsole\.log\b/g, "print");
  l = l.replace(/\bconsole\.error\b/g, "print");
  l = l.replace(/\bconsole\.warn\b/g, "print");

  // null/undefined → nil
  l = l.replace(/\bnull\b/g, "nil");
  l = l.replace(/\bundefined\b/g, "nil");

  // === → ==, !== → !=
  l = l.replace(/===/g, "==");
  l = l.replace(/!==/g, "!=");

  // Logical operators
  l = l.replace(/&&/g, " and ");
  l = l.replace(/\|\|/g, " or ");
  l = l.replace(/(?<!=\s)!(?!=)(?!\w*\()/g, "not ");

  // Remove semicolons at end of line
  l = l.replace(/;\s*$/g, "");

  // Remove type annotations (simple cases)
  l = l.replace(/:\s*(string|number|boolean|any|void|never|unknown)\b/g, "");
  l = l.replace(/:\s*(string|number|boolean|any)\[\]/g, "");

  // Clean up double spaces
  l = l.replace(/  +/g, " ");

  return l;
}

function transformChains(source: string): string {
  // Transform method chains like .map(...).filter(...).reduce(...)
  // into pipeline |> chains
  // This is a simplified best-effort transform
  let result = source;

  // Simple .map/.filter/.reduce with arrow functions
  // e.g., arr.map(x => x + 1).filter(x => x > 2)
  // → arr |> map(x => x + 1) |> filter(x => x > 2)
  result = result.replace(
    /(\w+)\.map\(([^)]+)\)\.filter\(([^)]+)\)\.reduce\(([^)]+)\)/g,
    "$1 |> map($2) |> filter($3) |> reduce($4)"
  );
  result = result.replace(
    /(\w+)\.map\(([^)]+)\)\.filter\(([^)]+)\)/g,
    "$1 |> map($2) |> filter($3)"
  );
  result = result.replace(
    /(\w+)\.filter\(([^)]+)\)\.map\(([^)]+)\)/g,
    "$1 |> filter($2) |> map($3)"
  );
  result = result.replace(
    /(\w+)\.map\(([^)]+)\)\.reduce\(([^)]+)\)/g,
    "$1 |> map($2) |> reduce($3)"
  );

  return result;
}

// CLI entry point
if (process.argv[1]?.includes("migrate-js")) {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx tools/migrate-js.ts <input.js> [output.arc]");
    process.exit(1);
  }
  const inputPath = resolve(input);
  const outputPath = process.argv[3] ? resolve(process.argv[3]) : inputPath.replace(/\.(js|ts|jsx|tsx)$/, ".arc");
  
  const source = readFileSync(inputPath, "utf-8");
  const result = migrateJS(source);
  writeFileSync(outputPath, result, "utf-8");
  console.log(`Migrated: ${inputPath} → ${outputPath}`);
}
