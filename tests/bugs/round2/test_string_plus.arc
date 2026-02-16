# Bug: + on strings silently returns NaN
let a = "hello"
let b = " world"
let result = a + b
print(result)
print(type_of(result))
# Expected: either "hello world" or an error
