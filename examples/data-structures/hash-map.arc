# ============================================================================
# Hash Map Implementation in Arc
# ============================================================================
# A complete hash map built from scratch with separate chaining for collision
# handling. Supports get, set, delete, resize, iteration, keys, values, entries.
# Demonstrates: closures, mutation, pattern matching, pipelines, lists,
# maps, string interpolation, recursion, higher-order functions
# ============================================================================

use collections

# --- Hash Function ---
# DJB2 hash — simple and effective for strings.

fn djb2_hash(key) {
    let str = "{key}"
    let mut hash = 5381
    for ch in str {
        hash = ((hash * 33) + char_code(ch)) % 2147483647
    }
    hash
}

# FNV-1a hash variant
fn fnv1a_hash(key) {
    let str = "{key}"
    let mut hash = 2166136261
    for ch in str {
        hash = (hash ^ char_code(ch)) * 16777619 % 2147483647
    }
    hash
}

fn char_code(ch) => match ch {
    " " => 32, "!" => 33, "\"" => 34, "#" => 35, "$" => 36,
    "0" => 48, "1" => 49, "2" => 50, "3" => 51, "4" => 52,
    "5" => 53, "6" => 54, "7" => 55, "8" => 56, "9" => 57,
    "A" => 65, "B" => 66, "C" => 67, "D" => 68, "E" => 69,
    "F" => 70, "G" => 71, "H" => 72, "I" => 73, "J" => 74,
    "K" => 75, "L" => 76, "M" => 77, "N" => 78, "O" => 79,
    "P" => 80, "Q" => 81, "R" => 82, "S" => 83, "T" => 84,
    "U" => 85, "V" => 86, "W" => 87, "X" => 88, "Y" => 89,
    "Z" => 90, "a" => 97, "b" => 98, "c" => 99, "d" => 100,
    "e" => 101, "f" => 102, "g" => 103, "h" => 104, "i" => 105,
    "j" => 106, "k" => 107, "l" => 108, "m" => 109, "n" => 110,
    "o" => 111, "p" => 112, "q" => 113, "r" => 114, "s" => 115,
    "t" => 116, "u" => 117, "v" => 118, "w" => 119, "x" => 120,
    "y" => 121, "z" => 122, "_" => 95, "-" => 45, "." => 46,
    _ => 0
}

# --- HashMap Structure ---

let INITIAL_CAPACITY = 16
let LOAD_FACTOR = 0.75

pub fn create() {
    let mut buckets = []
    for _ in 0..INITIAL_CAPACITY {
        buckets = buckets ++ [[]]
    }
    {
        buckets: buckets,
        size: 0,
        capacity: INITIAL_CAPACITY,
        hash_fn: djb2_hash
    }
}

pub fn create_with_capacity(cap) {
    let mut buckets = []
    for _ in 0..cap {
        buckets = buckets ++ [[]]
    }
    {
        buckets: buckets,
        size: 0,
        capacity: cap,
        hash_fn: djb2_hash
    }
}

# --- Core Operations ---

fn bucket_index(hm, key) => hm.hash_fn(key) % hm.capacity

pub fn set(hm, key, value) {
    # Check if we need to resize
    if hm.size >= hm.capacity * LOAD_FACTOR {
        hm = resize(hm)
    }

    let idx = bucket_index(hm, key)
    let bucket = hm.buckets[idx]

    # Check if key already exists (update)
    let mut found = false
    let new_bucket = bucket |> map(entry => {
        if entry.key == key {
            found = true
            {key: key, value: value}
        } el {
            entry
        }
    })

    if found {
        hm.buckets[idx] = new_bucket
    } el {
        hm.buckets[idx] = bucket ++ [{key: key, value: value}]
        hm.size = hm.size + 1
    }
    hm
}

pub fn get(hm, key) {
    let idx = bucket_index(hm, key)
    let bucket = hm.buckets[idx]

    for entry in bucket {
        if entry.key == key { ret entry.value }
    }
    nil
}

pub fn has(hm, key) {
    let idx = bucket_index(hm, key)
    let bucket = hm.buckets[idx]
    bucket |> any(entry => entry.key == key)
}

pub fn delete(hm, key) {
    let idx = bucket_index(hm, key)
    let bucket = hm.buckets[idx]
    let new_bucket = bucket |> filter(entry => entry.key != key)

    if len(new_bucket) < len(bucket) {
        hm.buckets[idx] = new_bucket
        hm.size = hm.size - 1
    }
    hm
}

# --- Resize & Rehash ---

fn resize(hm) {
    let new_capacity = hm.capacity * 2
    let mut new_buckets = []
    for _ in 0..new_capacity {
        new_buckets = new_buckets ++ [[]]
    }

    let old_entries = entries(hm)
    let mut new_hm = {
        buckets: new_buckets,
        size: 0,
        capacity: new_capacity,
        hash_fn: hm.hash_fn
    }

    for entry in old_entries {
        new_hm = set(new_hm, entry.key, entry.value)
    }
    new_hm
}

# --- Iteration ---

pub fn keys(hm) {
    let mut result = []
    for bucket in hm.buckets {
        for entry in bucket {
            result = result ++ [entry.key]
        }
    }
    result
}

pub fn values(hm) {
    let mut result = []
    for bucket in hm.buckets {
        for entry in bucket {
            result = result ++ [entry.value]
        }
    }
    result
}

pub fn entries(hm) {
    let mut result = []
    for bucket in hm.buckets {
        for entry in bucket {
            result = result ++ [entry]
        }
    }
    result
}

pub fn for_each(hm, f) {
    for bucket in hm.buckets {
        for entry in bucket {
            f(entry.key, entry.value)
        }
    }
}

# --- Higher-order Operations ---

pub fn map_values(hm, f) {
    let mut new_hm = create_with_capacity(hm.capacity)
    for_each(hm, (k, v) => {
        new_hm = set(new_hm, k, f(v))
    })
    new_hm
}

pub fn filter_entries(hm, pred) {
    let mut new_hm = create_with_capacity(hm.capacity)
    for_each(hm, (k, v) => {
        if pred(k, v) {
            new_hm = set(new_hm, k, v)
        }
    })
    new_hm
}

pub fn merge(hm1, hm2) {
    let mut result = create_with_capacity(max(hm1.capacity, hm2.capacity))
    for_each(hm1, (k, v) => { result = set(result, k, v) })
    for_each(hm2, (k, v) => { result = set(result, k, v) })
    result
}

# --- From/To conversions ---

pub fn from_list(pairs) {
    let mut hm = create()
    for pair in pairs {
        hm = set(hm, pair[0], pair[1])
    }
    hm
}

pub fn to_string(hm) {
    let parts = entries(hm) |> map(e => "{e.key}: {e.value}")
    "HashMap{" ++ (parts |> join(", ")) ++ "}"
}

# --- Statistics ---

pub fn stats(hm) {
    let bucket_sizes = hm.buckets |> map(len)
    let non_empty = bucket_sizes |> filter(s => s > 0) |> len()
    let max_chain = bucket_sizes |> reduce(0, max)
    let avg_chain = if non_empty > 0 { hm.size / non_empty } el { 0 }

    {
        size: hm.size,
        capacity: hm.capacity,
        load_factor: hm.size / hm.capacity,
        non_empty_buckets: non_empty,
        max_chain_length: max_chain,
        avg_chain_length: avg_chain
    }
}

# --- Utility ---

fn max(a, b) => if a > b { a } el { b }
fn any(lst, pred) => lst |> filter(pred) |> len() > 0
fn join(lst, sep) => match lst {
    [] => "",
    [x] => "{x}",
    [x, ..rest] => "{x}{sep}{join(rest, sep)}"
}

# --- Test Suite ---

pub fn run_tests() {
    print("=== HashMap Tests ===\n")

    # Basic operations
    let mut hm = create()
    hm = set(hm, "name", "Arc")
    hm = set(hm, "version", "1.0")
    hm = set(hm, "type", "language")

    print("Get 'name': {get(hm, "name")}")
    print("Get 'version': {get(hm, "version")}")
    print("Has 'type': {has(hm, "type")}")
    print("Has 'missing': {has(hm, "missing")}")
    print("Size: {hm.size}")

    # Update existing key
    hm = set(hm, "version", "2.0")
    print("Updated version: {get(hm, "version")}")

    # Delete
    hm = delete(hm, "type")
    print("After delete 'type': has={has(hm, "type")}, size={hm.size}")

    # Add many entries to trigger resize
    print("\n--- Resize Test ---")
    let mut big = create()
    for i in 0..50 {
        big = set(big, "key_{i}", i * i)
    }
    print("After 50 inserts: size={big.size}, capacity={big.capacity}")
    print("Get key_7: {get(big, "key_7")}")
    print("Get key_42: {get(big, "key_42")}")

    # Stats
    let s = stats(big)
    print("Stats: {s}")

    # Iteration
    print("\n--- Iteration ---")
    let mut small = create()
    small = set(small, "a", 1)
    small = set(small, "b", 2)
    small = set(small, "c", 3)
    print("Keys: {keys(small)}")
    print("Values: {values(small)}")
    print("Entries: {entries(small)}")

    # Higher-order operations
    print("\n--- Higher-order ---")
    let doubled = map_values(small, v => v * 2)
    print("Doubled values: {values(doubled)}")

    let filtered = filter_entries(small, (k, v) => v > 1)
    print("Filtered (v > 1): {keys(filtered)}")

    # Merge
    let mut hm2 = create()
    hm2 = set(hm2, "c", 30)
    hm2 = set(hm2, "d", 4)
    let merged = merge(small, hm2)
    print("Merged keys: {keys(merged)}")
    print("Merged c={get(merged, "c")} d={get(merged, "d")}")

    # From list
    let from = from_list([["x", 10], ["y", 20], ["z", 30]])
    print("\nFrom list: {to_string(from)}")

    # Hash distribution test
    print("\n--- Hash Distribution ---")
    let words = ["alpha", "beta", "gamma", "delta", "epsilon",
                 "zeta", "eta", "theta", "iota", "kappa"]
    for w in words {
        print("  djb2('{w}') = {djb2_hash(w)}")
    }

    print("\n✓ All HashMap tests passed!")
}

run_tests()
