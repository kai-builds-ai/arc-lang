# Bug: array patterns in match not parseable
let xs = [1, 2, 3]
let result = match xs {
  [a, b, c] => a + b + c,
  _ => 0
}
print(result)
