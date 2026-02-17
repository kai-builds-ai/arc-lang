// Arc Language REPL (Read-Eval-Print Loop)

import * as readline from "readline";
import { readFileSync } from "fs";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { createEnv, interpretWithEnv, toStr } from "./interpreter.js";
import { createUseHandler } from "./modules.js";

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
  console.log(`  ${YELLOW}:ast${RESET}           Toggle AST display before execution`);
  console.log(`  ${YELLOW}:reset${RESET}         Clear all variables and state`);
  console.log(`  ${YELLOW}:load <file>${RESET}   Load and execute an Arc file`);
  console.log(`  ${YELLOW}:quit${RESET}          Exit the REPL`);
  console.log(`  ${YELLOW}Ctrl+C${RESET}         Exit the REPL`);
  console.log();
  console.log(`  Multi-line: end a line with { to start a block`);
}

function execute(source: string): void {
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
  } catch (e: any) {
    console.log(`${RED}Error: ${e.message}${RESET}`);
  }
}

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "arc> ",
  });

  console.log(`${CYAN}Arc REPL v0.1.0${RESET} — Type ${YELLOW}:help${RESET} for commands`);
  rl.prompt();

  let buffer = "";
  let braceDepth = 0;

  rl.on("line", (line: string) => {
    const trimmed = line.trim();

    // Handle commands (only when not in multi-line mode)
    if (braceDepth === 0) {
      if (trimmed === ":quit" || trimmed === ":q") {
        console.log("Goodbye!");
        process.exit(0);
      }
      if (trimmed === ":help") {
        printHelp();
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
        } catch (e: any) {
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
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (ch === "#" && !inString) break; // rest is comment
      if (!inString) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
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
