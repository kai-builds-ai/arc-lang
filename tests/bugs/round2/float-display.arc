# BUG: 1.0 displays as "1" because JavaScript's String(1.0) = "1"
let x = 1.0
print(x)
print(type_of(x))
