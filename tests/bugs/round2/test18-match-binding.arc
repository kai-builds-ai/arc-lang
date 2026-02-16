# Match with binding pattern
let x = 42
let result = match x {
  0 => "zero"
  n => "number: {n}"
}
print(result)
