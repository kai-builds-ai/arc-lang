// Arc Language REPL (Read-Eval-Print Loop)
import * as readline from "readline";
import { readFileSync } from "fs";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { createEnv, interpretWithEnv, toStr } from "./interpreter.js";
import { createUseHandler } from "./modules.js";
import { ARC_VERSION } from "./version.js";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
let showAst = false;
let env = createEnv();
const useHandler = createUseHandler(process.cwd() + "/repl.arc");
function printHelp() {
    console.log(`${CYAN}Arc REPL Commands:${RESET}`);
    console.log(`  ${YELLOW}:help${RESET}          Show this help message`);
    console.log(`  ${YELLOW}:builtins${RESET}      List all built-in functions`);
    console.log(`  ${YELLOW}:modules${RESET}       List available stdlib modules`);
    console.log(`  ${YELLOW}:ast${RESET}           Toggle AST display before execution`);
    console.log(`  ${YELLOW}:reset${RESET}         Clear all variables and state`);
    console.log(`  ${YELLOW}:load <file>${RESET}   Load and execute an Arc file`);
    console.log(`  ${YELLOW}:quit${RESET}          Exit the REPL`);
    console.log(`  ${YELLOW}Ctrl+C${RESET}         Exit the REPL`);
    console.log();
    console.log(`  Multi-line: end a line with { to start a block`);
    console.log(`  Comments: # or // (both work)`);
    console.log(`  Docs: https://arclang.dev | See CHEATSHEET.md`);
}
function printBuiltins() {
    console.log(`${CYAN}Built-in Functions:${RESET}`);
    console.log();
    console.log(`${YELLOW}I/O:${RESET}            print(...values)`);
    console.log(`${YELLOW}Type Convert:${RESET}   int(v)  float(v)  str(v)  bool(v)  type_of(v)`);
    console.log(`${YELLOW}Strings:${RESET}        len  trim  upper  lower  split  join  replace`);
    console.log(`                contains  starts  ends  repeat  chars  slice`);
    console.log(`                index_of  ord  chr  char_at`);
    console.log(`${YELLOW}Lists:${RESET}          map  filter  reduce  fold  find  any  all  sort`);
    console.log(`                head  tail  last  reverse  take  drop  flat`);
    console.log(`                zip  enumerate  push  concat  sum  range`);
    console.log(`${YELLOW}Maps:${RESET}           keys  values  entries  len`);
    console.log(`${YELLOW}Math:${RESET}           abs  min  max  round`);
    console.log(`${YELLOW}Other:${RESET}          assert  time_ms  to_string`);
    console.log();
    console.log(`${CYAN}Operators:${RESET}  +  -  *  /  %  **  ++  ==  !=  <  >  <=  >=  and  or  not  |>  ..  ?.`);
    console.log(`${CYAN}Syntax:${RESET}     "string {expr}"  *  (string repeat)  # // (comments)  try/catch`);
}
function printModules() {
    console.log(`${CYAN}Standard Library Modules:${RESET}  (import with: use <module>)`);
    console.log();
    console.log(`  ${YELLOW}math${RESET}          sqrt, pow, ceil, floor, clamp, PI, E, sin, cos, log`);
    console.log(`  ${YELLOW}strings${RESET}       pad_left, pad_right, capitalize, words`);
    console.log(`  ${YELLOW}collections${RESET}   group_by, chunk, flatten, zip_with, partition, sort_by, unique`);
    console.log(`  ${YELLOW}map${RESET}           merge, map_values, filter_map, from_pairs, pick, omit`);
    console.log(`  ${YELLOW}io${RESET}            read_file, write_file, read_lines, exists, append`);
    console.log(`  ${YELLOW}http${RESET}          get, post, put, delete — real HTTP requests`);
    console.log(`  ${YELLOW}json${RESET}          to_json, from_json, pretty, get_path`);
    console.log(`  ${YELLOW}csv${RESET}           parse_csv, to_csv, parse_csv_headers`);
    console.log(`  ${YELLOW}regex${RESET}         match, find, test, replace, split, capture`);
    console.log(`  ${YELLOW}datetime${RESET}      now, today, parse, format, add_days, diff_days`);
    console.log(`  ${YELLOW}os${RESET}            cwd, list_dir, mkdir, exec, platform, env`);
    console.log(`  ${YELLOW}env${RESET}           get, set, has, all — environment variables`);
    console.log(`  ${YELLOW}crypto${RESET}        sha256, sha512, hmac_sha256, uuid, random_bytes`);
    console.log(`  ${YELLOW}error${RESET}         try_catch, try_finally, throw, retry, assert`);
    console.log(`  ${YELLOW}result${RESET}        ok, err, is_ok, unwrap, map_result, try_fn`);
    console.log(`  ${YELLOW}net${RESET}           ws_connect, tcp_connect, dns_lookup, base64_encode`);
    console.log(`  ${YELLOW}yaml${RESET}          parse, stringify`);
    console.log(`  ${YELLOW}toml${RESET}          parse, stringify`);
    console.log(`  ${YELLOW}html${RESET}          parse, create_element, to_html`);
    console.log(`  ${YELLOW}path${RESET}          join, dirname, basename, extname`);
    console.log(`  ${YELLOW}log${RESET}           info, warn, error, debug`);
    console.log(`  ${YELLOW}store${RESET}         get, set, delete — persistent key-value storage`);
    console.log(`  ${YELLOW}test${RESET}          describe, it, expect_eq, run_tests`);
    console.log(`  ${YELLOW}prompt${RESET}        template, count_tokens, window`);
    console.log(`  ${YELLOW}embed${RESET}         similarity, cosine, search`);
    console.log(`  ${YELLOW}llm${RESET}           chat, complete — multi-provider LLM API`);
}
function execute(source) {
    try {
        const tokens = lex(source);
        const ast = parse(tokens);
        if (showAst) {
            console.log(`${CYAN}AST:${RESET}`, JSON.stringify(ast, null, 2));
        }
        const result = interpretWithEnv(ast, env, useHandler);
        if (result !== null && result !== undefined) {
            console.log(`${GREEN}${toStr(result)}${RESET}`);
        }
    }
    catch (e) {
        console.log(`${RED}Error: ${e.message}${RESET}`);
        if (e.suggestion) {
            console.log(`${YELLOW}hint${RESET}: ${e.suggestion}`);
        }
    }
}
function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "arc> ",
    });
    console.log(`${CYAN}Arc REPL v${ARC_VERSION}${RESET} — Type ${YELLOW}:help${RESET} for commands, ${YELLOW}:builtins${RESET} for functions`);
    rl.prompt();
    let buffer = "";
    let braceDepth = 0;
    rl.on("line", (line) => {
        const trimmed = line.trim();
        // Handle commands (only when not in multi-line mode)
        if (braceDepth === 0) {
            if (trimmed === ":quit" || trimmed === ":q" || trimmed === ":exit") {
                console.log("Goodbye!");
                process.exit(0);
            }
            if (trimmed === ":help") {
                printHelp();
                rl.prompt();
                return;
            }
            if (trimmed === ":builtins" || trimmed === ":b") {
                printBuiltins();
                rl.prompt();
                return;
            }
            if (trimmed === ":modules" || trimmed === ":m") {
                printModules();
                rl.prompt();
                return;
            }
            if (trimmed === ":ast") {
                showAst = !showAst;
                console.log(`AST display: ${showAst ? "ON" : "OFF"}`);
                rl.prompt();
                return;
            }
            if (trimmed === ":reset") {
                env = createEnv();
                console.log(`${YELLOW}State reset${RESET}`);
                rl.prompt();
                return;
            }
            if (trimmed.startsWith(":load ")) {
                const file = trimmed.slice(6).trim();
                try {
                    const source = readFileSync(file, "utf-8");
                    execute(source);
                }
                catch (e) {
                    console.log(`${RED}Error loading file: ${e.message}${RESET}`);
                }
                rl.prompt();
                return;
            }
            if (trimmed === "") {
                rl.prompt();
                return;
            }
        }
        // Multi-line support
        buffer += (buffer ? "\n" : "") + line;
        // Count braces (skip braces inside strings and comments)
        let inString = false;
        let escaped = false;
        for (let ci = 0; ci < line.length; ci++) {
            const ch = line[ci];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                escaped = true;
                continue;
            }
            if (ch === '"') {
                inString = !inString;
                continue;
            }
            if (ch === "#" && !inString)
                break; // rest is comment
            if (!inString) {
                if (ch === "{")
                    braceDepth++;
                if (ch === "}")
                    braceDepth--;
            }
        }
        if (braceDepth > 0) {
            rl.setPrompt("...  ");
            rl.prompt();
            return;
        }
        // Execute
        braceDepth = 0;
        execute(buffer);
        buffer = "";
        rl.setPrompt("arc> ");
        rl.prompt();
    });
    rl.on("close", () => {
        console.log("\nGoodbye!");
        process.exit(0);
    });
}
main();
