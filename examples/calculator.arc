# Expression Calculator
# Demonstrates: pattern matching, recursion, type variants, string parsing
# A tree-based calculator using Arc's pattern matching

# Expression tree as tagged lists
# Num(val), Add(l, r), Sub(l, r), Mul(l, r), Div(l, r)

fn eval(expr) => match expr {
  {op: "num", val} => val,
  {op: "add", left, right} => eval(left) + eval(right),
  {op: "sub", left, right} => eval(left) - eval(right),
  {op: "mul", left, right} => eval(left) * eval(right),
  {op: "div", left, right} => match eval(right) {
    0 => error("division by zero"),
    r => eval(left) / r
  },
  _ => error("unknown expression")
}

fn num(v) => {op: "num", val: v}
fn add(a, b) => {op: "add", left: a, right: b}
fn sub(a, b) => {op: "sub", left: a, right: b}
fn mul(a, b) => {op: "mul", left: a, right: b}
fn div(a, b) => {op: "div", left: a, right: b}

# (3 + 4) * 2 - 1
let expr = sub(
  mul(add(num(3), num(4)), num(2)),
  num(1)
)

let result = eval(expr)
print("(3 + 4) * 2 - 1 = {result}")

# Pretty printer
fn show(expr) => match expr {
  {op: "num", val} => "{val}",
  {op, left, right} => "({show(left)} {op} {show(right)})"
}

print("Expression: {show(expr)}")

# Batch evaluate
let exprs = [
  add(num(1), num(2)),
  mul(num(5), num(5)),
  div(num(10), num(3)),
  sub(num(100), mul(num(7), num(13)))
]

exprs |> map(e => "{show(e)} = {eval(e)}") |> each(print)
