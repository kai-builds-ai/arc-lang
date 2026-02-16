# Closure capture in for loops - classic bug
let mut fns = []
for i in 0..5 {
  fns = push(fns, () => i)
}
# Each closure should capture its own i
print(fns[0]())
print(fns[4]())
# Expected: 0, 4 (if properly scoped) or 4, 4 (if buggy shared capture)
