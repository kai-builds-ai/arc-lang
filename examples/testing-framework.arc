// =============================================================================
// testing-framework.arc — A Test Framework Written in Arc
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, closures, higher-order
// functions, string interpolation, pattern matching, collections, async/await
// =============================================================================

import collections
import datetime

// --- ANSI colors ---
let RED = "\x1b[31m"
let GREEN = "\x1b[32m"
let YELLOW = "\x1b[33m"
let CYAN = "\x1b[36m"
let DIM = "\x1b[2m"
let BOLD = "\x1b[1m"
let RESET = "\x1b[0m"

// --- Test result ---
pub enum TestStatus {
  Passed,
  Failed(str),
  Skipped(str),
}

pub struct TestResult {
  name: str,
  suite: str,
  status: TestStatus,
  duration_ms: int,
}

// --- Test suite ---
pub struct TestSuite {
  name: str,
  mut tests: list,
  mut before_each_fn: fn?,
  mut after_each_fn: fn?,
  mut before_all_fn: fn?,
  mut after_all_fn: fn?,
}

// --- Test runner state ---
pub struct TestRunner {
  mut suites: list,
  mut current_suite: TestSuite?,
  mut results: list,
  mut only_mode: bool,
}

let mut RUNNER = TestRunner {
  suites: [],
  current_suite: null,
  results: [],
  only_mode: false,
}

// --- Describe block ---
pub fn describe(name: str, block: fn) {
  let suite = TestSuite {
    name: name,
    tests: [],
    before_each_fn: null,
    after_each_fn: null,
    before_all_fn: null,
    after_all_fn: null,
  }

  let prev_suite = RUNNER.current_suite
  RUNNER.current_suite = suite
  block()
  RUNNER.suites = RUNNER.suites |> append(RUNNER.current_suite)
  RUNNER.current_suite = prev_suite
}

// --- It block (test case) ---
pub fn it(name: str, test_fn: fn) {
  let test = {
    "name": name,
    "fn": test_fn,
    "skip": false,
    "only": false,
  }
  RUNNER.current_suite.tests = RUNNER.current_suite.tests |> append(test)
}

pub fn it_skip(name: str, test_fn: fn) {
  let test = {
    "name": name,
    "fn": test_fn,
    "skip": true,
    "only": false,
  }
  RUNNER.current_suite.tests = RUNNER.current_suite.tests |> append(test)
}

pub fn it_only(name: str, test_fn: fn) {
  RUNNER.only_mode = true
  let test = {
    "name": name,
    "fn": test_fn,
    "skip": false,
    "only": true,
  }
  RUNNER.current_suite.tests = RUNNER.current_suite.tests |> append(test)
}

// --- Hooks ---
pub fn before_each(hook: fn) {
  RUNNER.current_suite.before_each_fn = hook
}

pub fn after_each(hook: fn) {
  RUNNER.current_suite.after_each_fn = hook
}

pub fn before_all(hook: fn) {
  RUNNER.current_suite.before_all_fn = hook
}

pub fn after_all(hook: fn) {
  RUNNER.current_suite.after_all_fn = hook
}

// --- Expectation builder ---
pub struct Expect {
  actual: any,
  negated: bool,
}

pub fn expect(value: any) -> Expect {
  Expect { actual: value, negated: false }
}

pub fn not(e: Expect) -> Expect {
  Expect { actual: e.actual, negated: !e.negated }
}

fn assert_check(e: Expect, condition: bool, message: str) {
  let passes = if e.negated { !condition } else { condition }
  if !passes {
    let prefix = if e.negated { "Expected NOT: " } else { "" }
    panic("{prefix}{message}")
  }
}

// --- Matchers ---
pub fn to_equal(e: Expect, expected: any) {
  assert_check(e, e.actual == expected,
    "Expected {expected}, got {e.actual}")
}

pub fn to_be(e: Expect, expected: any) {
  to_equal(e, expected)
}

pub fn to_be_true(e: Expect) {
  assert_check(e, e.actual == true,
    "Expected true, got {e.actual}")
}

pub fn to_be_false(e: Expect) {
  assert_check(e, e.actual == false,
    "Expected false, got {e.actual}")
}

pub fn to_be_null(e: Expect) {
  assert_check(e, e.actual == null,
    "Expected null, got {e.actual}")
}

pub fn to_be_gt(e: Expect, threshold: any) {
  assert_check(e, e.actual > threshold,
    "Expected {e.actual} > {threshold}")
}

pub fn to_be_lt(e: Expect, threshold: any) {
  assert_check(e, e.actual < threshold,
    "Expected {e.actual} < {threshold}")
}

pub fn to_be_gte(e: Expect, threshold: any) {
  assert_check(e, e.actual >= threshold,
    "Expected {e.actual} >= {threshold}")
}

pub fn to_be_lte(e: Expect, threshold: any) {
  assert_check(e, e.actual <= threshold,
    "Expected {e.actual} <= {threshold}")
}

pub fn to_contain(e: Expect, item: any) {
  let contains = match e.actual {
    str => e.actual |> str::contains(item)
    list => e.actual |> collections::contains(item)
    _ => false
  }
  assert_check(e, contains,
    "Expected {e.actual} to contain {item}")
}

pub fn to_have_length(e: Expect, expected_len: int) {
  let actual_len = len(e.actual)
  assert_check(e, actual_len == expected_len,
    "Expected length {expected_len}, got {actual_len}")
}

pub fn to_match(e: Expect, pattern: str) {
  let matches = regex::matches(e.actual, pattern)
  assert_check(e, matches,
    "Expected '{e.actual}' to match /{pattern}/")
}

pub fn to_throw(e: Expect) {
  let mut threw = false
  let mut error_msg = ""
  try {
    e.actual() // actual should be a function
  } catch(err) {
    threw = true
    error_msg = "{err}"
  }
  assert_check(e, threw,
    "Expected function to throw, but it didn't")
}

pub fn to_be_type(e: Expect, expected_type: str) {
  let actual_type = type_of(e.actual)
  assert_check(e, actual_type == expected_type,
    "Expected type '{expected_type}', got '{actual_type}'")
}

pub fn to_be_close_to(e: Expect, expected: float, precision: int) {
  let factor = math::pow(10, precision)
  let rounded_actual = math::round(e.actual * factor) / factor
  let rounded_expected = math::round(expected * factor) / factor
  assert_check(e, rounded_actual == rounded_expected,
    "Expected {e.actual} to be close to {expected} (precision: {precision})")
}

// --- Run all tests ---
pub fn run() -> { passed: int, failed: int, skipped: int, duration_ms: int } {
  let start = datetime::now()
  let mut passed = 0
  let mut failed = 0
  let mut skipped = 0

  print("\n{BOLD}Running tests...{RESET}\n")

  RUNNER.suites |> each(fn(suite) {
    print("{BOLD}{CYAN}  {suite.name}{RESET}")

    // Before all hook
    if suite.before_all_fn != null {
      suite.before_all_fn()
    }

    suite.tests |> each(fn(test) {
      // Skip logic
      if test["skip"] {
        print("    {YELLOW}○ {DIM}{test["name"]} (skipped){RESET}")
        skipped = skipped + 1
        RUNNER.results = RUNNER.results |> append(TestResult {
          name: test["name"],
          suite: suite.name,
          status: TestStatus::Skipped("manually skipped"),
          duration_ms: 0,
        })
        return
      }

      // Only mode: skip non-only tests
      if RUNNER.only_mode && !test["only"] {
        skipped = skipped + 1
        return
      }

      // Before each hook
      if suite.before_each_fn != null {
        suite.before_each_fn()
      }

      let test_start = datetime::now()
      let mut status = TestStatus::Passed

      try {
        test["fn"]()
      } catch(err) {
        status = TestStatus::Failed("{err}")
      }

      let duration = datetime::diff_ms(datetime::now(), test_start)

      // After each hook
      if suite.after_each_fn != null {
        suite.after_each_fn()
      }

      match status {
        TestStatus::Passed => {
          let time_str = if duration > 100 { " {YELLOW}({duration}ms){RESET}" } else { "" }
          print("    {GREEN}✓{RESET} {DIM}{test["name"]}{RESET}{time_str}")
          passed = passed + 1
        }
        TestStatus::Failed(msg) => {
          print("    {RED}✗ {test["name"]}{RESET}")
          print("      {RED}{msg}{RESET}")
          failed = failed + 1
        }
      }

      RUNNER.results = RUNNER.results |> append(TestResult {
        name: test["name"],
        suite: suite.name,
        status: status,
        duration_ms: duration,
      })
    })

    // After all hook
    if suite.after_all_fn != null {
      suite.after_all_fn()
    }

    print("")
  })

  let total_duration = datetime::diff_ms(datetime::now(), start)

  // Summary
  print("{BOLD}  Summary:{RESET}")
  if passed > 0 { print("    {GREEN}{passed} passing{RESET}") }
  if failed > 0 { print("    {RED}{failed} failing{RESET}") }
  if skipped > 0 { print("    {YELLOW}{skipped} skipped{RESET}") }
  print("    {DIM}Duration: {total_duration}ms{RESET}\n")

  // Print failure details
  if failed > 0 {
    print("{RED}{BOLD}  Failures:{RESET}\n")
    RUNNER.results
      |> filter(fn(r) => match r.status { TestStatus::Failed(_) => true; _ => false })
      |> each_with_index(fn(r, i) {
        let msg = match r.status { TestStatus::Failed(m) => m; _ => "" }
        print("  {i + 1}) {r.suite} > {r.name}")
        print("     {RED}{msg}{RESET}\n")
      })
  }

  { passed: passed, failed: failed, skipped: skipped, duration_ms: total_duration }
}

// --- Demo: Test the testing framework itself! ---
fn main() {
  describe("Math Operations", fn() {
    it("should add numbers correctly", fn() {
      expect(1 + 1) |> to_equal(2)
      expect(0 + 0) |> to_equal(0)
      expect(-1 + 1) |> to_equal(0)
    })

    it("should multiply numbers", fn() {
      expect(3 * 4) |> to_equal(12)
      expect(0 * 100) |> to_equal(0)
    })

    it("should handle floating point", fn() {
      expect(0.1 + 0.2) |> to_be_close_to(0.3, 10)
    })

    it("should compare correctly", fn() {
      expect(10) |> to_be_gt(5)
      expect(3) |> to_be_lt(10)
      expect(5) |> to_be_gte(5)
    })
  })

  describe("String Operations", fn() {
    let mut test_str = ""

    before_each(fn() {
      test_str = "Hello, Arc!"
    })

    it("should check containment", fn() {
      expect(test_str) |> to_contain("Arc")
      expect(test_str) |> not() |> to_contain("Python")
    })

    it("should check length", fn() {
      expect(test_str) |> to_have_length(11)
    })

    it("should handle interpolation", fn() {
      let name = "World"
      expect("Hello, {name}!") |> to_equal("Hello, World!")
    })

    it_skip("should handle unicode", fn() {
      expect("🎉") |> to_have_length(1)
    })
  })

  describe("Collections", fn() {
    it("should work with lists", fn() {
      let nums = [1, 2, 3, 4, 5]
      expect(nums) |> to_have_length(5)
      expect(nums) |> to_contain(3)
      expect(nums) |> not() |> to_contain(6)
    })

    it("should support map/filter/reduce", fn() {
      let result = [1, 2, 3, 4, 5]
        |> filter(fn(n) => n % 2 == 0)
        |> map(fn(n) => n * 10)
        |> reduce(0, fn(acc, n) => acc + n)

      expect(result) |> to_equal(60)
    })

    it("should catch type errors", fn() {
      expect(fn() { null + 1 }) |> to_throw()
    })
  })

  describe("Type Checks", fn() {
    it("should identify types", fn() {
      expect(42) |> to_be_type("int")
      expect("hello") |> to_be_type("str")
      expect([1, 2]) |> to_be_type("list")
      expect(true) |> to_be_type("bool")
      expect(null) |> to_be_null()
    })

    it("should negate correctly", fn() {
      expect(42) |> not() |> to_equal(43)
      expect("hello") |> not() |> to_be_null()
    })
  })

  // Run all tests
  let results = run()

  // Exit with appropriate code
  if results.failed > 0 {
    exit(1)
  }
}
