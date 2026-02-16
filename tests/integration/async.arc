# TEST: Async/Await and Fetch

# Basic async/await
let task = async { 42 }
let result = await task
assert(result == 42, "basic async/await")

# Async with computation
let task2 = async { 10 + 20 + 30 }
assert(await task2 == 60, "async computation")

# Await on non-async value passes through
assert(await 99 == 99, "await non-async")

# Fetch parallel evaluation
let a = async { 1 }
let b = async { 2 }
let c = async { 3 }
let results = fetch [a, b, c]
assert(len(results) == 3, "fetch returns list")
assert(results[0] == 1, "fetch first")
assert(results[1] == 2, "fetch second")
assert(results[2] == 3, "fetch third")

# Fetch with inline expressions
let vals = fetch [async { 10 }, async { 20 }]
assert(vals[0] == 10, "fetch inline first")
assert(vals[1] == 20, "fetch inline second")

# Async function
async fn compute(x) => x * 2
let r = compute(21)
assert(r == 42, "async fn auto-await")

# Async function with block body
async fn add(a, b) {
  a + b
}
assert(add(3, 4) == 7, "async fn block body")

# Fetch with direct values (no async wrapper)
let direct = fetch [1, 2, 3]
assert(direct[0] == 1, "fetch direct values")

print("async: all passed")
