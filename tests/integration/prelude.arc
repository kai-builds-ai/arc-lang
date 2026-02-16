# TEST: Prelude functions

# List operations
assert(len([1, 2, 3]) == 3, "len")
assert(head([1, 2, 3]) == 1, "head")
assert(last([1, 2, 3]) == 3, "last")
assert(len(tail([1, 2, 3])) == 2, "tail")
assert(head(reverse([1, 2, 3])) == 3, "reverse")
assert(sum([1, 2, 3]) == 6, "sum")
assert(head(sort([3, 1, 2])) == 1, "sort")
assert(len(take([1, 2, 3, 4], 2)) == 2, "take")
assert(len(drop([1, 2, 3, 4], 2)) == 2, "drop")
assert(len(flat([[1, 2], [3]])) == 3, "flat")
assert(len(zip([1, 2], [3, 4])) == 2, "zip")
assert(len(enumerate([1, 2])) == 2, "enumerate")
assert(find([1, 2, 3], x => x > 1) == 2, "find")
assert(any([1, 2, 3], x => x > 2) == true, "any")
assert(all([1, 2, 3], x => x > 0) == true, "all")

# Higher-order
assert(len(map([1, 2, 3], x => x * 2)) == 3, "map")
assert(head(map([1, 2, 3], x => x * 2)) == 2, "map val")
assert(len(filter([1, 2, 3, 4], x => x > 2)) == 2, "filter")
assert(reduce([1, 2, 3], (a, b) => a + b, 0) == 6, "reduce")

# String operations
assert(upper("hello") == "HELLO", "upper")
assert(lower("HELLO") == "hello", "lower")
assert(trim("  hi  ") == "hi", "trim")
assert(len(split("a,b,c", ",")) == 3, "split")
assert(join(["a", "b"], "-") == "a-b", "join")
assert(contains("hello", "ell") == true, "contains")
assert(starts("hello", "hel") == true, "starts")
assert(ends("hello", "llo") == true, "ends")
assert(replace("hello", "l", "r") == "herro", "replace")

# Conversion
assert(int("42") == 42, "int")
assert(str(42) == "42", "str")
assert(bool(1) == true, "bool true")
assert(bool(0) == false, "bool false")

# Math
assert(abs(-5) == 5, "abs")
assert(min(3, 1, 2) == 1, "min")
assert(max(3, 1, 2) == 3, "max")
assert(round(3.7) == 4, "round")

# Extra prelude
assert(type_of(42) == "int", "type_of int")
assert(type_of("hi") == "string", "type_of string")
assert(type_of(true) == "bool", "type_of bool")
assert(type_of(nil) == "nil", "type_of nil")
assert(type_of([]) == "list", "type_of list")

assert(len(keys({a: 1, b: 2})) == 2, "keys")
assert(len(values({a: 1, b: 2})) == 2, "values")
assert(len(push([1, 2], 3)) == 3, "push")
assert(head(range(5, 8)) == 5, "range fn")
assert(len(range(0, 3)) == 3, "range fn len")
assert(len(chars("abc")) == 3, "chars")
assert(repeat("ab", 3) == "ababab", "repeat")

# contains on list
assert(contains([1, 2, 3], 2) == true, "contains list")
assert(contains([1, 2, 3], 5) == false, "contains list false")

print("prelude: all passed")
