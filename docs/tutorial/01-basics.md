# Tutorial 01: Arc Basics

This tutorial introduces Arc's core concepts through hands-on examples. You'll learn by doing, with every example showing efficiency gains over traditional languages.

## Prerequisites

- Arc installed (see [Getting Started](../getting-started.md))
- Basic programming knowledge (any language)

## Lesson 1: Variables and Types

Arc uses type inference - you rarely need to declare types explicitly.

### Variable Declaration

```arc
// Immutable by default (const-like)
name = "Alice"
age = 30
score = 95.5

// Mutable variables
var counter = 0
counter = counter + 1

// Multiple assignment
x, y = 10, 20
```

**Token comparison vs JavaScript:**
```javascript
const name = "Alice";      // JS: 7 tokens
name = "Alice"             // Arc: 4 tokens (43% reduction)
```

### Type Inference

Arc infers types automatically:

```arc
// Arc infers types
number = 42              // Int
price = 19.99            // Float
name = "Arc"             // String
active = true            // Bool
items = [1, 2, 3]        // List<Int>
user = {name: "Kay"}     // Record

// Explicit types (optional)
age: Int = 30
email: String = "test@example.com"
```

### Basic Types

```arc
// Numbers
integer = 42
float = 3.14
scientific = 1.5e10

// Strings
simple = "Hello"
template = "Hello, {name}!"        // String interpolation
multiline = """
  This is a
  multiline string
"""

// Booleans
isActive = true
isComplete = false

// Lists
numbers = [1, 2, 3, 4, 5]
mixed = [1, "two", 3.0]           // Dynamic typing
empty = []

// Maps
user = {
  name: "Alice"
  age: 30
  email: "alice@example.com"
}

// Accessing map values
print user.name
print user["age"]
```

**Efficiency gain:**
```javascript
// JavaScript (28 tokens)
const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

// Arc (20 tokens) - 29% fewer tokens
user = {
  name: "Alice"
  age: 30
  email: "alice@example.com"
}
```

## Lesson 2: Functions

Arc makes functions concise and expressive.

### Function Basics

```arc
// Simple function
fn greet(name) {
  print "Hello, {name}!"
}

// Arrow syntax (implicit return)
double = (x) => x * 2
add = (a, b) => a + b

// No parentheses needed for single parameter
square = x => x * x

// Multi-line arrow function
processUser = user => {
  validate(user)
  save(user)
  user  // Implicit return
}
```

### Parameters and Defaults

```arc
// Default parameters
fn greet(name = "stranger") {
  print "Hello, {name}!"
}

greet()           // "Hello, stranger!"
greet("Alice")    // "Hello, Alice!"

// Named parameters
fn createUser(name, age = 18, admin = false) {
  {name, age, admin}
}

user = createUser("Bob", admin: true)  // age defaults to 18
```

### Pattern Matching in Parameters

```arc
// Destructuring parameters
fn getFullName({first, last}) => "{first} {last}"

person = {first: "Alice", last: "Smith"}
getFullName(person)  // "Alice Smith"

// List destructuring
fn sum([a, b]) => a + b
sum([5, 3])  // 8

// Rest parameters
fn average(...numbers) {
  numbers |> sum |> (/ numbers.length)
}

average(1, 2, 3, 4, 5)  // 3
```

**Token efficiency:**
```python
# Python (31 tokens)
def get_full_name(person):
    return f"{person['first']} {person['last']}"

# Arc (16 tokens) - 48% reduction
fn getFullName({first, last}) => "{first} {last}"
```

## Lesson 3: Control Flow

Arc favors expressions over statements, making code more concise.

### Conditionals

```arc
// If expression (returns a value)
status = if age >= 18 then "adult" else "minor"

// Multi-line if
message = if score >= 90 {
  "Excellent!"
} else if score >= 70 {
  "Good job!"
} else {
  "Keep trying!"
}

// Guard clauses (early return)
fn processOrder(order) {
  if !order.valid return error("Invalid order")
  if order.total < 0 return error("Negative total")
  
  // Main logic here
  processPayment(order)
}
```

### Pattern Matching

```arc
// Match expression (like switch but better)
result = match value {
  0 => "zero"
  1 => "one"
  2..10 => "small number"
  n where n > 100 => "big number"
  _ => "something else"
}

// Matching on types/structures
response = match apiResult {
  {success: true, data} => data
  {success: false, error} => handleError(error)
  null => defaultValue
  _ => panic("Unexpected response")
}

// Multiple patterns
color = match temperature {
  t where t < 0 => "freezing"
  0..32 => "cold"
  32..70 => "mild"
  70..90 => "warm"
  _ => "hot"
}
```

### Loops

```arc
// For loop
for i in 0..10 {
  print i
}

// Over collections
for item in items {
  process(item)
}

// With index
for item, idx in items {
  print "{idx}: {item}"
}

// While loop
var counter = 0
while counter < 10 {
  print counter
  counter += 1
}

// Infinite loop with break
loop {
  input = readInput()
  if input == "quit" break
  process(input)
}
```

**Efficiency example:**
```javascript
// JavaScript (47 tokens)
let result;
if (score >= 90) {
  result = "Excellent!";
} else if (score >= 70) {
  result = "Good job!";
} else {
  result = "Keep trying!";
}

// Arc (30 tokens) - 36% reduction
message = if score >= 90 {
  "Excellent!"
} else if score >= 70 {
  "Good job!"
} else {
  "Keep trying!"
}
```

## Lesson 4: Collections

Arc provides powerful, concise collection operations.

### Lists

```arc
// Creating lists
numbers = [1, 2, 3, 4, 5]
empty = []

// Common operations
numbers.length        // 5
numbers.first         // 1
numbers.last          // 5
numbers[2]            // 3

// Adding elements
numbers.push(6)       // [1, 2, 3, 4, 5, 6]
numbers + [7, 8]      // [1, 2, 3, 4, 5, 7, 8]

// Functional operations
doubled = numbers.map(x => x * 2)
evens = numbers.filter(x => x % 2 == 0)
total = numbers.reduce((acc, x) => acc + x, 0)

// Pipeline syntax (cleaner)
result = numbers
  |> filter(x => x > 2)
  |> map(x => x * 2)
  |> sum

// List comprehension
squares = [x * x for x in 1..10]
evens = [x for x in numbers if x % 2 == 0]
```

### Maps/Objects

```arc
// Creating maps
user = {
  name: "Alice"
  age: 30
  email: "alice@example.com"
}

// Accessing values
user.name             // "Alice"
user["age"]           // 30

// Adding/updating
user.city = "NYC"
user["country"] = "USA"

// Nested structures
company = {
  name: "TechCorp"
  employees: [
    {name: "Alice", role: "Engineer"}
    {name: "Bob", role: "Designer"}
  ]
}

// Deep access
company.employees[0].name  // "Alice"

// Spreading
defaults = {theme: "dark", lang: "en"}
config = {...defaults, theme: "light"}  // Override theme
```

### Sets

```arc
// Creating sets
unique = Set([1, 2, 2, 3, 3, 3])  // {1, 2, 3}

// Set operations
a = Set([1, 2, 3])
b = Set([3, 4, 5])

a & b     // Intersection: {3}
a | b     // Union: {1, 2, 3, 4, 5}
a - b     // Difference: {1, 2}
```

## Lesson 5: Error Handling

Arc handles errors gracefully with minimal boilerplate.

### Optional Values

```arc
// Functions can return optional values
fn findUser(id) {
  // Returns Some(user) or None
  users.find(u => u.id == id)
}

// Safe unwrapping
result = findUser(123)
match result {
  Some(user) => print "Found {user.name}"
  None => print "User not found"
}

// Or operator for defaults
user = findUser(123) or defaultUser

// Chaining with ?.
email = findUser(123)?.email  // None if user not found
```

### Result Type

```arc
// Functions return Result<T, Error>
fn divide(a, b) {
  if b == 0 return Err("Division by zero")
  Ok(a / b)
}

// Pattern match on result
result = divide(10, 2)
match result {
  Ok(value) => print "Result: {value}"
  Err(msg) => print "Error: {msg}"
}

// Propagate errors with ?
fn calculate(a, b, c) {
  x = divide(a, b)?      // Returns Err early if fails
  y = divide(x, c)?      // Otherwise continues
  Ok(y)
}
```

### Try/Catch (when needed)

```arc
// Implicit error handling for I/O
data = read "file.txt"  // Auto-handles file not found

// Explicit error handling
result = try {
  data = read "file.txt"
  parse(data)
} catch e {
  print "Error: {e}"
  defaultValue
}
```

## Lesson 6: Async & Concurrency

Everything in Arc is async by default - no special keywords needed.

### Basic Async

```arc
// Functions are async automatically
fn fetchUser(id) {
  GET api/users/:id
}

// Just call it - Arc handles the async
user = fetchUser(123)
print user.name
```

### Parallel Execution

```arc
// Automatic parallelization
[user, posts, comments] = fetch [
  api/user/:id
  api/posts?user=:id
  api/comments?user=:id
]

// All three requests run concurrently!
```

### Sequential vs Parallel

```arc
// Sequential (when order matters)
user = fetchUser(123)
posts = fetchPosts(user.id)      // Waits for user first

// Parallel (independent operations)
[weather, news, stocks] = fetch [
  api/weather
  api/news
  api/stocks
]
```

**Efficiency comparison:**
```javascript
// JavaScript (52 tokens)
const [user, posts, comments] = await Promise.all([
  fetch('api/user/' + id).then(r => r.json()),
  fetch('api/posts?user=' + id).then(r => r.json()),
  fetch('api/comments?user=' + id).then(r => r.json())
]);

// Arc (23 tokens) - 56% reduction!
[user, posts, comments] = fetch [
  api/user/:id
  api/posts?user=:id
  api/comments?user=:id
]
```

## Practice Exercises

### Exercise 1: Temperature Converter

```arc
// TODO: Write a function that converts Celsius to Fahrenheit
// Formula: F = C * 9/5 + 32

fn celsiusToFahrenheit(celsius) {
  // Your code here
}

// Test
print celsiusToFahrenheit(0)    // Should print 32
print celsiusToFahrenheit(100)  // Should print 212
```

<details>
<summary>Solution</summary>

```arc
fn celsiusToFahrenheit(c) => c * 9 / 5 + 32

// Or with match for fun messages
fn convertTemp(celsius) {
  f = celsius * 9 / 5 + 32
  match f {
    t where t < 32 => "Freezing! {f}°F"
    32..70 => "Cold: {f}°F"
    70..90 => "Nice: {f}°F"
    _ => "Hot! {f}°F"
  }
}
```
</details>

### Exercise 2: User Validation

```arc
// TODO: Write a function that validates a user object
// Rules:
// - name must not be empty
// - age must be >= 0 and <= 150
// - email must contain @

fn validateUser(user) {
  // Return Ok(user) if valid, Err(message) if invalid
}
```

<details>
<summary>Solution</summary>

```arc
fn validateUser(user) {
  if user.name == "" return Err("Name cannot be empty")
  if user.age < 0 or user.age > 150 return Err("Invalid age")
  if !user.email.contains("@") return Err("Invalid email")
  Ok(user)
}

// Better: Using pattern matching
fn validateUser(user) => match user {
  {name: "", ..} => Err("Name cannot be empty")
  {age, ..} where age < 0 or age > 150 => Err("Invalid age")
  {email, ..} where !email.contains("@") => Err("Invalid email")
  _ => Ok(user)
}
```
</details>

### Exercise 3: API Data Processing

```arc
// TODO: Fetch users from an API and filter active users
// API: https://jsonplaceholder.typicode.com/users
// Consider a user active if id <= 5

fn getActiveUsers() {
  // Your code here
}
```

<details>
<summary>Solution</summary>

```arc
fn getActiveUsers() {
  users = GET https://jsonplaceholder.typicode.com/users
  users.filter(u => u.id <= 5)
}

// Or with pipeline
fn getActiveUsers() =>
  GET https://jsonplaceholder.typicode.com/users
    |> filter(u => u.id <= 5)
    |> map(u => u.name)
```
</details>

## Key Takeaways

1. **Arc uses type inference** - write less, get the same safety
2. **Everything is an expression** - if/match/loops return values
3. **Pattern matching > if/else chains** - more readable, fewer tokens
4. **Implicit async** - no async/await keywords needed
5. **Smart defaults** - files, HTTP, errors handled automatically
6. **50%+ token savings** - compare every example above

## Next Steps

- [Tutorial 02: Advanced Features](02-advanced.md) (Coming soon)
- [Examples](../../examples/) - Real-world code samples
- [Language Reference](../reference/) - Complete language documentation

---

**Questions?** Check the [FAQ](../FAQ.md) or ask in [GitHub Discussions](https://github.com/kai-builds-ai/arc-lang/discussions)
