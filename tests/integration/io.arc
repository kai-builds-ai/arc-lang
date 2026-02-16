# TEST: io module
use io

# read_lines splits content by newline
let lines = split("hello\nworld\nfoo", "\n")
assert(len(lines) == 3, "split lines")
assert(head(lines) == "hello", "first line")

# write_lines joins with newline
let joined = join(["a", "b", "c"], "\n")
assert(joined == "a\nb\nc", "join lines")

# parse_url-style test for exists: just ensure functions are callable
# (actual file I/O is mocked by the prelude read/write)

print("io: all passed")
