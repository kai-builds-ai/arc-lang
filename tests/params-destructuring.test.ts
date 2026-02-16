import { describe, it, expect } from "vitest";
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";

function run(src: string): any {
  const env = createEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

function runStr(src: string): string {
  return toStr(run(src));
}

describe("Default Parameters", () => {
  it("uses default when arg missing", () => {
    expect(run(`
      fn greet(name = "world") => "hello " ++ name
      greet()
    `)).toBe("hello world");
  });

  it("overrides default when arg provided", () => {
    expect(run(`
      fn greet(name = "world") => "hello " ++ name
      greet("arc")
    `)).toBe("hello arc");
  });

  it("supports multiple defaults", () => {
    expect(run(`
      fn add(a = 1, b = 2) => a + b
      add()
    `)).toBe(3);
  });

  it("partial defaults - first arg provided", () => {
    expect(run(`
      fn add(a, b = 10) => a + b
      add(5)
    `)).toBe(15);
  });

  it("default expression evaluated at call time", () => {
    expect(run(`
      let mut x = 0
      fn next(val = x) {
        x = x + 1
        val
      }
      let a = next()
      let b = next()
      let result = [a, b]
      result
    `)).toEqual([0, 1]);
  });
});

describe("Rest Parameters", () => {
  it("collects extra args into a list", () => {
    expect(run(`
      fn sum_all(...nums) => sum(nums)
      sum_all(1, 2, 3)
    `)).toBe(6);
  });

  it("rest with leading params", () => {
    expect(run(`
      fn first_and_rest(first, ...rest) => [first, rest]
      first_and_rest(1, 2, 3, 4)
    `)).toEqual([1, [2, 3, 4]]);
  });

  it("rest with no extra args gives empty list", () => {
    expect(run(`
      fn f(a, ...rest) => rest
      f(1)
    `)).toEqual([]);
  });

  it("rest as only param", () => {
    expect(run(`
      fn f(...args) => len(args)
      f()
    `)).toBe(0);
  });
});

describe("Destructuring in for loops", () => {
  it("array destructuring", () => {
    expect(run(`
      let mut result = 0
      for [a, b] in [[1, 2], [3, 4], [5, 6]] {
        result = result + a + b
      }
      result
    `)).toBe(21);
  });

  it("object destructuring", () => {
    expect(run(`
      let items = [{name: "a", val: 1}, {name: "b", val: 2}]
      let mut total = 0
      for {val} in items {
        total = total + val
      }
      total
    `)).toBe(3);
  });

  it("object destructuring multiple keys", () => {
    expect(run(`
      let items = [{x: 1, y: 2}, {x: 3, y: 4}]
      let mut results = []
      for {x, y} in items {
        results = push(results, x + y)
      }
      results
    `)).toEqual([3, 7]);
  });
});

describe("Let destructuring with rest", () => {
  it("basic array destructuring", () => {
    expect(run(`
      let [a, b, c] = [10, 20, 30]
      a + b + c
    `)).toBe(60);
  });

  it("array destructuring with rest", () => {
    expect(run(`
      let [first, ...rest] = [1, 2, 3, 4, 5]
      let result = [first, rest]
      result
    `)).toEqual([1, [2, 3, 4, 5]]);
  });

  it("rest gets empty list when no remaining", () => {
    expect(run(`
      let [a, ...rest] = [42]
      let result = [a, rest]
      result
    `)).toEqual([42, []]);
  });

  it("object destructuring", () => {
    expect(run(`
      let {name, age} = {name: "arc", age: 1}
      name ++ " " ++ str(age)
    `)).toBe("arc 1");
  });
});

describe("entries() builtin", () => {
  it("converts map to list of {key, value} maps", () => {
    const result = run(`
      let m = {a: 1, b: 2}
      let e = entries(m)
      len(e)
    `);
    expect(result).toBe(2);
  });

  it("entries have key and value fields", () => {
    expect(run(`
      let m = {x: 42}
      let e = entries(m)
      let item = e[0]
      let result = [item.key, item.value]
      result
    `)).toEqual(["x", 42]);
  });

  it("works with for destructuring", () => {
    expect(run(`
      let m = {a: 1, b: 2}
      let mut total = 0
      for {key, value} in entries(m) {
        total = total + value
      }
      total
    `)).toBe(3);
  });

  it("returns empty list for empty map", () => {
    expect(run(`entries({})`)).toEqual([]);
  });
});
