import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { createRequire } from "module";

export const runtime = "nodejs";
export const maxDuration = 10;

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
      // Import Arc compiler modules directly (in-process, no subprocess)
      const { lex } = await import("arc-lang/dist/lexer.js");
      const { parse } = await import("arc-lang/dist/parser.js");
      const { interpret } = await import("arc-lang/dist/interpreter.js");
      const { clearModuleCache, loadModule, handleUse } = await import("arc-lang/dist/modules.js");

      // Find the stdlib directory inside the arc-lang npm package
      const require2 = createRequire(import.meta.url);
      const arcPkgJson = require2.resolve("arc-lang/package.json");
      const arcRoot = dirname(arcPkgJson);
      const stdlibDir = join(arcRoot, "stdlib");

      // Write code to a temp file (needed for error messages)
      const tmpDir = tmpdir();
      const filename = `arc-playground-${randomUUID()}.arc`;
      const filepath = join(tmpDir, filename);
      writeFileSync(filepath, code, "utf-8");

      // Clear module cache between runs
      clearModuleCache();

      // Custom use handler that resolves stdlib from the npm package directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const useHandler = (stmt: any, env: any) => {
        return handleUse(stmt, env, join(stdlibDir, "__playground__.arc"));
      };

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
        // Run with a timeout
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
        try { unlinkSync(filepath); } catch {}
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
