# Bug: slice with no end argument
let xs = [1, 2, 3, 4, 5]
let result = slice(xs, 2)
print(result)
# Expected: [3, 4, 5] but likely gives []
