# Bug: negative literal in match pattern
let x = -1
let result = match x {
  -1 => "negative one",
  0 => "zero",
  _ => "other"
}
print(result)
