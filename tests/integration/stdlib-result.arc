# Integration tests for stdlib/result module

use result

# ok and err constructors
let r1 = ok(42)
assert(r1.ok == true, "ok result should have ok=true")
assert(r1.value == 42, "ok result should have value")

let r2 = err("something failed")
assert(r2.ok == false, "err result should have ok=false")
assert(r2.error == "something failed", "err result should have error message")

# is_ok / is_err
assert(is_ok(r1), "is_ok on ok result")
assert(not is_err(r1), "not is_err on ok result")
assert(is_err(r2), "is_err on err result")
assert(not is_ok(r2), "not is_ok on err result")

# unwrap
assert(unwrap(r1) == 42, "unwrap ok result")

# unwrap_or
assert(unwrap_or(r1, 0) == 42, "unwrap_or ok returns value")
assert(unwrap_or(r2, 99) == 99, "unwrap_or err returns default")

# map_result
let r3 = map_result(r1, x => x * 2)
assert(is_ok(r3), "map_result ok stays ok")
assert(unwrap(r3) == 84, "map_result transforms value")

let r4 = map_result(r2, x => x * 2)
assert(is_err(r4), "map_result err stays err")

# flat_map_result
let r5 = flat_map_result(r1, x => ok(x + 10))
assert(unwrap(r5) == 52, "flat_map_result chains ok")

let r6 = flat_map_result(r1, x => err("nope"))
assert(is_err(r6), "flat_map_result can produce err")

let r7 = flat_map_result(r2, x => ok(x + 10))
assert(is_err(r7), "flat_map_result skips err")

# try_fn
let r8 = try_fn(() => 100)
assert(is_ok(r8), "try_fn wraps success")
assert(unwrap(r8) == 100, "try_fn value correct")

print("stdlib-result: all passed")
