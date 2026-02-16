# Variable shadowing
let x = 10
let result = {
  let x = 20
  x
}
print(result)
print(x)
# Expected: 20, 10
