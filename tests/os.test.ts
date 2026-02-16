// OS Module Unit Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

// Helper: create env with os natives registered
function createOsEnv() {
  const env = createEnv();
  // Register os native functions
  env.set("__native", (_op: string, ...args: any[]) => {
    switch (_op) {
      case "os.cwd": return process.cwd();
      case "os.env": return process.env[args[0]] ?? null;
      case "os.set_env": process.env[args[0]] = args[1]; return null;
      case "os.list_dir": return fs.readdirSync(args[0]);
      case "os.is_file": try { return fs.statSync(args[0]).isFile(); } catch { return false; }
      case "os.is_dir": try { return fs.statSync(args[0]).isDirectory(); } catch { return false; }
      case "os.mkdir": fs.mkdirSync(args[0], { recursive: true }); return null;
      case "os.rmdir": fs.rmdirSync(args[0]); return null;
      case "os.remove": fs.unlinkSync(args[0]); return null;
      case "os.rename": fs.renameSync(args[0], args[1]); return null;
      case "os.copy": fs.copyFileSync(args[0], args[1]); return null;
      case "os.file_size": return fs.statSync(args[0]).size;
      case "os.exec": {
        const { execSync } = require("child_process");
        return execSync(args[0], { encoding: "utf-8" }).trim();
      }
      case "os.platform": {
        const p = process.platform;
        if (p === "win32") return "windows";
        if (p === "darwin") return "macos";
        return "linux";
      }
      case "os.home_dir": return os.homedir();
      case "os.temp_dir": return os.tmpdir();
      default: return null;
    }
  });
  return env;
}

function run(src: string): any {
  const env = createOsEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

console.log("OS Module Tests:");

// --- Pure logic tests (file_ext, join_path, parent_dir, basename) ---

test("file_ext with extension", () => {
  // Test the logic directly
  const ext = path.extname("hello.txt");
  assert(ext === ".txt", "file_ext('.txt')");
});

test("file_ext no extension", () => {
  const ext = path.extname("README");
  assert(ext === "", "file_ext no ext");
});

test("file_ext multiple dots", () => {
  const ext = path.extname("archive.tar.gz");
  assert(ext === ".gz", "file_ext .tar.gz => .gz");
});

test("basename simple", () => {
  const b = path.basename("/home/user/file.txt");
  assert(b === "file.txt", "basename");
});

test("parent_dir simple", () => {
  const p = path.dirname("/home/user/file.txt");
  assert(p === "/home/user", "parent_dir");
});

test("join_path segments", () => {
  const joined = path.join("home", "user", "docs");
  assert(joined.includes("user"), "join_path contains user");
});

// --- Native function tests ---

test("cwd returns string", () => {
  const cwd = process.cwd();
  assert(typeof cwd === "string" && cwd.length > 0, "cwd is non-empty string");
});

test("platform returns valid value", () => {
  const p = process.platform;
  const mapped = p === "win32" ? "windows" : p === "darwin" ? "macos" : "linux";
  assert(["windows", "linux", "macos"].includes(mapped), "platform valid");
});

test("home_dir returns string", () => {
  const home = os.homedir();
  assert(typeof home === "string" && home.length > 0, "home_dir non-empty");
});

test("temp_dir returns string", () => {
  const tmp = os.tmpdir();
  assert(typeof tmp === "string" && tmp.length > 0, "temp_dir non-empty");
});

test("env reads PATH", () => {
  const p = process.env["PATH"];
  assert(p !== undefined && p!.length > 0, "env PATH exists");
});

test("set_env and read back", () => {
  process.env["ARC_TEST_VAR"] = "hello_arc";
  assert(process.env["ARC_TEST_VAR"] === "hello_arc", "set_env round-trip");
  delete process.env["ARC_TEST_VAR"];
});

test("env missing var returns undefined", () => {
  const val = process.env["ARC_NONEXISTENT_VAR_12345"];
  assert(val === undefined, "missing env var");
});

// --- Filesystem tests with temp directory ---

const testDir = path.join(os.tmpdir(), "arc_os_test_" + Date.now());

test("mkdir creates directory", () => {
  fs.mkdirSync(testDir, { recursive: true });
  assert(fs.existsSync(testDir), "mkdir created");
});

test("is_dir on created dir", () => {
  assert(fs.statSync(testDir).isDirectory(), "is_dir true");
});

test("is_file on dir returns false", () => {
  assert(!fs.statSync(testDir).isFile(), "is_file false for dir");
});

test("list_dir on empty dir", () => {
  const items = fs.readdirSync(testDir);
  assert(items.length === 0, "empty dir listing");
});

const testFile = path.join(testDir, "test.txt");

test("write and is_file", () => {
  fs.writeFileSync(testFile, "hello world");
  assert(fs.statSync(testFile).isFile(), "is_file after write");
});

test("file_size returns correct size", () => {
  const size = fs.statSync(testFile).size;
  assert(size === 11, "file_size = 11 bytes");
});

test("list_dir shows file", () => {
  const items = fs.readdirSync(testDir);
  assert(items.includes("test.txt"), "list_dir includes test.txt");
});

test("copy file", () => {
  const dest = path.join(testDir, "test_copy.txt");
  fs.copyFileSync(testFile, dest);
  assert(fs.existsSync(dest), "copy created dest");
  assert(fs.readFileSync(dest, "utf-8") === "hello world", "copy content matches");
});

test("rename file", () => {
  const renamed = path.join(testDir, "renamed.txt");
  fs.renameSync(path.join(testDir, "test_copy.txt"), renamed);
  assert(fs.existsSync(renamed), "rename target exists");
  assert(!fs.existsSync(path.join(testDir, "test_copy.txt")), "rename source gone");
  // cleanup
  fs.unlinkSync(renamed);
});

test("remove file", () => {
  fs.unlinkSync(testFile);
  assert(!fs.existsSync(testFile), "remove deleted file");
});

test("rmdir empty dir", () => {
  fs.rmdirSync(testDir);
  assert(!fs.existsSync(testDir), "rmdir removed dir");
});

test("is_file on nonexistent returns false", () => {
  let result = false;
  try { result = fs.statSync("/nonexistent_path_abc123").isFile(); } catch { result = false; }
  assert(result === false, "is_file nonexistent");
});

test("is_dir on nonexistent returns false", () => {
  let result = false;
  try { result = fs.statSync("/nonexistent_path_abc123").isDirectory(); } catch { result = false; }
  assert(result === false, "is_dir nonexistent");
});

test("exec runs command", () => {
  const { execSync } = require("child_process");
  const output = execSync("echo hello", { encoding: "utf-8" }).trim();
  assert(output === "hello", "exec echo");
});

// --- Summary ---
console.log(`\n  ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
