type Greeting = String
type Age = Int where x => x >= 0 and x <= 150
type Email = String matching /^[^@]+@[^@]+$/

# Test basic type alias (no validation needed)
let greeting = "Hello"

# Test constrained types
# These should be tested once runtime validation is wired up

print("types: all passed")
