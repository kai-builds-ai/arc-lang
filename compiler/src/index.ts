#!/usr/bin/env node
// Arc Language CLI Entry Point

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { interpret } from "./interpreter.js";
import { createUseHandler } from "./modules.js";
import { generateIR, printIR } from "./ir.js";
import { analyze } from "./semantic.js";
import { optimize, optimizeWithBatching, formatOptInstr } from "./optimizer.js";
import { generateJS } from "./codegen-js.js";
import { generateWAT } from "./codegen.js";
import { format } from "./formatter.js";
import { lint, formatDiagnostic } from "./linter.js";

import { printVersion, ARC_VERSION } from "./version.js";
import { prettyPrintError, setPrettyErrors } from "./errors.js";

const args = process.argv.slice(2);
if (args.includes("--no-pretty-errors")) setPrettyErrors(false);
const command = args[0];
const file = args[1];
const target = args.find(a => a.startsWith("--target="))?.split("=")[1] ?? "js";

if (command === "version" || args.includes("--version") || args.includes("-v")) {
  printVersion();
  process.exit(0);
} else if (command === "bench") {
  const benchArgs = args.slice(1);
  if (benchArgs.includes("--tokens")) {
    // @ts-ignore - benchmarks outside rootDir
    import("../benchmarks/token-efficiency.js");
  } else {
    // @ts-ignore - benchmarks outside rootDir
    import("../benchmarks/bench.js");
  }
} else if (command === "repl") {
  import("./repl.js");
} else if (command === "fuzz") {
  const iterArg = args.find(a => a.startsWith("--iterations="));
  const iterations = iterArg ? parseInt(iterArg.split("=")[1]) : 1000;
  // @ts-ignore - tests outside rootDir
  import("../../tests/fuzz/fuzzer.js").then(({ runFuzzer, fuzzReport }: any) => {
    console.log(`Running fuzzer with ${iterations} iterations...`);
    const result = runFuzzer(iterations);
    fuzzReport(result);
    if (result.crashes.length > 0) process.exit(1);
  });
} else if (!command || !file) {
  console.log("Usage:");
  console.log("  npx tsx src/index.ts run <file.arc>   - Execute an Arc file");
  console.log("  npx tsx src/index.ts parse <file.arc>  - Print the AST");
  console.log("  npx tsx src/index.ts ir <file.arc>     - Print the IR");
  console.log("  npx tsx src/index.ts opt <file.arc>    - Print optimized IR");
  console.log("  npx tsx src/index.ts compile <file.arc> - Compile to JS (or --target=wat)");
  console.log("  npx tsx src/index.ts check <file.arc>  - Run semantic analysis");
  console.log("  npx tsx src/index.ts fmt <file.arc>    - Format source code");
  console.log("  npx tsx src/index.ts lint <file.arc>   - Lint source code");
  console.log("  npx tsx src/index.ts repl              - Start interactive REPL");
  console.log("  npx tsx src/index.ts fuzz [--iterations=N] - Fuzz test the language");
  console.log("  npx tsx src/index.ts bench             - Run performance benchmarks");
  console.log("  npx tsx src/index.ts bench --tokens    - Run token efficiency comparison");
  process.exit(1);
} else {

const filePath = resolve(file);
let source: string;
try {
  source = readFileSync(filePath, "utf-8");
} catch {
  console.error(`Error: Cannot read file '${filePath}'`);
  process.exit(1);
}

try {
  if (command === "fmt") {
    const formatted = format(source);
    if (args.includes("--write")) {
      writeFileSync(filePath, formatted);
      console.log(`Formatted ${filePath}`);
    } else {
      process.stdout.write(formatted);
    }
  } else if (command === "lint") {
    const diagnostics = lint(source, { file: filePath });
    if (diagnostics.length === 0) {
      console.log("No lint issues found.");
    } else {
      for (const d of diagnostics) {
        console.log(formatDiagnostic(d));
      }
      const warnings = diagnostics.filter(d => d.severity === "warning");
      const errors = diagnostics.filter(d => d.severity === "error");
      console.log(`\n${diagnostics.length} issue(s): ${errors.length} error(s), ${warnings.length} warning(s), ${diagnostics.length - errors.length - warnings.length} info`);
      if (errors.length > 0) process.exit(1);
    }
  } else {
    const tokens = lex(source);
    const ast = parse(tokens);

    if (command === "parse") {
      console.log(JSON.stringify(ast, null, 2));
    } else if (command === "check") {
      const diagnostics = analyze(ast);
      if (diagnostics.length === 0) {
        console.log("No issues found.");
      } else {
        for (const d of diagnostics) {
          const prefix = d.level === "error" ? "ERROR" : "WARN";
          console.log(`[${prefix}] Line ${d.loc.line}:${d.loc.col} — ${d.message}`);
        }
        const errors = diagnostics.filter(d => d.level === "error");
        if (errors.length > 0) process.exit(1);
      }
    } else if (command === "ir") {
      const irModule = generateIR(ast);
      const useOpt = args.includes("--optimize");
      if (useOpt) {
        const optimized = optimize(irModule);
        console.log(printIR(optimized));
      } else {
        console.log(printIR(irModule));
      }
    } else if (command === "opt") {
      const irModule = generateIR(ast);
      const optimized = optimize(irModule);
      console.log(printIR(optimized));
    } else if (command === "compile") {
      const irModule = generateIR(ast);
      if (target === "wat") {
        console.log(generateWAT(irModule));
      } else {
        console.log(generateJS(irModule));
      }
    } else if (command === "run") {
      interpret(ast, createUseHandler(filePath));
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  }
} catch (e: any) {
  console.error(e.message);
  process.exit(1);
}
}
