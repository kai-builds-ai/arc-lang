// Stdlib: crypto, net, error native module tests
import { lex } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../../compiler/src/interpreter.js";

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

function runStr(src: string): string {
  return toStr(run(src));
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Stdlib Crypto/Net/Error Tests:");

// ========== CRYPTO ==========

// crypto_hash
test("crypto_hash sha256", () => {
  const r = run(`crypto_hash("sha256", "hello")`);
  assert(r === "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "sha256 hello");
});

test("crypto_hash md5", () => {
  const r = run(`crypto_hash("md5", "hello")`);
  assert(r === "5d41402abc4b2a76b9719d911017c592", "md5 hello");
});

test("crypto_hash sha512", () => {
  const r = run(`crypto_hash("sha512", "hello")`);
  assert(typeof r === "string" && r.length === 128, "sha512 length 128");
});

test("crypto_hash sha1", () => {
  const r = run(`crypto_hash("sha1", "hello")`);
  assert(r === "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d", "sha1 hello");
});

test("crypto_hash empty string", () => {
  const r = run(`crypto_hash("sha256", "")`);
  assert(r === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "sha256 empty");
});

// crypto_hmac
test("crypto_hmac sha256", () => {
  const r = run(`crypto_hmac("sha256", "key", "data")`);
  assert(typeof r === "string" && r.length === 64, "hmac sha256 returns 64 hex chars");
});

test("crypto_hmac sha512", () => {
  const r = run(`crypto_hmac("sha512", "secret", "message")`);
  assert(typeof r === "string" && r.length === 128, "hmac sha512 returns 128 hex chars");
});

// crypto_random_bytes
test("crypto_random_bytes returns list", () => {
  const r = run(`crypto_random_bytes(16)`);
  assert(Array.isArray(r) && r.length === 16, "16 random bytes");
});

test("crypto_random_bytes values in range", () => {
  const r = run(`crypto_random_bytes(100)`);
  assert(Array.isArray(r) && r.every((b: number) => b >= 0 && b <= 255), "bytes 0-255");
});

test("crypto_random_bytes 0", () => {
  const r = run(`crypto_random_bytes(0)`);
  assert(Array.isArray(r) && r.length === 0, "0 bytes");
});

// crypto_random_int
test("crypto_random_int in range", () => {
  const r = run(`crypto_random_int(1, 10)`);
  assert(typeof r === "number" && r >= 1 && r <= 10, "random int 1-10");
});

test("crypto_random_int same min max", () => {
  const r = run(`crypto_random_int(5, 5)`);
  assert(r === 5, "random int 5-5 = 5");
});

test("crypto_random_int 0 to 0", () => {
  const r = run(`crypto_random_int(0, 0)`);
  assert(r === 0, "random int 0-0 = 0");
});

// crypto_uuid
test("crypto_uuid format", () => {
  const r = run(`crypto_uuid()`);
  assert(typeof r === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r), "uuid v4 format");
});

test("crypto_uuid uniqueness", () => {
  const r1 = run(`crypto_uuid()`);
  const r2 = run(`crypto_uuid()`);
  assert(r1 !== r2, "uuids are unique");
});

// crypto_encode_base64 / crypto_decode_base64
test("base64 encode", () => {
  const r = run(`crypto_encode_base64("hello")`);
  assert(r === "aGVsbG8=", "base64 encode hello");
});

test("base64 decode", () => {
  const r = run(`crypto_decode_base64("aGVsbG8=")`);
  assert(r === "hello", "base64 decode hello");
});

test("base64 roundtrip", () => {
  const r = run(`crypto_decode_base64(crypto_encode_base64("Arc language!"))`);
  assert(r === "Arc language!", "base64 roundtrip");
});

test("base64 empty", () => {
  const r = run(`crypto_encode_base64("")`);
  assert(r === "", "base64 encode empty");
});

test("base64 decode empty", () => {
  const r = run(`crypto_decode_base64("")`);
  assert(r === "", "base64 decode empty");
});

// ========== NET ==========

// net_url_parse
test("net_url_parse basic", () => {
  const r = run(`net_url_parse("https://example.com/path?q=1#frag")`);
  assert(r && r.__map, "returns map");
  assert(r.entries.get("protocol") === "https:", "protocol");
  assert(r.entries.get("host") === "example.com", "host");
  assert(r.entries.get("path") === "/path", "path");
  assert(r.entries.get("query") === "?q=1", "query");
  assert(r.entries.get("hash") === "#frag", "hash");
});

test("net_url_parse with port", () => {
  const r = run(`net_url_parse("http://localhost:3000/api")`);
  assert(r.entries.get("port") === "3000", "port 3000");
});

test("net_url_parse invalid", () => {
  const r = run(`net_url_parse("not a url")`);
  assert(r === null, "invalid url returns nil");
});

// net_url_encode / net_url_decode
test("net_url_encode", () => {
  const r = run(`net_url_encode("hello world")`);
  assert(r === "hello%20world", "url encode space");
});

test("net_url_encode special chars", () => {
  const r = run(`net_url_encode("a=b&c=d")`);
  assert(r === "a%3Db%26c%3Dd", "url encode special");
});

test("net_url_decode", () => {
  const r = run(`net_url_decode("hello%20world")`);
  assert(r === "hello world", "url decode");
});

test("net_url roundtrip", () => {
  const r = run(`net_url_decode(net_url_encode("foo bar&baz=1"))`);
  assert(r === "foo bar&baz=1", "url roundtrip");
});

// net_query_parse
test("net_query_parse", () => {
  const r = run(`net_query_parse("foo=bar&baz=42")`);
  assert(r.entries.get("foo") === "bar", "query foo");
  assert(r.entries.get("baz") === "42", "query baz");
});

test("net_query_parse with ?", () => {
  const r = run(`net_query_parse("?a=1&b=2")`);
  assert(r.entries.get("a") === "1", "query ?a");
  assert(r.entries.get("b") === "2", "query ?b");
});

// net_query_stringify
test("net_query_stringify", () => {
  const r = run(`net_query_stringify({x: "hello", y: 42})`);
  assert(typeof r === "string", "returns string");
  assert(r.includes("x=hello"), "contains x=hello");
  assert(r.includes("y=42"), "contains y=42");
});

// net_ip_is_valid
test("net_ip_is_valid ipv4 valid", () => {
  assert(run(`net_ip_is_valid("192.168.1.1")`) === true, "valid ipv4");
});

test("net_ip_is_valid ipv4 invalid", () => {
  assert(run(`net_ip_is_valid("999.999.999.999")`) === false, "invalid ipv4");
});

test("net_ip_is_valid ipv6 valid", () => {
  assert(run(`net_ip_is_valid("::1")`) === true, "valid ipv6 loopback");
});

test("net_ip_is_valid not ip", () => {
  assert(run(`net_ip_is_valid("hello")`) === false, "not an ip");
});

test("net_ip_is_valid ipv4 boundary", () => {
  assert(run(`net_ip_is_valid("0.0.0.0")`) === true, "0.0.0.0 valid");
  assert(run(`net_ip_is_valid("255.255.255.255")`) === true, "255.255.255.255 valid");
});

// ========== ERROR ==========

// error_new
test("error_new", () => {
  const r = run(`error_new("NOT_FOUND", "item not found")`);
  assert(r.__map, "returns map");
  assert(r.entries.get("kind") === "NOT_FOUND", "kind");
  assert(r.entries.get("message") === "item not found", "message");
  assert(r.entries.get("stack") === null, "stack nil");
});

// error_is_error
test("error_is_error true", () => {
  const r = run(`error_is_error(error_new("E", "msg"))`);
  assert(r === true, "is error");
});

test("error_is_error false on string", () => {
  assert(run(`error_is_error("hello")`) === false, "string not error");
});

test("error_is_error false on number", () => {
  assert(run(`error_is_error(42)`) === false, "number not error");
});

test("error_is_error false on nil", () => {
  assert(run(`error_is_error(nil)`) === false, "nil not error");
});

// error_wrap
test("error_wrap", () => {
  const r = run(`error_wrap(error_new("IO", "read failed"), "while loading config")`);
  assert(r.__map, "returns map");
  assert(r.entries.get("kind") === "IO", "preserves kind");
  assert(r.entries.get("message") === "while loading config", "new message");
  assert(r.entries.get("wrapped") !== null, "has wrapped");
});

// error_try
test("error_try success", () => {
  const r = run(`error_try(() => 42)`);
  assert(r.entries.get("ok") === true, "ok true");
  assert(r.entries.get("value") === 42, "value 42");
});

test("error_try failure", () => {
  const r = run(`error_try(() => panic("boom"))`);
  assert(r.entries.get("ok") === false, "ok false on error");
});

// Ok / Err
test("Ok", () => {
  const r = run(`Ok(10)`);
  assert(r.entries.get("ok") === true, "Ok ok");
  assert(r.entries.get("value") === 10, "Ok value");
});

test("Err", () => {
  const r = run(`Err("bad")`);
  assert(r.entries.get("ok") === false, "Err ok false");
  assert(r.entries.get("error") === "bad", "Err error");
});

// Additional utility tests
test("ord and chr roundtrip", () => {
  assert(run(`chr(ord("A"))`) === "A", "chr(ord(A))");
});

test("char_at", () => {
  assert(run(`char_at("hello", 1)`) === "e", "char_at");
});

test("index_of string", () => {
  assert(run(`index_of("hello world", "world")`) === 6, "index_of string");
});

test("index_of not found", () => {
  assert(run(`index_of("hello", "xyz")`) === null, "index_of not found");
});

export { passed, failed };
