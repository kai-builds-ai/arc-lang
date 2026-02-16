// Arc Build System

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, join } from "path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { generateIR } from "./ir.js";
import { generateJS } from "./codegen-js.js";
import { generateWAT } from "./codegen.js";
import { interpret } from "./interpreter.js";
import { createUseHandler } from "./modules.js";
import { readToml, serializeArcToml, type ArcToml } from "./package-manager.js";

export function build(options: { target?: string; dir?: string } = {}): void {
  const dir = options.dir || process.cwd();
  const target = options.target || "js";

  let toml: ArcToml;
  try {
    toml = readToml(dir);
  } catch {
    console.error("No arc.toml found. Run 'arc pkg init' first.");
    process.exit(1);
  }

  // Find entry point
  const entryPoint = resolve(dir, "src", "main.arc");
  if (!existsSync(entryPoint)) {
    console.error("Entry point not found: src/main.arc");
    process.exit(1);
  }

  const source = readFileSync(entryPoint, "utf-8");
  const tokens = lex(source);
  const ast = parse(tokens);
  const ir = generateIR(ast);

  const distDir = resolve(dir, "dist");
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  if (target === "wat") {
    const wat = generateWAT(ir);
    const outPath = resolve(distDir, `${toml.package.name}.wat`);
    writeFileSync(outPath, wat);
    console.log(`Built ${relative(dir, outPath)}`);
  } else {
    const js = generateJS(ir);
    const outPath = resolve(distDir, `${toml.package.name}.js`);
    writeFileSync(outPath, js);
    console.log(`Built ${relative(dir, outPath)}`);
  }
}

export function run(file?: string, dir?: string): void {
  const d = dir || process.cwd();
  let filePath: string;

  if (file) {
    filePath = resolve(d, file);
  } else {
    // Use project entry point
    filePath = resolve(d, "src", "main.arc");
  }

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const source = readFileSync(filePath, "utf-8");
  const tokens = lex(source);
  const ast = parse(tokens);
  interpret(ast, createUseHandler(filePath));
}

function findArcFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findArcFiles(full, pattern));
    } else if (pattern.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

export function test(dir?: string): void {
  const d = dir || process.cwd();
  const testsDir = resolve(d, "tests");
  const testFiles = findArcFiles(testsDir, /\.arc$/);

  if (testFiles.length === 0) {
    console.log("No test files found in tests/");
    return;
  }

  let passed = 0;
  let failedCount = 0;

  for (const file of testFiles) {
    const rel = relative(d, file);
    try {
      const source = readFileSync(file, "utf-8");
      const tokens = lex(source);
      const ast = parse(tokens);
      interpret(ast, createUseHandler(file));
      console.log(`  ✓ ${rel}`);
      passed++;
    } catch (e: any) {
      console.log(`  ✗ ${rel}: ${e.message}`);
      failedCount++;
    }
  }

  console.log(`\nTests: ${passed} passed, ${failedCount} failed`);
  if (failedCount > 0) process.exit(1);
}

export function newProject(name: string, parentDir?: string): void {
  const d = parentDir || process.cwd();
  const projectDir = resolve(d, name);

  if (existsSync(projectDir)) {
    console.error(`Directory '${name}' already exists`);
    process.exit(1);
  }

  mkdirSync(resolve(projectDir, "src"), { recursive: true });
  mkdirSync(resolve(projectDir, "tests"), { recursive: true });

  const toml: ArcToml = {
    package: { name, version: "0.1.0", description: "", author: "", license: "MIT" },
    dependencies: {},
    "dev-dependencies": {},
  };
  writeFileSync(resolve(projectDir, "arc.toml"), serializeArcToml(toml));

  writeFileSync(resolve(projectDir, "src", "main.arc"), `fn main() do\n  let msg = "Hello from ${name}!"\nend\n`);

  writeFileSync(resolve(projectDir, "tests", "main.test.arc"), `fn test_main() do\n  let x = 1 + 1\nend\n`);

  writeFileSync(resolve(projectDir, "README.md"), `# ${name}\n\nAn Arc project.\n\n## Getting Started\n\n\`\`\`bash\narc build\narc run\n\`\`\`\n`);

  console.log(`Created project '${name}'`);
  console.log(`  ${name}/arc.toml`);
  console.log(`  ${name}/src/main.arc`);
  console.log(`  ${name}/tests/main.test.arc`);
  console.log(`  ${name}/README.md`);
}
