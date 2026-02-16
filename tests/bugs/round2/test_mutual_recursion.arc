# Mutual recursion
fn is_even(n) {
  if n == 0 { true }
  el { is_odd(n - 1) }
}

fn is_odd(n) {
  if n == 0 { false }
  el { is_even(n - 1) }
}

print(is_even(10))
print(is_odd(7))
