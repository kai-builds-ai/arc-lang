# TEST: stdlib/collections module

use collections

# set / unique
let s = set([1, 2, 2, 3, 3, 3])
assert(len(s) == 3, "set deduplicates length")
assert(s[0] == 1, "set first")
assert(s[1] == 2, "set second")
assert(s[2] == 3, "set third")

let u = unique([1, 1, 2])
assert(len(u) == 2, "unique length")

# group_by
let grouped = group_by([1, 2, 3, 4, 5, 6], x => x % 2)
assert(len(keys(grouped)) == 2, "group_by creates groups")

# count_by
let counted = count_by(["a", "b", "a", "c", "b", "a"], x => x)
assert(counted["a"] == 3, "count_by counts a")
assert(counted["b"] == 2, "count_by counts b")
assert(counted["c"] == 1, "count_by counts c")

# chunk
let chunked = chunk([1, 2, 3, 4, 5], 2)
assert(len(chunked) == 3, "chunk count")
assert(len(chunked[0]) == 2, "chunk first size")
assert(len(chunked[2]) == 1, "chunk last size")
assert(chunked[0][0] == 1, "chunk first elem")

let even_chunk = chunk([1, 2, 3, 4], 2)
assert(len(even_chunk) == 2, "chunk even count")

let empty_chunk = chunk([], 3)
assert(len(empty_chunk) == 0, "chunk empty list")

# flatten
let flattened = flatten([[1, 2], [3, 4]])
assert(len(flattened) == 4, "flatten length")
assert(flattened[0] == 1, "flatten first")
assert(flattened[3] == 4, "flatten last")

# zip_with
let zipped = zip_with([1, 2, 3], [10, 20, 30], (a, b) => a + b)
assert(len(zipped) == 3, "zip_with length")
assert(zipped[0] == 11, "zip_with first")
assert(zipped[2] == 33, "zip_with last")

# partition
let parts = partition([1, 2, 3, 4, 5, 6], x => x % 2 == 0)
assert(len(parts[0]) == 3, "partition passing count")
assert(len(parts[1]) == 3, "partition failing count")
assert(parts[0][0] == 2, "partition passing first")
assert(parts[1][0] == 1, "partition failing first")

# frequencies
let freq = frequencies(["a", "b", "a", "a", "b"])
assert(freq["a"] == 3, "frequencies a")
assert(freq["b"] == 2, "frequencies b")

# min_by / max_by
let wds = ["hello", "hi", "hey", "greetings"]
assert(min_by(wds, w => len(w)) == "hi", "min_by length")
assert(max_by(wds, w => len(w)) == "greetings", "max_by length")

# sort_by
let sorted = sort_by(["banana", "apple", "cherry"], w => len(w))
assert(sorted[0] == "apple", "sort_by first")
assert(sorted[2] == "cherry", "sort_by last")

# index_of
assert(index_of([10, 20, 30], 20) == 1, "index_of found")
assert(index_of([10, 20, 30], 99) == nil, "index_of not found")

# includes
assert(includes([1, 2, 3], 2) == true, "includes found")
assert(includes([1, 2, 3], 5) == false, "includes not found")

print("stdlib-collections: all passed")
