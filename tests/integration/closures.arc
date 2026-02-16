# TEST: Closures

# Basic closure capture
fn make_adder(n) {
  fn add(x) => x + n
  add
}
let add10 = make_adder(10)
assert(add10(5) == 15, "basic closure capture")

# Closure over multiple variables
fn make_linear(a, b) {
  fn f(x) => a * x + b
  f
}
let f = make_linear(2, 3)
assert(f(5) == 13, "closure multiple vars")

# Nested closures
fn outer(x) {
  fn middle(y) {
    fn inner(z) => x + y + z
    inner
  }
  middle
}
assert(outer(1)(2)(3) == 6, "nested closures")

# Closure factory returning different closures
fn make_op(op) {
  if op == "add" { (a, b) => a + b }
  el { if op == "mul" { (a, b) => a * b }
  el { (a, b) => a - b } }
}
let adder = make_op("add")
let multer = make_op("mul")
assert(adder(3, 4) == 7, "closure factory add")
assert(multer(3, 4) == 12, "closure factory mul")

# Closure captures env at definition time
let base = 100
let getter = () => base
assert(getter() == 100, "closure captures at def time")

# Lambda as closure
fn apply_twice(f, x) => f(f(x))
assert(apply_twice(x => x + 1, 0) == 2, "lambda closure apply twice")
assert(apply_twice(x => x * 2, 3) == 12, "lambda closure double twice")

# Closure used in map
let add3 = make_adder(3)
let result = map([1, 2, 3], add3)
assert(head(result) == 4, "closure in map head")
assert(last(result) == 6, "closure in map last")

# Closure used in filter
fn make_threshold(t) => x => x > t
let above5 = make_threshold(5)
let filtered = filter([1, 3, 5, 7, 9], above5)
assert(len(filtered) == 2, "closure in filter")

# Closure returning closure returning value
fn chain(a) => (b) => (c) => a + b + c
assert(chain(1)(2)(3) == 6, "triple closure chain")

# Closure with recursion
fn make_counter_fn(n) {
  fn count(x) => if x <= 0 { 0 } el { 1 + count(x - 1) }
  count
}
let counter = make_counter_fn(0)
assert(counter(5) == 5, "closure with recursion")

# IIFE-like pattern using lambda
let iife_result = ((x) => x * x)(7)
assert(iife_result == 49, "IIFE pattern")

# Closure with string
fn greeter(greeting) => name => greeting ++ " " ++ name
let hello = greeter("hello")
assert(hello("world") == "hello world", "closure with string")

# Higher-order with closure
fn compose(f, g) => x => f(g(x))
let inc_then_double = compose(x => x * 2, x => x + 1)
assert(inc_then_double(3) == 8, "compose closures")

# Closure in list
let fns = [make_adder(1), make_adder(2), make_adder(3)]
assert(fns[0](10) == 11, "closure in list 0")
assert(fns[2](10) == 13, "closure in list 2")

print("closures: all passed")
