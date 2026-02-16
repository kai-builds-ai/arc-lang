# Deeply nested if
let x = 3
let r = if x > 5 { "big" } el { if x > 2 { "medium" } el { if x > 0 { "small" } el { "zero" } } }
print(r)
