// Net Module Unit Tests
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

console.log("Net Module Tests:");

// --- url_encode ---
test("url_encode space", () => {
  assert(run('import net\nnet.url_encode("hello world")') === "hello%20world", "space encodes to %20");
});

test("url_encode special chars", () => {
  assert(run('import net\nnet.url_encode("a&b=c")') === "a%26b%3Dc", "& and = encoded");
});

test("url_encode empty", () => {
  assert(run('import net\nnet.url_encode("")') === "", "empty string stays empty");
});

test("url_encode plain", () => {
  assert(run('import net\nnet.url_encode("hello")') === "hello", "plain text unchanged");
});

test("url_encode slash", () => {
  assert(run('import net\nnet.url_encode("/path/to")') === "%2Fpath%2Fto", "slashes encoded");
});

// --- url_decode ---
test("url_decode %20", () => {
  assert(run('import net\nnet.url_decode("hello%20world")') === "hello world", "%20 to space");
});

test("url_decode plus", () => {
  assert(run('import net\nnet.url_decode("hello+world")') === "hello world", "+ to space");
});

test("url_decode mixed", () => {
  assert(run('import net\nnet.url_decode("a%26b%3Dc")') === "a&b=c", "decode special chars");
});

test("url_decode empty", () => {
  assert(run('import net\nnet.url_decode("")') === "", "empty stays empty");
});

test("url_decode plain", () => {
  assert(run('import net\nnet.url_decode("hello")') === "hello", "plain unchanged");
});

// --- url_encode/decode roundtrip ---
test("url roundtrip", () => {
  assert(run('import net\nnet.url_decode(net.url_encode("hello world!"))') === "hello world!", "roundtrip preserves");
});

// --- base64_encode ---
test("base64_encode hello", () => {
  assert(run('import net\nnet.base64_encode("Hello")') === "SGVsbG8=", "Hello -> SGVsbG8=");
});

test("base64_encode empty", () => {
  assert(run('import net\nnet.base64_encode("")') === "", "empty -> empty");
});

test("base64_encode padding 1", () => {
  assert(run('import net\nnet.base64_encode("ab")') === "YWI=", "2 chars gets padding");
});

test("base64_encode no padding", () => {
  assert(run('import net\nnet.base64_encode("abc")') === "YWJj", "3 chars no padding");
});

// --- base64_decode ---
test("base64_decode hello", () => {
  assert(run('import net\nnet.base64_decode("SGVsbG8=")') === "Hello", "SGVsbG8= -> Hello");
});

test("base64_decode empty", () => {
  assert(run('import net\nnet.base64_decode("")') === "", "empty -> empty");
});

// --- base64 roundtrip ---
test("base64 roundtrip", () => {
  assert(run('import net\nnet.base64_decode(net.base64_encode("Arc lang!"))') === "Arc lang!", "roundtrip");
});

// --- parse_query ---
test("parse_query basic", () => {
  const result = run('import net\nlet m = net.parse_query("foo=bar&baz=42")\nm["foo"]');
  assert(result === "bar", "foo=bar");
});

test("parse_query second key", () => {
  const result = run('import net\nlet m = net.parse_query("foo=bar&baz=42")\nm["baz"]');
  assert(result === "42", "baz=42");
});

test("parse_query with leading ?", () => {
  const result = run('import net\nlet m = net.parse_query("?x=1&y=2")\nm["x"]');
  assert(result === "1", "strips leading ?");
});

test("parse_query encoded values", () => {
  const result = run('import net\nlet m = net.parse_query("name=hello%20world")\nm["name"]');
  assert(result === "hello world", "decodes %20");
});

// --- build_query ---
test("build_query basic", () => {
  const result = run('import net\nnet.build_query({ foo: "bar" })');
  assert(result === "foo=bar", "single pair");
});

test("build_query encodes", () => {
  const result = run('import net\nnet.build_query({ q: "hello world" })');
  assert(result === "q=hello%20world", "encodes spaces");
});

// --- parse_headers ---
test("parse_headers single", () => {
  const result = run('import net\nlet h = net.parse_headers("Content-Type: text/html")\nh["Content-Type"]');
  assert(result === "text/html", "parses content-type");
});

test("parse_headers multiple", () => {
  const result = run('import net\nlet h = net.parse_headers("Host: example.com\\r\\nAccept: */*")\nh["Accept"]');
  assert(result === "*/*", "parses accept header");
});

test("parse_headers trims whitespace", () => {
  const result = run('import net\nlet h = net.parse_headers("X-Custom:  value  ")\nh["X-Custom"]');
  assert(result === "value", "trims whitespace");
});

// --- Summary ---
console.log(`\n  ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
