// Error Reporting Extended Tests
import {
  ErrorCode, ArcError, levenshtein, findClosestMatch, formatError,
  undefinedVariableError, parseError, typeError, runtimeError, importError, securityError,
  prettyPrintError, setPrettyErrors, isPrettyErrorsEnabled,
} from "../compiler/src/errors.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; } else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); } catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Error Reporting Extended Tests:");

// --- Levenshtein edge cases ---

test("levenshtein: both empty", () => {
  assert(levenshtein("", "") === 0, "empty-empty=0");
});

test("levenshtein: single char same", () => {
  assert(levenshtein("a", "a") === 0, "a-a=0");
});

test("levenshtein: single char diff", () => {
  assert(levenshtein("a", "b") === 1, "a-b=1");
});

test("levenshtein: one char vs two", () => {
  assert(levenshtein("a", "ab") === 1, "a-ab=1");
});

test("levenshtein: transposition", () => {
  assert(levenshtein("ab", "ba") === 2, "ab-ba=2");
});

test("levenshtein: longer strings", () => {
  const d = levenshtein("kitten", "sitting");
  assert(d === 3, `kitten-sitting=${d}`);
});

test("levenshtein: prefix", () => {
  assert(levenshtein("print", "println") === 2, "print-println=2");
});

test("levenshtein: repeated chars", () => {
  assert(levenshtein("aaa", "aaaa") === 1, "aaa-aaaa=1");
});

// --- findClosestMatch extended ---

test("findClosestMatch: single candidate match", () => {
  assert(findClosestMatch("prnt", ["print"]) === "print", "single candidate");
});

test("findClosestMatch: single candidate too far", () => {
  assert(findClosestMatch("xyz", ["print"]) === null, "too far");
});

test("findClosestMatch: empty candidates", () => {
  assert(findClosestMatch("hello", []) === null, "empty candidates");
});

test("findClosestMatch: exact match preferred", () => {
  assert(findClosestMatch("map", ["map", "maps", "mop"]) === "map", "exact preferred");
});

test("findClosestMatch: custom maxDistance", () => {
  assert(findClosestMatch("abcdef", ["abcxyz"], 1) === null, "within custom max");
  assert(findClosestMatch("abc", ["abd"], 1) === "abd", "1 distance ok");
});

// --- formatError extended ---

test("formatError: no loc no source", () => {
  const err: ArcError = { code: ErrorCode.TYPE_MISMATCH, category: "TypeError", message: "bad type" };
  const out = formatError(err, false);
  assert(out.includes("TypeError[ARC100]"), "has header");
  assert(out.includes("bad type"), "has message");
  assert(!out.includes("│"), "no source snippet");
});

test("formatError: no suggestion means no hint", () => {
  const err: ArcError = { code: ErrorCode.UNEXPECTED_TOKEN, category: "ParseError", message: "oops" };
  const out = formatError(err, false);
  assert(!out.includes("hint"), "no hint line");
});

test("formatError: with color has bold", () => {
  const err: ArcError = { code: ErrorCode.UNDEFINED_VARIABLE, category: "RuntimeError", message: "x" };
  const out = formatError(err, true);
  assert(out.includes("\x1b[1m"), "has bold");
});

test("formatError: with color has cyan for line numbers", () => {
  const err: ArcError = {
    code: ErrorCode.UNDEFINED_VARIABLE, category: "RuntimeError", message: "x",
    loc: { line: 1, col: 1 }, source: "let x = 1"
  };
  const out = formatError(err, true);
  assert(out.includes("\x1b[36m"), "has cyan");
});

test("formatError: pointer at col 1", () => {
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN, category: "ParseError", message: "err",
    loc: { line: 1, col: 1 }, source: "bad"
  };
  const out = formatError(err, false);
  assert(out.includes("^^^"), "has pointer");
});

test("formatError: pointer at end of line", () => {
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN, category: "ParseError", message: "err",
    loc: { line: 1, col: 10 }, source: "let x = 1!"
  };
  const out = formatError(err, false);
  assert(out.includes("^^^"), "has pointer at end");
});

test("formatError: multi-line source middle line", () => {
  const src = "line1\nline2\nline3\nline4\nline5";
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN, category: "ParseError", message: "err",
    loc: { line: 3, col: 1 }, source: src
  };
  const out = formatError(err, false);
  assert(out.includes("line2"), "context before");
  assert(out.includes("line3"), "error line");
  assert(out.includes("line4"), "context after");
});

test("formatError: suggestion with yellow hint in color mode", () => {
  const err: ArcError = {
    code: ErrorCode.UNDEFINED_VARIABLE, category: "RuntimeError", message: "x",
    suggestion: "try y"
  };
  const out = formatError(err, true);
  assert(out.includes("\x1b[33m"), "yellow for hint");
  assert(out.includes("hint"), "hint label");
});

// --- Error constructors extended ---

test("undefinedVariableError: with loc and source", () => {
  const err = undefinedVariableError("foo", ["for", "fn"], { line: 5, col: 3 }, "some source");
  assert(err.loc?.line === 5, "has loc");
  assert(err.source === "some source", "has source");
});

test("undefinedVariableError: suggestion for close match", () => {
  const err = undefinedVariableError("lenght", ["length", "len"]);
  assert(err.suggestion?.includes("length") ?? false, "suggests length");
});

test("parseError: no auto-suggestion for generic message", () => {
  const err = parseError("Something unexpected");
  assert(err.suggestion === undefined, "no auto suggestion");
});

test("parseError: with loc", () => {
  const err = parseError("bad", { line: 10, col: 5 });
  assert(err.loc?.line === 10, "has loc");
});

test("typeError: with loc and source", () => {
  const err = typeError("mismatch", { line: 1, col: 1 }, "code");
  assert(err.loc?.line === 1, "has loc");
  assert(err.source === "code", "has source");
});

test("runtimeError: with suggestion", () => {
  const err = runtimeError(ErrorCode.INDEX_OUT_OF_BOUNDS, "out of bounds", undefined, undefined, "check length");
  assert(err.suggestion === "check length", "has suggestion");
});

test("runtimeError: division by zero code", () => {
  const err = runtimeError(ErrorCode.DIVISION_BY_ZERO, "div0");
  assert(err.code === ErrorCode.DIVISION_BY_ZERO, "correct code");
  assert(err.category === "RuntimeError", "correct category");
});

test("importError: module not found code", () => {
  const err = importError("not found");
  assert(err.code === ErrorCode.MODULE_NOT_FOUND, "correct code");
});

test("securityError: execution limit", () => {
  const err = securityError(ErrorCode.EXECUTION_LIMIT, "too many steps");
  assert(err.code === ErrorCode.EXECUTION_LIMIT, "correct code");
  assert(err.category === "SecurityError", "correct category");
});

test("securityError: timeout code", () => {
  const err = securityError(ErrorCode.TIMEOUT, "timed out");
  assert(err.code === ErrorCode.TIMEOUT, "timeout code");
});

// --- prettyPrintError extended ---

test("prettyPrintError: generic error without location", () => {
  const err = new Error("Something went wrong");
  const out = prettyPrintError(err, "code", false);
  assert(out.includes("Something went wrong"), "has message");
});

test("prettyPrintError: SecurityError name detection", () => {
  const err = new Error("limit exceeded");
  (err as any).name = "SecurityError";
  const out = prettyPrintError(err, "", false);
  assert(out.includes("SecurityError"), "detected security error");
});

test("prettyPrintError: Not callable detection", () => {
  const err = new Error("Not callable: 42");
  const out = prettyPrintError(err, "42()", false);
  assert(out.includes("ARC102"), "has NOT_CALLABLE code");
});

test("prettyPrintError: no source provided", () => {
  const err = new Error("Undefined variable: bar");
  const out = prettyPrintError(err, undefined, false);
  assert(out.includes("bar"), "has variable name");
});

test("prettyPrintError: color mode", () => {
  const err = new Error("oops at line 1, col 1");
  const out = prettyPrintError(err, "bad", true);
  assert(out.includes("\x1b["), "has ANSI codes");
});

// --- setPrettyErrors ---

test("setPrettyErrors: can disable and re-enable", () => {
  const before = isPrettyErrorsEnabled();
  setPrettyErrors(false);
  assert(!isPrettyErrorsEnabled(), "disabled");
  setPrettyErrors(true);
  assert(isPrettyErrorsEnabled(), "enabled again");
  // Restore
  setPrettyErrors(before);
  assert(true, "restored");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
