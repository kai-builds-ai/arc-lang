# TEST: List operations

# push
let l = push([1, 2, 3], 4)
assert(len(l) == 4, "push len")
assert(last(l) == 4, "push last")

# map
let mapped = map([1, 2, 3], x => x * 10)
assert(head(mapped) == 10, "map head")
assert(last(mapped) == 30, "map last")

# filter
let evens = filter([1, 2, 3, 4, 5, 6], x => x % 2 == 0)
assert(len(evens) == 3, "filter len")
assert(head(evens) == 2, "filter head")

# reduce
let total = reduce([1, 2, 3, 4], (a, b) => a + b, 0)
assert(total == 10, "reduce sum")

# reduce without init
let total2 = reduce([1, 2, 3, 4], (a, b) => a + b)
assert(total2 == 10, "reduce no init")

# sort
let sorted = sort([3, 1, 4, 1, 5])
assert(head(sorted) == 1, "sort head")
assert(last(sorted) == 5, "sort last")

# reverse
let rev = reverse([1, 2, 3])
assert(head(rev) == 3, "reverse head")
assert(last(rev) == 1, "reverse last")

# flat
let flattened = flat([[1, 2], [3, 4], [5]])
assert(len(flattened) == 5, "flat len")
assert(head(flattened) == 1, "flat head")

# find
let found = find([10, 20, 30], x => x > 15)
assert(found == 20, "find")

# find returns nil when not found
let notfound = find([1, 2, 3], x => x > 100)
assert(notfound == nil, "find nil")

# any (some)
assert(any([1, 2, 3], x => x > 2) == true, "any true")
assert(any([1, 2, 3], x => x > 5) == false, "any false")

# all (every)
assert(all([2, 4, 6], x => x % 2 == 0) == true, "all true")
assert(all([2, 3, 6], x => x % 2 == 0) == false, "all false")

# zip
let zipped = zip([1, 2, 3], ["a", "b", "c"])
assert(len(zipped) == 3, "zip len")
let first_pair = zipped[0]
assert(first_pair[0] == 1, "zip first 0")
assert(first_pair[1] == "a", "zip first 1")

# enumerate
let en = enumerate(["a", "b", "c"])
assert(len(en) == 3, "enumerate len")
assert(en[0][0] == 0, "enumerate idx")
assert(en[0][1] == "a", "enumerate val")
assert(en[2][0] == 2, "enumerate last idx")

# slice
let sliced = slice([10, 20, 30, 40, 50], 1, 4)
assert(len(sliced) == 3, "slice len")
assert(head(sliced) == 20, "slice head")
assert(last(sliced) == 40, "slice last")

# len
assert(len([]) == 0, "len empty")
assert(len([1]) == 1, "len one")

# indexing
let nums = [10, 20, 30]
assert(nums[0] == 10, "index 0")
assert(nums[1] == 20, "index 1")
assert(nums[2] == 30, "index 2")

# head / tail / last
assert(head([5, 6, 7]) == 5, "head")
assert(last([5, 6, 7]) == 7, "last")
let t = tail([5, 6, 7])
assert(len(t) == 2, "tail len")
assert(head(t) == 6, "tail head")

# nested lists
let matrix = [[1, 2], [3, 4]]
assert(matrix[0][0] == 1, "nested index 0,0")
assert(matrix[1][1] == 4, "nested index 1,1")

# sum
assert(sum([1, 2, 3, 4, 5]) == 15, "sum")
assert(sum([]) == 0, "sum empty")

# take / drop
let taken = take([1, 2, 3, 4, 5], 3)
assert(len(taken) == 3, "take len")
assert(last(taken) == 3, "take last")
let dropped = drop([1, 2, 3, 4, 5], 3)
assert(len(dropped) == 2, "drop len")
assert(head(dropped) == 4, "drop head")

# concat
let cat = concat([1, 2], [3, 4])
assert(len(cat) == 4, "concat len")

# list ++ operator
let cat2 = [10, 20] ++ [30, 40]
assert(len(cat2) == 4, "++ len")
assert(head(cat2) == 10, "++ head")
assert(last(cat2) == 40, "++ last")

# min/max on lists
assert(min([3, 1, 2]) == 1, "min list")
assert(max([3, 1, 2]) == 3, "max list")

# fold
let folded = fold([1, 2, 3, 4], 0, (acc, x) => acc + x)
assert(folded == 10, "fold sum")

# contains on list
assert(contains([1, 2, 3], 2) == true, "list contains true")
assert(contains([1, 2, 3], 5) == false, "list contains false")

print("list-ops: all passed")
