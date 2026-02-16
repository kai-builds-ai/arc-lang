/**
 * Python → Arc Migration Tool
 * 
 * Best-effort automated migration from Python to Arc.
 * Usage: npx tsx tools/migrate-py.ts <input.py> [output.arc]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export function migratePython(source: string): string {
  let lines = source.split("\n");
  let result: string[] = [];

  // Track indentation to add braces
  let indentStack: number[] = [0];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let transformed = transformPyLine(line, lines, i);
    result.push(transformed);
  }

  let output = result.join("\n");
  output = postProcessPython(output);
  return output;
}

function transformPyLine(line: string, allLines: string[], idx: number): string {
  const indent = line.match(/^(\s*)/)?.[1] ?? "";
  let l = line;

  // def foo(x): → fn foo(x) {
  l = l.replace(/\bdef\s+(\w+)\s*\(([^)]*)\)\s*(?:->.*)?:/g, "fn $1($2) {");

  // class → type  # TODO: manual review
  l = l.replace(/\bclass\s+(\w+).*:/g, "type $1 { # TODO: manual review");

  // if condition: → if condition {
  l = l.replace(/^(\s*)if\s+(.+?):\s*$/gm, "$1if $2 {");

  // elif → el if
  l = l.replace(/^(\s*)elif\s+(.+?):\s*$/gm, "$1} el if $2 {");

  // else: → } el {
  l = l.replace(/^(\s*)else:\s*$/gm, "$1} el {");

  // for x in range(n): → for x in 0..n {
  l = l.replace(/\bfor\s+(\w+)\s+in\s+range\((\w+)\):/g, "for $1 in 0..$2 {");
  l = l.replace(/\bfor\s+(\w+)\s+in\s+range\((\w+),\s*(\w+)\):/g, "for $1 in $2..$3 {");

  // for x in iterable: → for x in iterable {
  l = l.replace(/\bfor\s+(\w+)\s+in\s+(.+?):/g, "for $1 in $2 {");

  // while condition: → while condition {
  l = l.replace(/\bwhile\s+(.+?):/g, "while $1 {");

  // import module → use "module"
  l = l.replace(/^(\s*)import\s+(\w+)\s*$/gm, '$1use "$2"');
  // from module import ... → use "module"
  l = l.replace(/^(\s*)from\s+(\S+)\s+import\s+.*/gm, '$1use "$2"');

  // None → nil
  l = l.replace(/\bNone\b/g, "nil");

  // True → true, False → false
  l = l.replace(/\bTrue\b/g, "true");
  l = l.replace(/\bFalse\b/g, "false");

  // return → ret
  l = l.replace(/\breturn\b/g, "ret");

  // lambda x: expr → (x) => expr
  l = l.replace(/\blambda\s+([^:]+):\s*(.+)/g, "($1) => $2");

  // self. → # TODO: manual review — self.
  // We leave self references but they need manual attention
  l = l.replace(/\bself\./g, "self. # TODO: manual review\n");

  // List comprehension: [expr for x in iter] → iter |> map(fn(x) => expr)
  l = l.replace(
    /\[([^\]]+)\s+for\s+(\w+)\s+in\s+([^\]]+)\]/g,
    "$3 |> map(fn($2) => $1)"
  );

  // List comprehension with filter: [expr for x in iter if cond]
  l = l.replace(
    /\[([^\]]+)\s+for\s+(\w+)\s+in\s+([^\]]+?)\s+if\s+([^\]]+)\]/g,
    "$3 |> filter(fn($2) => $4) |> map(fn($2) => $1)"
  );

  // f-strings: f"hello {name}" → "hello {name}" (Arc supports interpolation)
  l = l.replace(/\bf"([^"]*)"/g, '"$1"');
  l = l.replace(/\bf'([^']*)'/g, '"$1"');

  // not/and/or stay the same in Arc
  // # comments stay the same

  // Remove type hints from parameters (simple)
  l = l.replace(/(\w+)\s*:\s*(int|str|float|bool|list|dict|tuple|set|Any|None|Optional)\b(?:\[.*?\])?/g, "$1");

  return l;
}

function postProcessPython(source: string): string {
  // Add closing braces where Python uses indentation
  // This is a best-effort heuristic — mark for review
  let result = source;

  // Simple pass: add } before lines that decrease indent after blocks
  // This is imperfect — add TODO markers
  if (!result.includes("}")) {
    result += "\n# TODO: manual review — add closing braces for blocks";
  }

  return result;
}

// CLI entry point
if (process.argv[1]?.includes("migrate-py")) {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx tools/migrate-py.ts <input.py> [output.arc]");
    process.exit(1);
  }
  const inputPath = resolve(input);
  const outputPath = process.argv[3] ? resolve(process.argv[3]) : inputPath.replace(/\.py$/, ".arc");
  
  const source = readFileSync(inputPath, "utf-8");
  const result = migratePython(source);
  writeFileSync(outputPath, result, "utf-8");
  console.log(`Migrated: ${inputPath} → ${outputPath}`);
}
