# Module B - imports from A (circular test)
use mod_a: greet_a

pub fn greet_b(name) => "Hello from B, {name}"

pub let b_val = 20
