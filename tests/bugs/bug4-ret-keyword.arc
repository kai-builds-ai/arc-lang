# Bug 4: ret keyword is defined but not handled by parser
fn foo(x) {
  ret x + 1
}
print(foo(5))
