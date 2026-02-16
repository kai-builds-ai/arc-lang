# Match with guard
let x = 15
let r = match x {
  n if n > 10 => "big"
  n if n > 5 => "medium"
  _ => "small"
}
print(r)
