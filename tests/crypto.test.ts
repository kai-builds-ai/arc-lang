// Crypto Module Unit Tests
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

console.log("Crypto Module Tests:");

// --- Hashing ---

test("md5 returns string", () => {
  const r = run('import crypto; crypto.md5("hello")');
  assert(typeof r === "string", "md5 returns string");
});

test("md5 known hash", () => {
  const r = run('import crypto; crypto.md5("hello")');
  assert(r === "5d41402abc4b2a76b9719d911017c592", "md5 hello");
});

test("md5 empty string", () => {
  const r = run('import crypto; crypto.md5("")');
  assert(r === "d41d8cd98f00b204e9800998ecf8427e", "md5 empty");
});

test("sha1 known hash", () => {
  const r = run('import crypto; crypto.sha1("hello")');
  assert(r === "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d", "sha1 hello");
});

test("sha256 known hash", () => {
  const r = run('import crypto; crypto.sha256("hello")');
  assert(r === "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "sha256 hello");
});

test("sha256 empty string", () => {
  const r = run('import crypto; crypto.sha256("")');
  assert(r === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "sha256 empty");
});

test("sha512 returns 128 hex chars", () => {
  const r = run('import crypto; crypto.sha512("hello")');
  assert(typeof r === "string" && r.length === 128, "sha512 length 128");
});

test("sha512 known hash", () => {
  const r = run('import crypto; crypto.sha512("hello")');
  assert(r.startsWith("9b71d224bd62f3785d96d46ad3ea3d73"), "sha512 hello prefix");
});

// --- HMAC ---

test("hmac_sha256 returns string", () => {
  const r = run('import crypto; crypto.hmac_sha256("key", "message")');
  assert(typeof r === "string", "hmac_sha256 returns string");
});

test("hmac_sha256 known value", () => {
  const r = run('import crypto; crypto.hmac_sha256("key", "The quick brown fox jumps over the lazy dog")');
  assert(r === "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8", "hmac_sha256 known");
});

test("hmac_sha512 returns string", () => {
  const r = run('import crypto; crypto.hmac_sha512("key", "message")');
  assert(typeof r === "string", "hmac_sha512 returns string");
});

test("hmac_sha512 length is 128", () => {
  const r = run('import crypto; crypto.hmac_sha512("key", "msg")');
  assert(r.length === 128, "hmac_sha512 length 128");
});

// --- Random ---

test("random_bytes returns hex string", () => {
  const r = run('import crypto; crypto.random_bytes(16)');
  assert(typeof r === "string" && r.length === 32, "random_bytes(16) => 32 hex chars");
});

test("random_bytes(0) returns empty", () => {
  const r = run('import crypto; crypto.random_bytes(0)');
  assert(r === "", "random_bytes(0) empty");
});

test("random_bytes different each call", () => {
  const r = run('import crypto; let a = crypto.random_bytes(16); let b = crypto.random_bytes(16); a != b');
  assert(r === true, "random_bytes produces different values");
});

test("random_int in range", () => {
  const r = run('import crypto; let x = crypto.random_int(1, 10); x >= 1 && x <= 10');
  assert(r === true, "random_int in [1,10]");
});

test("random_int same min max", () => {
  const r = run('import crypto; crypto.random_int(5, 5)');
  assert(r === 5, "random_int(5,5) == 5");
});

test("random_float in range", () => {
  const r = run('import crypto; let x = crypto.random_float(); x >= 0.0 && x < 1.0');
  assert(r === true, "random_float in [0,1)");
});

// --- UUID ---

test("uuid format", () => {
  const r = run('import crypto; crypto.uuid()');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert(uuidRegex.test(r), "uuid v4 format");
});

test("uuid uniqueness", () => {
  const r = run('import crypto; let a = crypto.uuid(); let b = crypto.uuid(); a != b');
  assert(r === true, "uuids are unique");
});

// --- Password Hashing ---

test("hash_password returns string", () => {
  const r = run('import crypto; crypto.hash_password("mypass", "salt123")');
  assert(typeof r === "string" && r.length === 64, "hash_password returns 64-char hex");
});

test("hash_password deterministic", () => {
  const r = run('import crypto; let a = crypto.hash_password("pw", "s"); let b = crypto.hash_password("pw", "s"); a == b');
  assert(r === true, "hash_password deterministic");
});

test("hash_password different salt", () => {
  const r = run('import crypto; let a = crypto.hash_password("pw", "s1"); let b = crypto.hash_password("pw", "s2"); a != b');
  assert(r === true, "different salt => different hash");
});

test("verify_password true", () => {
  const r = run('import crypto; let h = crypto.hash_password("pass", "salt"); crypto.verify_password("pass", "salt", h)');
  assert(r === true, "verify_password correct");
});

test("verify_password false", () => {
  const r = run('import crypto; let h = crypto.hash_password("pass", "salt"); crypto.verify_password("wrong", "salt", h)');
  assert(r === false, "verify_password wrong password");
});

// --- Encryption / Decryption ---

test("encrypt returns string", () => {
  const r = run('import crypto; crypto.encrypt("hello", "secretkey")');
  assert(typeof r === "string", "encrypt returns string");
});

test("decrypt reverses encrypt", () => {
  const r = run('import crypto; let ct = crypto.encrypt("hello world", "key123"); crypto.decrypt(ct, "key123")');
  assert(r === "hello world", "decrypt(encrypt(x)) == x");
});

test("encrypt different each time (random IV)", () => {
  const r = run('import crypto; let a = crypto.encrypt("same", "k"); let b = crypto.encrypt("same", "k"); a != b');
  assert(r === true, "encrypt uses random IV");
});

// --- Constant Time Eq ---

test("constant_time_eq true", () => {
  const r = run('import crypto; crypto.constant_time_eq("abc", "abc")');
  assert(r === true, "constant_time_eq equal strings");
});

test("constant_time_eq false", () => {
  const r = run('import crypto; crypto.constant_time_eq("abc", "abd")');
  assert(r === false, "constant_time_eq different strings");
});

test("constant_time_eq different lengths", () => {
  const r = run('import crypto; crypto.constant_time_eq("abc", "ab")');
  assert(r === false, "constant_time_eq different lengths");
});

test("constant_time_eq empty strings", () => {
  const r = run('import crypto; crypto.constant_time_eq("", "")');
  assert(r === true, "constant_time_eq empty strings");
});

// --- Summary ---
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed}`);
if (failed > 0) process.exit(1);
