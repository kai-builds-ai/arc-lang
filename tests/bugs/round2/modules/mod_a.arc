# Module A - imports from B (circular test)
use mod_b: greet_b

pub fn greet_a(name) => "Hello from A, {name}"

pub let a_val = 10
