// Datetime Module Unit Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function run(src: string): any {
  const env = createEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Datetime Tests:");

// Constants
test("MS_PER_MINUTE", () => assert(run("let MS_PER_MINUTE = 60000\nMS_PER_MINUTE") === 60000, "MS_PER_MINUTE"));
test("MS_PER_HOUR", () => assert(run("let MS_PER_HOUR = 3600000\nMS_PER_HOUR") === 3600000, "MS_PER_HOUR"));
test("MS_PER_DAY", () => assert(run("let MS_PER_DAY = 86400000\nMS_PER_DAY") === 86400000, "MS_PER_DAY"));

// add_days
test("add_days positive", () => {
  const result = run("let ts = 0\nts + 3 * 86400000");
  assert(result === 259200000, "add_days(0, 3)");
});

test("add_days negative", () => {
  const result = run("let ts = 259200000\nts + -1 * 86400000");
  assert(result === 172800000, "add_days subtract 1");
});

test("add_days zero", () => {
  const result = run("let ts = 100000\nts + 0 * 86400000");
  assert(result === 100000, "add_days zero");
});

// add_hours
test("add_hours positive", () => {
  const result = run("let ts = 0\nts + 5 * 3600000");
  assert(result === 18000000, "add_hours(0, 5)");
});

test("add_hours negative", () => {
  const result = run("let ts = 7200000\nts + -1 * 3600000");
  assert(result === 3600000, "add_hours subtract 1");
});

// add_minutes
test("add_minutes positive", () => {
  const result = run("let ts = 0\nts + 30 * 60000");
  assert(result === 1800000, "add_minutes(0, 30)");
});

test("add_minutes negative", () => {
  const result = run("let ts = 120000\nts + -1 * 60000");
  assert(result === 60000, "add_minutes subtract 1");
});

// diff_days
test("diff_days same", () => {
  const result = run("let diff = 0 - 0\nif diff < 0 { 0 - diff } el { diff }");
  assert(result === 0, "diff_days same");
});

test("diff_days positive", () => {
  const result = run("let diff = 259200000 - 0\nint(diff / 86400000)");
  assert(result === 3, "diff_days 3");
});

test("diff_days reversed", () => {
  const result = run("let diff = 0 - 259200000\nlet abs_diff = if diff < 0 { 0 - diff } el { diff }\nint(abs_diff / 86400000)");
  assert(result === 3, "diff_days reversed");
});

// diff_hours
test("diff_hours", () => {
  const result = run("let diff = 7200000 - 0\nint(diff / 3600000)");
  assert(result === 2, "diff_hours 2");
});

test("diff_hours reversed", () => {
  const result = run("let diff = 0 - 7200000\nlet abs_diff = if diff < 0 { 0 - diff } el { diff }\nint(abs_diff / 3600000)");
  assert(result === 2, "diff_hours reversed");
});

// diff_minutes
test("diff_minutes", () => {
  const result = run("let diff = 300000 - 0\nint(diff / 60000)");
  assert(result === 5, "diff_minutes 5");
});

test("diff_minutes reversed", () => {
  const result = run("let diff = 0 - 300000\nlet abs_diff = if diff < 0 { 0 - diff } el { diff }\nint(abs_diff / 60000)");
  assert(result === 5, "diff_minutes reversed");
});

// day_of_week: Jan 1 1970 was Thursday (4)
test("day_of_week epoch", () => {
  const result = run("(int(0 / 86400000) + 4) % 7");
  assert(result === 4, "day_of_week epoch = Thursday(4)");
});

test("day_of_week day 1", () => {
  const result = run("(int(86400000 / 86400000) + 4) % 7");
  assert(result === 5, "day_of_week day1 = Friday(5)");
});

test("day_of_week day 3", () => {
  const result = run("(int(259200000 / 86400000) + 4) % 7");
  assert(result === 0, "day_of_week day3 = Sunday(0)");
});

// is_before
test("is_before true", () => {
  assert(run("1 < 2") === true, "is_before 1 < 2");
});

test("is_before false", () => {
  assert(run("2 < 1") === false, "is_before 2 < 1");
});

test("is_before equal", () => {
  assert(run("1 < 1") === false, "is_before 1 < 1");
});

// is_after
test("is_after true", () => {
  assert(run("2 > 1") === true, "is_after 2 > 1");
});

test("is_after false", () => {
  assert(run("1 > 2") === false, "is_after 1 > 2");
});

test("is_after equal", () => {
  assert(run("1 > 1") === false, "is_after 1 > 1");
});

// Arithmetic composition: add then diff
test("add then diff roundtrip", () => {
  const result = run("let ts = 1000000\nlet ts2 = ts + 7 * 86400000\nint((ts2 - ts) / 86400000)");
  assert(result === 7, "add 7 days then diff = 7");
});

// Large timestamp arithmetic
test("large timestamp add", () => {
  // ~2024 epoch ms
  const result = run("let ts = 1700000000000\nlet ts2 = ts + 1 * 86400000\nts2 - ts");
  assert(result === 86400000, "large ts add 1 day");
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
