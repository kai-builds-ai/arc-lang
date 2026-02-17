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
else if (command === "builtins") {
    console.log("Arc Built-in Functions\n");
    console.log("I/O:");
    console.log("  print(...values)          Print values to stdout\n");
    console.log("Type Conversion:");
    console.log("  int(v)                    Convert to integer (throws on bad input)");
    console.log("  float(v)                  Convert to float (throws on bad input)");
    console.log("  str(v)                    Convert to string");
    console.log("  bool(v)                   Convert to boolean");
    console.log("  type_of(v)                Get type: \"int\" \"float\" \"string\" \"bool\" \"list\" \"map\" \"fn\" \"nil\"\n");
    console.log("Strings:");
    console.log("  len(s)                    Length (codepoints, not bytes)");
    console.log("  trim(s)                   Strip whitespace");
    console.log("  upper(s) / lower(s)       Case conversion");
    console.log("  split(s, sep)             Split into list");
    console.log("  join(list, sep)           Join list into string");
    console.log("  replace(s, old, new)      Replace all occurrences");
    console.log("  contains(s, sub)          Check substring");
    console.log("  starts(s, prefix)         Starts with");
    console.log("  ends(s, suffix)           Ends with");
    console.log("  repeat(s, n)              Repeat string n times");
    console.log("  chars(s)                  Split into character list");
    console.log("  slice(s, start, end?)     Substring");
    console.log("  index_of(s, sub)          Find index (nil if not found)");
    console.log("  ord(s)                    Char to code point");
    console.log("  chr(n)                    Code point to char");
    console.log("  char_at(s, i)             Character at index\n");
    console.log("Lists:");
    console.log("  len(list)                 Length");
    console.log("  map(list, fn)             Transform each element");
    console.log("  filter(list, fn)          Keep elements matching predicate");
    console.log("  reduce(list, fn, init)    Fold left");
    console.log("  fold(list, init, fn)      Fold (init-first arg order)");
    console.log("  find(list, fn)            First matching element");
    console.log("  any(list, fn)             Any element matches?");
    console.log("  all(list, fn)             All elements match?");
    console.log("  sort(list)                Sort (numbers or strings)");
    console.log("  head(list)                First element");
    console.log("  tail(list)                All but first");
    console.log("  last(list)                Last element");
    console.log("  reverse(list)             Reverse");
    console.log("  take(list, n)             First n elements");
    console.log("  drop(list, n)             Skip first n");
    console.log("  flat(list)                Flatten nested lists");
    console.log("  zip(a, b)                 Zip two lists");
    console.log("  enumerate(list)           Add indices: [[0,a],[1,b],...]");
    console.log("  push(list, item)          Append (returns new list)");
    console.log("  concat(a, b)              Concatenate lists");
    console.log("  sum(list)                 Sum numbers");
    console.log("  range(a, b)               Generate [a, a+1, ..., b-1]\n");
    console.log("Maps:");
    console.log("  keys(map)                 Get keys as list");
    console.log("  values(map)               Get values as list");
    console.log("  entries(map)              Key-value pairs\n");
    console.log("Math:");
    console.log("  abs(n)                    Absolute value");
    console.log("  min(...) / max(...)       Min/max (args or list)");
    console.log("  round(n)                  Round to integer\n");
    console.log("Other:");
    console.log("  assert(cond, msg?)        Assert truth (throws on false)");
    console.log("  time_ms()                 Unix timestamp in milliseconds\n");
    console.log("Operators:  +  -  *  /  %  **  ++  ==  !=  <  >  <=  >=  and  or  not  |>  ..  ?.");
    console.log("Strings:    \"text {expr}\" (interpolation)   \"ha\" * 3 (repetition)");
    console.log("Comments:   # or //");
    console.log("Errors:     try { ... } catch e { ... }\n");
    console.log("Stdlib:     arc builtins --modules    (list all standard library modules)");
    if (args.includes("--modules")) {
        console.log("\nStandard Library Modules:  (import with: use <module>)\n");
        const mods = [
            ["math", "sqrt, pow, ceil, floor, clamp, PI, E, sin, cos, log, 25 functions"],
            ["strings", "pad_left, pad_right, capitalize, words"],
            ["collections", "group_by, chunk, flatten, zip_with, partition, sort_by, unique"],
            ["map", "merge, map_values, filter_map, from_pairs, pick, omit"],
            ["io", "read_file, write_file, read_lines, exists, append"],
            ["http", "get, post, put, delete — real HTTP requests"],
            ["json", "to_json, from_json, pretty, get_path"],
            ["csv", "parse_csv, to_csv, parse_csv_headers"],
            ["regex", "match, find, test, replace, split, capture"],
            ["datetime", "now, today, parse, format, add_days, diff_days"],
            ["os", "cwd, list_dir, mkdir, exec, platform, env, remove, copy"],
            ["env", "get, set, has, all — environment variables"],
            ["crypto", "sha256, sha512, hmac_sha256, uuid, random_bytes"],
            ["error", "try_catch, try_finally, throw, retry, assert"],
            ["result", "ok, err, is_ok, unwrap, map_result, try_fn"],
            ["net", "ws_connect, tcp_connect, dns_lookup, base64_encode"],
            ["yaml", "parse, stringify"],
            ["toml", "parse, stringify"],
            ["html", "parse, create_element, to_html"],
            ["path", "join, dirname, basename, extname"],
            ["log", "info, warn, error, debug"],
            ["store", "get, set, delete — persistent key-value storage"],
            ["test", "describe, it, expect_eq, run_tests"],
            ["prompt", "template, count_tokens, window"],
            ["embed", "similarity, cosine, search"],
            ["llm", "chat, complete — multi-provider LLM API"],
        ];
        for (const [name, desc] of mods) {
            console.log(`  ${name.padEnd(14)} ${desc}`);
        }
    }
    process.exit(0);
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
    console.log("  builtins                List all built-in functions");
    console.log("  builtins --modules      List all standard library modules");
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
