fn classify(x) {
  match x {
    0 => "zero",
    1 => "one",
    _ => "other"
  }
}

print(classify(0))
print(classify(1))
print(classify(42))
