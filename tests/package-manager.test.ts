// Package Manager Tests

import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  parseArcToml,
  serializeArcToml,
  pkgInit,
  pkgAdd,
  pkgRemove,
  pkgList,
  pkgInstall,
  generateLockFile,
  type ArcToml,
} from "../compiler/src/package-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export let passed = 0;
export let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(cond: boolean, msg = "assertion failed") {
  if (!cond) throw new Error(msg);
}

function assertEq(a: any, b: any, msg?: string) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const tmpDir = resolve(__dirname, ".tmp-pkg-test");

function setup() {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
}

function cleanup() {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
}

// --- Tests ---

test("parseArcToml parses basic toml", () => {
  const input = `[package]
name = "test-pkg"
version = "1.0.0"
description = "A test"
author = "me"
license = "MIT"

[dependencies]
foo = "0.1.0"

[dev-dependencies]
bar = "0.2.0"
`;
  const toml = parseArcToml(input);
  assertEq(toml.package.name, "test-pkg");
  assertEq(toml.package.version, "1.0.0");
  assertEq(toml.dependencies.foo, "0.1.0");
  assertEq(toml["dev-dependencies"].bar, "0.2.0");
});

test("serializeArcToml round-trips", () => {
  const toml: ArcToml = {
    package: { name: "test", version: "0.1.0", description: "", author: "", license: "MIT" },
    dependencies: { foo: "1.0.0" },
    "dev-dependencies": {},
  };
  const serialized = serializeArcToml(toml);
  const parsed = parseArcToml(serialized);
  assertEq(parsed.package.name, "test");
  assertEq(parsed.dependencies.foo, "1.0.0");
});

test("pkgInit creates arc.toml", () => {
  setup();
  pkgInit(tmpDir);
  assert(existsSync(resolve(tmpDir, "arc.toml")), "arc.toml should exist");
  const content = readFileSync(resolve(tmpDir, "arc.toml"), "utf-8");
  assert(content.includes("[package]"), "should have [package] section");
  cleanup();
});

test("pkgInit does not overwrite existing", () => {
  setup();
  writeFileSync(resolve(tmpDir, "arc.toml"), "existing");
  pkgInit(tmpDir);
  const content = readFileSync(resolve(tmpDir, "arc.toml"), "utf-8");
  assertEq(content, "existing");
  cleanup();
});

test("pkgAdd adds dependency", () => {
  setup();
  pkgInit(tmpDir);
  pkgAdd("mylib", { dir: tmpDir });
  const toml = parseArcToml(readFileSync(resolve(tmpDir, "arc.toml"), "utf-8"));
  assertEq(toml.dependencies.mylib, "latest");
  cleanup();
});

test("pkgAdd --dev adds dev dependency", () => {
  setup();
  pkgInit(tmpDir);
  pkgAdd("testlib", { dev: true, dir: tmpDir });
  const toml = parseArcToml(readFileSync(resolve(tmpDir, "arc.toml"), "utf-8"));
  assertEq(toml["dev-dependencies"].testlib, "latest");
  cleanup();
});

test("pkgAdd github:user/repo", () => {
  setup();
  pkgInit(tmpDir);
  pkgAdd("github:user/repo", { dir: tmpDir });
  const toml = parseArcToml(readFileSync(resolve(tmpDir, "arc.toml"), "utf-8"));
  assertEq(toml.dependencies.repo, "github:user/repo");
  cleanup();
});

test("pkgRemove removes dependency", () => {
  setup();
  pkgInit(tmpDir);
  pkgAdd("mylib", { dir: tmpDir });
  pkgRemove("mylib", tmpDir);
  const toml = parseArcToml(readFileSync(resolve(tmpDir, "arc.toml"), "utf-8"));
  assert(!("mylib" in toml.dependencies), "mylib should be removed");
  cleanup();
});

test("pkgInstall creates arc_modules and lock file", () => {
  setup();
  pkgInit(tmpDir);
  pkgAdd("mylib", { dir: tmpDir });
  pkgInstall(tmpDir);
  assert(existsSync(resolve(tmpDir, "arc_modules")), "arc_modules should exist");
  assert(existsSync(resolve(tmpDir, "arc_modules", "mylib")), "mylib dir should exist");
  assert(existsSync(resolve(tmpDir, "arc.lock")), "arc.lock should exist");
  cleanup();
});

test("generateLockFile includes all deps", () => {
  const toml: ArcToml = {
    package: { name: "t", version: "0.1.0", description: "", author: "", license: "MIT" },
    dependencies: { a: "1.0.0" },
    "dev-dependencies": { b: "2.0.0" },
  };
  const lock = generateLockFile(toml);
  assert(lock.includes('name = "a"'), "should include dep a");
  assert(lock.includes('name = "b"'), "should include dev dep b");
});

// Final cleanup
cleanup();
