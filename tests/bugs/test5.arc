# Test: string interpolation, list comprehension, for loop
let name = "world"
let greeting = "hello {name}"
let squares = [x * x for x in 1..10]
for item in [1, 2, 3] {
  print(item)
}

# do-while loop
let mut i = 0
do {
  i = i + 1
} while i < 5
