import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";

export const runtime = "nodejs";
export const maxDuration = 10;

// Pre-load all stdlib .arc files into memory at module load time.
// This avoids filesystem issues on Vercel serverless.
const STDLIB: Record<string, string> = {};

function loadStdlibFromDisk() {
  // Try multiple possible locations for stdlib
  const candidates = [
    join(process.cwd(), "node_modules", "arc-lang", "stdlib"),
    join(__dirname, "..", "node_modules", "arc-lang", "stdlib"),
  ];
  
  for (const dir of candidates) {
    try {
      if (existsSync(dir)) {
        const files = readdirSync(dir).filter(f => f.endsWith(".arc"));
        for (const file of files) {
          const name = file.replace(".arc", "");
          STDLIB[name] = readFileSync(join(dir, file), "utf-8");
        }
        if (Object.keys(STDLIB).length > 0) return;
      }
    } catch {}
  }
}

loadStdlibFromDisk();

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (typeof code !== "string") {
      return NextResponse.json(
        { output: "", error: "Invalid request: code must be a string", executionTime: 0 },
        { status: 400 }
      );
    }

    if (code.trim() === "") {
      return NextResponse.json({ output: "", error: null, executionTime: 0 });
    }

    if (code.length > 50000) {
      return NextResponse.json(
        { output: "", error: "Code too large (50KB limit)", executionTime: 0 },
        { status: 400 }
      );
    }

    const start = performance.now();

    try {
      const { lex } = await import("arc-lang/dist/lexer.js");
      const { parse } = await import("arc-lang/dist/parser.js");
      const { interpret } = await import("arc-lang/dist/interpreter.js");
      const { createEnv, runStmt } = await import("arc-lang/dist/interpreter.js");

      // Module cache for this execution
      const moduleCache = new Map<string, Record<string, unknown>>();

      // Custom use handler that loads stdlib from memory
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const useHandler = (stmt: any, env: any) => {
        const moduleName = stmt.path[stmt.path.length - 1];
        
        // Check cache
        if (moduleCache.has(moduleName)) {
          bindExports(stmt, env, moduleCache.get(moduleName)!);
          return;
        }

        const source = STDLIB[moduleName];
        if (!source) {
          throw new Error(`Module not found: ${stmt.path.join("/")} (available: ${Object.keys(STDLIB).join(", ") || "none - stdlib not loaded"})`);
        }

        // Parse and execute the module
        const tokens = lex(source);
        const ast = parse(tokens);
        const modEnv = createEnv();

        for (const s of ast.stmts) {
          if (s.kind === "UseStmt") {
            // Handle nested use statements (stdlib modules importing other stdlib)
            useHandler(s, modEnv);
          } else {
            runStmt(s, modEnv);
          }
        }

        // Collect pub exports
        const exports: Record<string, unknown> = {};
        for (const s of ast.stmts) {
          if (s.kind === "LetStmt" && s.pub && typeof s.name === "string") {
            exports[s.name] = modEnv.get(s.name);
          } else if (s.kind === "FnStmt" && s.pub) {
            exports[s.name] = modEnv.get(s.name);
          }
        }

        moduleCache.set(moduleName, exports);
        bindExports(stmt, env, exports);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function bindExports(stmt: any, env: any, exports: Record<string, unknown>) {
        if (stmt.wildcard || (!stmt.imports || stmt.imports.length === 0)) {
          for (const [name, value] of Object.entries(exports)) {
            env.set(name, value);
          }
        } else if (stmt.imports) {
          for (const name of stmt.imports) {
            if (!(name in exports)) {
              throw new Error(`Module ${stmt.path.join("/")} does not export '${name}'`);
            }
            env.set(name, exports[name]);
          }
        }
        // Create namespace object
        const nsName = stmt.path[stmt.path.length - 1];
        const entries = new Map<string, unknown>();
        for (const [name, value] of Object.entries(exports)) {
          entries.set(name, value);
        }
        env.set(nsName, { __map: true, __module: nsName, entries });
      }

      // Capture console.log output
      const outputLines: string[] = [];
      const origLog = console.log;
      const origError = console.error;
      console.log = (...args: unknown[]) => {
        outputLines.push(args.map(String).join(" "));
      };
      console.error = (...args: unknown[]) => {
        outputLines.push(args.map(String).join(" "));
      };

      let error: string | null = null;

      try {
        const tokens = lex(code);
        const ast = parse(tokens);

        await Promise.race([
          new Promise<void>((resolve, reject) => {
            try {
              interpret(ast, useHandler);
              resolve();
            } catch (e: unknown) {
              reject(e);
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Execution timed out (5s limit)")), 5000)
          ),
        ]);
      } catch (e: unknown) {
        if (e instanceof Error) {
          error = e.message;
        } else {
          error = String(e);
        }
      } finally {
        console.log = origLog;
        console.error = origError;
      }

      const executionTime = Math.round(performance.now() - start);

      const MAX_OUTPUT = 100000;
      let output = outputLines.join("\n");
      if (output.length > MAX_OUTPUT) {
        output = output.slice(0, MAX_OUTPUT) + "\n\n... (output truncated at 100KB)";
      }

      return NextResponse.json({ output, error, executionTime });
    } catch (e: unknown) {
      const executionTime = Math.round(performance.now() - start);
      return NextResponse.json({
        output: "",
        error: e instanceof Error ? e.message : "Unknown error",
        executionTime,
      });
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { output: "", error: e instanceof Error ? e.message : "Unknown error", executionTime: 0 },
      { status: 500 }
    );
  }
}
