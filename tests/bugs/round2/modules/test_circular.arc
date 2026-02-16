# Test circular imports
use mod_a: greet_a, a_val
print(greet_a("world"))
print(a_val)
