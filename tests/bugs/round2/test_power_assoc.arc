# Bug: ** should be right-associative
# 2 ** 3 ** 2 should be 2 ** 9 = 512, not 8 ** 2 = 64
let result = 2 ** 3 ** 2
print(result)
# Expected: 512
