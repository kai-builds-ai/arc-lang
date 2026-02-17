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
import { optimize } from "./optimizer.js";
import { generateJS } from "./codegen-js.js";
import { generateWAT } from "./codegen.js";
import { format } from "./formatter.js";
import { lint, formatDiagnostic } from "./linter.js";
import { printVersion, ARC_VERSION } from "./version.js";
import { prettyPrintError, setPrettyErrors } from "./errors.js";
import { build, test as buildTest, newProject } from "./build.js";
import { pkgInit, pkgAdd, pkgRemove, pkgList, pkgInstall } from "./package-manager.js";
const args = process.argv.slice(2);
if (args.includes("--no-pretty-errors"))
    setPrettyErrors(false);
const command = args[0];
const file = args[1];
const target = args.find(a => a.startsWith("--target="))?.split("=")[1] ?? "js";
if (command === "version" || args.includes("--version") || args.includes("-v")) {
    printVersion();
    process.exit(0);
}
else if (command === "bench") {
    const benchArgs = args.slice(1);
    if (benchArgs.includes("--tokens")) {
        // @ts-ignore - benchmarks outside rootDir
        import("../benchmarks/token-efficiency.js");
    }
    else {
        // @ts-ignore - benchmarks outside rootDir
        import("../benchmarks/bench.js");
    }
}
else if (command === "repl") {
    import("./repl.js");
}
else if (command === "fuzz") {
    const iterArg = args.find(a => a.startsWith("--iterations="));
    const iterations = iterArg ? parseInt(iterArg.split("=")[1]) : 1000;
    // @ts-ignore - tests outside rootDir
    import("../../tests/fuzz/fuzzer.js").then(({ runFuzzer, fuzzReport }) => {
        console.log(`Running fuzzer with ${iterations} iterations...`);
        const result = runFuzzer(iterations);
        fuzzReport(result);
        if (result.crashes.length > 0)
            process.exit(1);
    });
}
else if (command === "build") {
    const targetArg = args.find(a => a.startsWith("--target="))?.split("=")[1];
    build({ target: targetArg, dir: process.cwd() });
}
else if (command === "test") {
    buildTest(process.cwd());
}
else if (command === "new") {
    const name = args[1];
    if (!name) {
        console.error("Usage: arc new <project-name>");
        process.exit(1);
    }
    newProject(name);
}
else if (command === "pkg") {
    const sub = args[1];
    if (sub === "init") {
        pkgInit();
    }
    else if (sub === "add") {
        const pkg = args[2];
        if (!pkg) {
            console.error("Usage: arc pkg add <package>");
            process.exit(1);
        }
        const dev = args.includes("--dev");
        pkgAdd(pkg, { dev });
    }
    else if (sub === "remove") {
        const pkg = args[2];
        if (!pkg) {
            console.error("Usage: arc pkg remove <package>");
            process.exit(1);
        }
        pkgRemove(pkg);
    }
    else if (sub === "list") {
        pkgList();
    }
    else if (sub === "install") {
        pkgInstall();
    }
    else {
        console.error("Usage: arc pkg <init|add|remove|list|install>");
        process.exit(1);
    }
}
else if (command === "help" || command === "--help" || command === "-h" || !command || !file) {
    console.log(`Arc ${ARC_VERSION} — A programming language designed by AI agents, for AI agents.\n`);
    console.log("Usage: arc <command> [options]\n");
    console.log("Commands:");
    console.log("  run <file.arc>          Execute an Arc file");
    console.log("  parse <file.arc>        Print the AST");
    console.log("  ir <file.arc>           Print the IR");
    console.log("  opt <file.arc>          Print optimized IR");
    console.log("  compile <file.arc>      Compile to JS (or --target=wat)");
    console.log("  check <file.arc>        Run semantic analysis");
    console.log("  fmt <file.arc>          Format source code (--write to overwrite)");
    console.log("  lint <file.arc>         Lint source code");
    console.log("  repl                    Start interactive REPL");
    console.log("  build                   Build the current project");
    console.log("  test                    Run project tests");
    console.log("  new <name>              Create a new project");
    console.log("  pkg <sub>               Package manager (init|add|remove|list|install)");
    console.log("  version                 Print version info");
    console.log("\nOptions:");
    console.log("  --version, -v           Print version");
    console.log("  --help, -h              Show this help");
    console.log("  --no-pretty-errors      Disable pretty error formatting");
    if (!command || (command !== "help" && command !== "--help" && command !== "-h"))
        process.exit(1);
    else
        process.exit(0);
}
else {
    const filePath = resolve(file);
    let source;
    try {
        source = readFileSync(filePath, "utf-8");
    }
    catch {
        console.error(`Error: Cannot read file '${filePath}'`);
        process.exit(1);
    }
    try {
        if (command === "fmt") {
            const formatted = format(source);
            if (args.includes("--write")) {
                writeFileSync(filePath, formatted);
                console.log(`Formatted ${filePath}`);
            }
            else {
                process.stdout.write(formatted);
            }
        }
        else if (command === "lint") {
            const diagnostics = lint(source, { file: filePath });
            if (diagnostics.length === 0) {
                console.log("No lint issues found.");
            }
            else {
                for (const d of diagnostics) {
                    console.log(formatDiagnostic(d));
                }
                const warnings = diagnostics.filter(d => d.severity === "warning");
                const errors = diagnostics.filter(d => d.severity === "error");
                console.log(`\n${diagnostics.length} issue(s): ${errors.length} error(s), ${warnings.length} warning(s), ${diagnostics.length - errors.length - warnings.length} info`);
                if (errors.length > 0)
                    process.exit(1);
            }
        }
        else {
            const tokens = lex(source);
            const ast = parse(tokens);
            if (command === "parse") {
                console.log(JSON.stringify(ast, null, 2));
            }
            else if (command === "check") {
                const diagnostics = analyze(ast);
                if (diagnostics.length === 0) {
                    console.log("No issues found.");
                }
                else {
                    for (const d of diagnostics) {
                        const prefix = d.level === "error" ? "ERROR" : "WARN";
                        console.log(`[${prefix}] Line ${d.loc.line}:${d.loc.col} — ${d.message}`);
                    }
                    const errors = diagnostics.filter(d => d.level === "error");
                    if (errors.length > 0)
                        process.exit(1);
                }
            }
            else if (command === "ir") {
                const irModule = generateIR(ast);
                const useOpt = args.includes("--optimize");
                if (useOpt) {
                    const optimized = optimize(irModule);
                    console.log(printIR(optimized));
                }
                else {
                    console.log(printIR(irModule));
                }
            }
            else if (command === "opt") {
                const irModule = generateIR(ast);
                const optimized = optimize(irModule);
                console.log(printIR(optimized));
            }
            else if (command === "compile") {
                const irModule = generateIR(ast);
                if (target === "wat") {
                    console.log(generateWAT(irModule));
                }
                else {
                    console.log(generateJS(irModule));
                }
            }
            else if (command === "run") {
                interpret(ast, createUseHandler(filePath));
            }
            else {
                console.error(`Unknown command: ${command}`);
                process.exit(1);
            }
        }
    }
    catch (e) {
        if (e instanceof Error) {
            console.error(prettyPrintError(e, source, true, filePath));
        }
        else {
            console.error(e.message ?? String(e));
        }
        process.exit(1);
    }
}
