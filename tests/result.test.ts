// Result type builtin tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";
import { describe, it, expect } from "vitest";

function run(src: string): any {
  const tokens = lex(src);
  const ast = parse(tokens);
  const env = createEnv();
  return interpretWithEnv(ast, env);
}

function isMap(v: any): v is { __map: true; entries: Map<string, any> } {
  return v && typeof v === "object" && "__map" in v;
}

function getMapField(v: any, key: string): any {
  if (isMap(v)) return v.entries.get(key) ?? null;
  return null;
}

describe("Result type builtins", () => {
  describe("Ok and Err constructors", () => {
    it("Ok wraps a value", () => {
      const result = run(`Ok(42)`);
      expect(isMap(result)).toBe(true);
      expect(getMapField(result, "ok")).toBe(true);
      expect(getMapField(result, "value")).toBe(42);
    });

    it("Err wraps an error", () => {
      const result = run(`Err("something went wrong")`);
      expect(isMap(result)).toBe(true);
      expect(getMapField(result, "ok")).toBe(false);
      expect(getMapField(result, "error")).toBe("something went wrong");
    });

    it("Ok with string value", () => {
      const result = run(`Ok("hello")`);
      expect(getMapField(result, "ok")).toBe(true);
      expect(getMapField(result, "value")).toBe("hello");
    });

    it("Ok with nil value", () => {
      const result = run(`Ok(nil)`);
      expect(getMapField(result, "ok")).toBe(true);
      expect(getMapField(result, "value")).toBe(null);
    });

    it("Ok with list value", () => {
      const result = run(`Ok([1, 2, 3])`);
      expect(getMapField(result, "ok")).toBe(true);
      expect(getMapField(result, "value")).toEqual([1, 2, 3]);
    });
  });

  describe("is_ok and is_err", () => {
    it("is_ok returns true for Ok", () => {
      expect(run(`is_ok(Ok(42))`)).toBe(true);
    });

    it("is_ok returns false for Err", () => {
      expect(run(`is_ok(Err("fail"))`)).toBe(false);
    });

    it("is_err returns true for Err", () => {
      expect(run(`is_err(Err("fail"))`)).toBe(true);
    });

    it("is_err returns false for Ok", () => {
      expect(run(`is_err(Ok(42))`)).toBe(false);
    });

    it("is_ok returns false for non-Result", () => {
      expect(run(`is_ok(42)`)).toBe(false);
    });

    it("is_err returns false for non-Result", () => {
      expect(run(`is_err("hello")`)).toBe(false);
    });
  });

  describe("unwrap", () => {
    it("unwrap returns value from Ok", () => {
      expect(run(`unwrap(Ok(42))`)).toBe(42);
    });

    it("unwrap throws on Err", () => {
      expect(() => run(`unwrap(Err("bad"))`)).toThrow("Called unwrap on Err");
    });

    it("unwrap throws on non-Result", () => {
      expect(() => run(`unwrap(42)`)).toThrow("Called unwrap on non-Result");
    });
  });

  describe("unwrap_or", () => {
    it("unwrap_or returns value from Ok", () => {
      expect(run(`unwrap_or(Ok(42), 0)`)).toBe(42);
    });

    it("unwrap_or returns default on Err", () => {
      expect(run(`unwrap_or(Err("fail"), 0)`)).toBe(0);
    });

    it("unwrap_or returns default string on Err", () => {
      expect(run(`unwrap_or(Err("fail"), "default")`)).toBe("default");
    });

    it("unwrap_or returns default on non-Result", () => {
      expect(run(`unwrap_or(99, "fallback")`)).toBe("fallback");
    });
  });

  describe("map_result", () => {
    it("map_result applies fn to Ok value", () => {
      const result = run(`map_result(Ok(5), x => x * 2)`);
      expect(getMapField(result, "ok")).toBe(true);
      expect(getMapField(result, "value")).toBe(10);
    });

    it("map_result passes Err through", () => {
      const result = run(`map_result(Err("fail"), x => x * 2)`);
      expect(getMapField(result, "ok")).toBe(false);
      expect(getMapField(result, "error")).toBe("fail");
    });

    it("map_result chains correctly", () => {
      const result = run(`
        let r = Ok(3)
        let r2 = map_result(r, x => x + 10)
        unwrap(r2)
      `);
      expect(result).toBe(13);
    });

    it("map_result throws on non-Result", () => {
      expect(() => run(`map_result(42, x => x)`)).toThrow("map_result expects a Result");
    });
  });

  describe("combined usage", () => {
    it("pipeline Ok through map and unwrap", () => {
      const result = run(`
        let r = Ok(10)
        let r2 = map_result(r, x => x * 3)
        unwrap_or(r2, 0)
      `);
      expect(result).toBe(30);
    });

    it("pipeline Err through map and unwrap_or", () => {
      const result = run(`
        let r = Err("nope")
        let r2 = map_result(r, x => x * 3)
        unwrap_or(r2, -1)
      `);
      expect(result).toBe(-1);
    });

    it("conditional based on is_ok", () => {
      const result = run(`
        let r = Ok(42)
        if is_ok(r) { unwrap(r) } el { 0 }
      `);
      expect(result).toBe(42);
    });
  });
});
