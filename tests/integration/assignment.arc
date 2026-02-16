# Test mutable reassignment
let mut x = 0
x = 1
assert(x == 1, "basic reassignment")

let mut count = 0
for i in 1..5 {
  count = count + i
}
assert(count == 10, "reassignment in loop")

# Test member assignment on maps
let mut m = {name: "arc"}
m.name = "Arc"
assert(m.name == "Arc", "member assignment")

# Test index assignment on lists
let mut items = [1, 2, 3]
items[0] = 10
assert(items[0] == 10, "index assignment")
