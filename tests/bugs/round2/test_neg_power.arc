# Bug: -x ** 2 should be -(x ** 2) = -4, not (-x) ** 2 = 4
let x = 2
let result = -x ** 2
print(result)
# Expected: -4 (math convention)
