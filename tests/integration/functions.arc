# TEST: Functions
fn add(a, b) => a + b
assert(add(3, 4) == 7, "fn arrow")

fn double(x) { x * 2 }
assert(double(5) == 10, "fn block")

# Recursion
fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }
assert(fib(0) == 0, "fib(0)")
assert(fib(1) == 1, "fib(1)")
assert(fib(10) == 55, "fib(10)")

# Factorial
fn fact(n) => if n <= 1 { 1 } el { n * fact(n - 1) }
assert(fact(5) == 120, "factorial")

# Closures
fn make_adder(n) {
  fn adder(x) => x + n
  adder
}
let add5 = make_adder(5)
assert(add5(10) == 15, "closure")

# Lambda
let square = x => x * x
assert(square(4) == 16, "lambda")

# Higher-order
fn apply(f, x) => f(x)
assert(apply(x => x + 1, 10) == 11, "higher order")

# No-arg function
fn greeting() => "hi"
assert(greeting() == "hi", "no args")

print("functions: all passed")
