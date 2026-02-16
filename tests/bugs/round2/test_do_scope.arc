# Bug: do loop body doesn't create new scope
let mut x = 0
let mut i = 0
do {
  let y = i
  i = i + 1
  x = x + y
} while i < 5
print(x)
# Should print 10 (0+1+2+3+4)
