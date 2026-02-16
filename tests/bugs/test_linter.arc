# Test linter edge cases
let x = 10
let y = x + 1
print(y)

# Variable used only in nested scope
let data = [1, 2, 3]
let mapped = [x * 2 for x in data]
print(mapped)

# Shadowing test
fn outer() {
  let val = 1
  fn inner() {
    let val = 2
    val
  }
  inner()
}
