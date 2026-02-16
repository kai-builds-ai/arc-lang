# Nested closures
fn outer(x) {
  fn inner(y) {
    x + y
  }
  inner(10)
}
print(outer(5))
