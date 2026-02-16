# TEST: stdlib/map module

use map

# merge
let m1 = {a: 1, b: 2}
let m2 = {b: 3, c: 4}
let merged = merge(m1, m2)
assert(merged.a == 1, "merge keeps a")
assert(merged.b == 3, "merge b overwritten")
assert(merged.c == 4, "merge adds c")

# map_values
let doubled = map_values({x: 1, y: 2, z: 3}, v => v * 2)
assert(doubled.x == 2, "map_values x")
assert(doubled.y == 4, "map_values y")
assert(doubled.z == 6, "map_values z")

# map_keys
let upper_keys = map_keys({hello: 1, world: 2}, k => upper(k))
assert(upper_keys["HELLO"] == 1, "map_keys HELLO")
assert(upper_keys["WORLD"] == 2, "map_keys WORLD")

# filter_map
let filtered = filter_map({a: 1, b: 10, c: 3, d: 20}, v => v >= 10)
assert(len(keys(filtered)) == 2, "filter_map count")
assert(filtered.b == 10, "filter_map b")
assert(filtered.d == 20, "filter_map d")

# from_pairs / to_pairs
let from = from_pairs([["name", "arc"], ["ver", 1]])
assert(from.name == "arc", "from_pairs name")
assert(from.ver == 1, "from_pairs ver")

let pairs = to_pairs({a: 1, b: 2})
assert(len(pairs) == 2, "to_pairs length")

# pick
let picked = pick({a: 1, b: 2, c: 3}, ["a", "c"])
assert(picked.a == 1, "pick a")
assert(picked.c == 3, "pick c")
assert(len(keys(picked)) == 2, "pick count")

# omit
let omitted = omit({a: 1, b: 2, c: 3}, ["b"])
assert(omitted.a == 1, "omit keeps a")
assert(omitted.c == 3, "omit keeps c")
assert(len(keys(omitted)) == 2, "omit count")

print("stdlib-map: all passed")
