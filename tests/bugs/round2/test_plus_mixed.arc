# + on mixed types: number + string
let result = 1 + "hello"
print(result)
print(type_of(result))
# This should probably error, but may give "1hello" due to JS coercion
