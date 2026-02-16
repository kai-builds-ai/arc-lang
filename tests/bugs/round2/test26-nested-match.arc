# Nested match
let x = [1, 2]
let result = match x {
  [1, 2] => "one-two"
  [a, b] => "other pair"
  _ => "unknown"
}
print(result)
