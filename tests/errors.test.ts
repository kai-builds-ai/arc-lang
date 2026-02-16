// Error Reporting Tests
import {
  ErrorCode,
  ArcError,
  levenshtein,
  findClosestMatch,
  formatError,
  undefinedVariableError,
  parseError,
  typeError,
  runtimeError,
  importError,
  securityError,
  prettyPrintError,
  setPrettyErrors,
  isPrettyErrorsEnabled,
} from "../compiler/src/errors.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Error Reporting Tests:");

// --- Levenshtein Distance ---

test("levenshtein: identical strings", () => {
  assert(levenshtein("hello", "hello") === 0, "same = 0");
});

test("levenshtein: single edit", () => {
  assert(levenshtein("cat", "car") === 1, "cat->car = 1");
});

test("levenshtein: insertion", () => {
  assert(levenshtein("cat", "cats") === 1, "cat->cats = 1");
});

test("levenshtein: deletion", () => {
  assert(levenshtein("cats", "cat") === 1, "cats->cat = 1");
});

test("levenshtein: empty string", () => {
  assert(levenshtein("", "abc") === 3, "empty to abc = 3");
  assert(levenshtein("abc", "") === 3, "abc to empty = 3");
});

test("levenshtein: completely different", () => {
  assert(levenshtein("abc", "xyz") === 3, "abc->xyz = 3");
});

// --- findClosestMatch ---

test("findClosestMatch: finds close match", () => {
  const result = findClosestMatch("prnt", ["print", "len", "map", "filter"]);
  assert(result === "print", "prnt -> print");
});

test("findClosestMatch: finds exact match", () => {
  const result = findClosestMatch("map", ["print", "len", "map", "filter"]);
  assert(result === "map", "exact match");
});

test("findClosestMatch: returns null for no close match", () => {
  const result = findClosestMatch("zzzzzzz", ["print", "len", "map"]);
  assert(result === null, "no close match");
});

test("findClosestMatch: picks closest", () => {
  const result = findClosestMatch("fiter", ["filter", "find", "flat"]);
  assert(result === "filter", "fiter -> filter");
});

// --- formatError ---

test("formatError: includes error code and category", () => {
  const err: ArcError = {
    code: ErrorCode.UNDEFINED_VARIABLE,
    category: "RuntimeError",
    message: "Undefined variable 'x'",
  };
  const output = formatError(err, false);
  assert(output.includes("RuntimeError[ARC200]"), "has category and code");
  assert(output.includes("Undefined variable 'x'"), "has message");
});

test("formatError: shows source snippet", () => {
  const source = "let x = 1\nlet y = z\nlet a = 2";
  const err: ArcError = {
    code: ErrorCode.UNDEFINED_VARIABLE,
    category: "RuntimeError",
    message: "Undefined variable 'z'",
    loc: { line: 2, col: 9 },
    source,
  };
  const output = formatError(err, false);
  assert(output.includes("let y = z"), "shows error line");
  assert(output.includes("^^^"), "shows pointer");
});

test("formatError: shows suggestion", () => {
  const err: ArcError = {
    code: ErrorCode.UNDEFINED_VARIABLE,
    category: "RuntimeError",
    message: "Undefined variable 'prnt'",
    suggestion: "Did you mean 'print'?",
  };
  const output = formatError(err, false);
  assert(output.includes("Did you mean 'print'?"), "shows suggestion");
  assert(output.includes("hint"), "shows hint label");
});

test("formatError: with color enabled", () => {
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN,
    category: "ParseError",
    message: "Unexpected token",
  };
  const output = formatError(err, true);
  assert(output.includes("\x1b[31m"), "has red ANSI code");
});

test("formatError: context lines", () => {
  const source = "let a = 1\nlet b = 2\nlet c = ?\nlet d = 4";
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN,
    category: "ParseError",
    message: "Unexpected token '?'",
    loc: { line: 3, col: 9 },
    source,
  };
  const output = formatError(err, false);
  assert(output.includes("let b = 2"), "shows line before");
  assert(output.includes("let c = ?"), "shows error line");
  assert(output.includes("let d = 4"), "shows line after");
});

// --- Error constructors ---

test("undefinedVariableError: with suggestion", () => {
  const err = undefinedVariableError("prnt", ["print", "len", "map"]);
  assert(err.code === ErrorCode.UNDEFINED_VARIABLE, "correct code");
  assert(err.category === "RuntimeError", "correct category");
  assert(err.suggestion?.includes("print") ?? false, "has suggestion");
});

test("undefinedVariableError: no close match", () => {
  const err = undefinedVariableError("xyzabc", ["print", "len"]);
  assert(err.suggestion === undefined, "no suggestion");
});

test("parseError: auto-detects paren suggestion", () => {
  const err = parseError("Expected RParen");
  assert(err.suggestion?.includes("parenthesis") ?? false, "paren suggestion");
});

test("parseError: auto-detects bracket suggestion", () => {
  const err = parseError("Expected RBracket");
  assert(err.suggestion?.includes("bracket") ?? false, "bracket suggestion");
});

test("parseError: auto-detects brace suggestion", () => {
  const err = parseError("Expected RBrace");
  assert(err.suggestion?.includes("brace") ?? false, "brace suggestion");
});

test("parseError: custom suggestion overrides auto", () => {
  const err = parseError("something", undefined, undefined, "custom hint");
  assert(err.suggestion === "custom hint", "custom suggestion");
});

test("typeError: creates correctly", () => {
  const err = typeError("Cannot add string and int");
  assert(err.category === "TypeError", "type error category");
  assert(err.code === ErrorCode.TYPE_MISMATCH, "type error code");
});

test("runtimeError: creates correctly", () => {
  const err = runtimeError(ErrorCode.DIVISION_BY_ZERO, "Division by zero");
  assert(err.code === ErrorCode.DIVISION_BY_ZERO, "runtime error code");
});

test("importError: creates correctly", () => {
  const err = importError("Module 'foo' not found");
  assert(err.category === "ImportError", "import category");
});

test("securityError: creates correctly", () => {
  const err = securityError(ErrorCode.EXECUTION_LIMIT, "Too many steps");
  assert(err.category === "SecurityError", "security category");
});

// --- prettyPrintError ---

test("prettyPrintError: extracts location from message", () => {
  const err = new Error("Something went wrong at line 5, col 3");
  const output = prettyPrintError(err, "a\nb\nc\nd\nlet x = bad\nf", false);
  assert(output.includes("let x = bad"), "shows source line");
});

test("prettyPrintError: detects parse errors", () => {
  const err = new Error("Parse error at line 1, col 5: Unexpected");
  const output = prettyPrintError(err, "let = 1", false);
  assert(output.includes("ParseError"), "detected parse error");
});

test("prettyPrintError: detects undefined variable", () => {
  const err = new Error("Undefined variable: foo");
  const output = prettyPrintError(err, "foo", false);
  assert(output.includes("ARC200"), "has error code");
  assert(output.includes("Check that"), "has suggestion");
});

test("prettyPrintError: detects immutable reassign", () => {
  const err = new Error("Cannot reassign immutable variable: x");
  const output = prettyPrintError(err, "let x = 1; x = 2", false);
  assert(output.includes("let mut"), "suggests let mut");
});

// --- Pretty errors flag ---

test("setPrettyErrors: toggle works", () => {
  setPrettyErrors(false);
  assert(!isPrettyErrorsEnabled(), "disabled");
  setPrettyErrors(true);
  assert(isPrettyErrorsEnabled(), "re-enabled");
});

// --- Edge cases ---

test("formatError: line 1 with no context before", () => {
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN,
    category: "ParseError",
    message: "error",
    loc: { line: 1, col: 1 },
    source: "bad code",
  };
  const output = formatError(err, false);
  assert(output.includes("bad code"), "shows first line");
});

test("formatError: last line with no context after", () => {
  const err: ArcError = {
    code: ErrorCode.UNEXPECTED_TOKEN,
    category: "ParseError",
    message: "error",
    loc: { line: 2, col: 1 },
    source: "line1\nline2",
  };
  const output = formatError(err, false);
  assert(output.includes("line2"), "shows last line");
  assert(output.includes("line1"), "shows context before");
});

export { passed, failed };
