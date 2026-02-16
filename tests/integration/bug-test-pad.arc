use strings

# pad_left with multi-char pad string can overshoot width
let r = pad_left("hi", 4, "abc")
print("pad_left result: '" ++ r ++ "', len: " ++ str(len(r)))
# Should be exactly 4, but "hi" (2) + "abc" (3) = 5 which >= 4, so stops at 5
assert(len(r) == 4, "pad_left should produce exactly width chars, got " ++ str(len(r)))
print("passed")
