// Build System Tests

import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { newProject } from "../compiler/src/build.js";
import { serializeArcToml, type ArcToml } from "../compiler/src/package-manager.js";
import { build } from "../compiler/src/build.js";

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

const tmpDir = resolve(__dirname, ".tmp-build-test");

function setup() {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
}

function cleanup() {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
}

// --- Tests ---

test("newProject scaffolds correct structure", () => {
  setup();
  newProject("my-app", tmpDir);
  const projectDir = resolve(tmpDir, "my-app");
  assert(existsSync(resolve(projectDir, "arc.toml")), "arc.toml should exist");
  assert(existsSync(resolve(projectDir, "src", "main.arc")), "src/main.arc should exist");
  assert(existsSync(resolve(projectDir, "tests", "main.test.arc")), "tests/main.test.arc should exist");
  assert(existsSync(resolve(projectDir, "README.md")), "README.md should exist");

  const toml = readFileSync(resolve(projectDir, "arc.toml"), "utf-8");
  assert(toml.includes('name = "my-app"'), "arc.toml should have project name");

  const readme = readFileSync(resolve(projectDir, "README.md"), "utf-8");
  assert(readme.includes("# my-app"), "README should have project name");
  cleanup();
});

test("newProject refuses if dir exists", () => {
  setup();
  mkdirSync(resolve(tmpDir, "existing"), { recursive: true });
  // newProject calls process.exit, so we catch by overriding
  const origExit = process.exit;
  let exitCalled = false;
  (process as any).exit = () => { exitCalled = true; throw new Error("exit"); };
  try {
    newProject("existing", tmpDir);
  } catch {}
  (process as any).exit = origExit;
  assert(exitCalled, "should call process.exit for existing dir");
  cleanup();
});

test("build compiles project to JS", () => {
  setup();
  newProject("build-test", tmpDir);
  const projectDir = resolve(tmpDir, "build-test");

  // Write a simple main.arc that compiles
  writeFileSync(resolve(projectDir, "src", "main.arc"), `let x = 42\n`);

  build({ target: "js", dir: projectDir });
  assert(existsSync(resolve(projectDir, "dist", "build-test.js")), "dist/build-test.js should exist");
  const js = readFileSync(resolve(projectDir, "dist", "build-test.js"), "utf-8");
  assert(js.length > 0, "JS output should not be empty");
  cleanup();
});

test("build compiles project to WAT", () => {
  setup();
  newProject("wat-test", tmpDir);
  const projectDir = resolve(tmpDir, "wat-test");

  writeFileSync(resolve(projectDir, "src", "main.arc"), `let x = 42\n`);

  build({ target: "wat", dir: projectDir });
  assert(existsSync(resolve(projectDir, "dist", "wat-test.wat")), "dist/wat-test.wat should exist");
  cleanup();
});

// Final cleanup
cleanup();
