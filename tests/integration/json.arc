# TEST: json module
use json

# to_json basics
assert(to_json(42) == "42", "to_json int")
assert(to_json(true) == "true", "to_json bool true")
assert(to_json(false) == "false", "to_json bool false")
assert(to_json(nil) == "null", "to_json nil")
assert(to_json([1, 2, 3]) == "[1,2,3]", "to_json list")

# to_json string - check it wraps in quotes
let js = to_json("hello")
assert(contains(js, "hello"), "to_json string contains value")
assert(len(js) == 7, "to_json string has quotes")

# to_json map
let mj = to_json({a: 1})
assert(contains(mj, "\"a\""), "to_json map has key")
assert(contains(mj, ":1"), "to_json map has value")

# from_json basics
assert(from_json("42") == 42, "from_json int")
assert(from_json("true") == true, "from_json true")
assert(from_json("false") == false, "from_json false")
assert(from_json("null") == nil, "from_json null")

# from_json string
let s = from_json("\"hello\"")
assert(s == "hello", "from_json string")

# from_json array
let arr = from_json("[1,2,3]")
assert(len(arr) == 3, "from_json array len")
assert(head(arr) == 1, "from_json array head")

# roundtrip: to_json then from_json on a map
let obj = {name: "arc", version: 1}
let json_str = to_json(obj)
let parsed = from_json(json_str)
assert(parsed["name"] == "arc", "roundtrip obj name")
assert(parsed["version"] == 1, "roundtrip obj version")

# get_path
let nested = {user: {name: {first: "John", last: "Doe"}, age: 30}}
assert(get_path(nested, "user.age") == 30, "get_path simple")
assert(get_path(nested, "user.name.first") == "John", "get_path deep")
assert(get_path(nested, "user.missing") == nil, "get_path missing")

# pretty produces multi-line output
let p = pretty({a: 1})
assert(contains(p, "\n"), "pretty has newlines")
assert(contains(p, "\"a\""), "pretty has key")

print("json: all passed")
