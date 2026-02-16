# Bug: or patterns in match
let x = 2
let result = match x {
  1 | 2 | 3 => "small",
  _ => "big"
}
print(result)
