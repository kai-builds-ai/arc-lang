// Test unary minus in various contexts
let a = -1
print("a: {a}")

let b = [-1, -2, -3]
print("b: {b}")

let c = try {
  throw("oops")
} catch err {
  -1
}
print("c: {c}")

let d = if true { -5 } el { 0 }
print("d: {d}")

// Unary minus in expressions
print(-10 + 5)
print(-(3 + 4))
