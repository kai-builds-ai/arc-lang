# Nested block scoping
let x = 1
let y = {
  let x = 10
  let z = {
    let x = 100
    x
  }
  x + z
}
print(x)
print(y)
