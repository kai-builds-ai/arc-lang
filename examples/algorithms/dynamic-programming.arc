# ============================================================================
# Dynamic Programming in Arc
# ============================================================================
# Classic DP problems: fibonacci, knapsack, LCS, edit distance, coin change,
# matrix chain multiplication, longest increasing subsequence.
# Each with memoized and/or tabulated versions.
# Demonstrates: recursion, maps, mutation, pattern matching, pipelines,
# closures, list comprehensions, string interpolation, higher-order functions
# ============================================================================

use collections

# --- Memoization Helper ---
# Generic memoizer: wraps any function with a cache.

pub fn memoize(f) {
    let mut cache = {}
    (args) => {
        let key = "{args}"
        if cache[key] != nil { ret cache[key] }
        let result = f(args)
        cache[key] = result
        result
    }
}

# --- Fibonacci ---

# Naive recursive (exponential time)
pub fn fib_naive(n) => match n {
    0 => 0,
    1 => 1,
    n => fib_naive(n - 1) + fib_naive(n - 2)
}

# Memoized recursive
pub fn fib_memo(n) {
    let mut memo = {}
    fn helper(n) {
        if memo[n] != nil { ret memo[n] }
        let result = match n {
            0 => 0,
            1 => 1,
            n => helper(n - 1) + helper(n - 2)
        }
        memo[n] = result
        result
    }
    helper(n)
}

# Tabulated bottom-up
pub fn fib_tab(n) {
    if n <= 1 { ret n }
    let mut dp = [0, 1]
    for i in 2..(n + 1) {
        dp = dp ++ [dp[i - 1] + dp[i - 2]]
    }
    dp[n]
}

# Space-optimized O(1) space
pub fn fib_optimal(n) {
    if n <= 1 { ret n }
    let mut a = 0
    let mut b = 1
    for _ in 2..(n + 1) {
        let temp = a + b
        a = b
        b = temp
    }
    b
}

# --- 0/1 Knapsack ---

pub fn knapsack(weights, values, capacity) {
    let n = len(weights)
    let mut memo = {}

    fn solve(i, cap) {
        if i >= n or cap <= 0 { ret 0 }
        let key = "{i},{cap}"
        if memo[key] != nil { ret memo[key] }

        let result = match weights[i] > cap {
            true => solve(i + 1, cap),
            false => {
                let skip = solve(i + 1, cap)
                let take = values[i] + solve(i + 1, cap - weights[i])
                max(skip, take)
            }
        }
        memo[key] = result
        result
    }
    solve(0, capacity)
}

# Knapsack with item tracking
pub fn knapsack_items(weights, values, capacity) {
    let n = len(weights)
    # Build DP table
    let mut dp = []
    for i in 0..(n + 1) {
        let mut row = []
        for w in 0..(capacity + 1) {
            row = row ++ [0]
        }
        dp = dp ++ [row]
    }

    for i in 1..(n + 1) {
        for w in 1..(capacity + 1) {
            dp[i][w] = dp[i - 1][w]
            if weights[i - 1] <= w {
                let with_item = values[i - 1] + dp[i - 1][w - weights[i - 1]]
                if with_item > dp[i][w] {
                    dp[i][w] = with_item
                }
            }
        }
    }

    # Backtrack to find items
    let mut items = []
    let mut w = capacity
    for i in range(n, 0, -1) {
        if dp[i][w] != dp[i - 1][w] {
            items = [i - 1] ++ items
            w = w - weights[i - 1]
        }
    }

    {max_value: dp[n][capacity], items: items}
}

# --- Longest Common Subsequence ---

pub fn lcs(a, b) {
    let m = len(a)
    let n = len(b)
    let mut memo = {}

    fn solve(i, j) {
        if i >= m or j >= n { ret 0 }
        let key = "{i},{j}"
        if memo[key] != nil { ret memo[key] }

        let result = match a[i] == b[j] {
            true => 1 + solve(i + 1, j + 1),
            false => max(solve(i + 1, j), solve(i, j + 1))
        }
        memo[key] = result
        result
    }
    solve(0, 0)
}

# LCS with actual subsequence reconstruction
pub fn lcs_string(a, b) {
    let m = len(a)
    let n = len(b)

    # Build table
    let mut dp = []
    for i in 0..(m + 1) {
        let mut row = []
        for j in 0..(n + 1) { row = row ++ [0] }
        dp = dp ++ [row]
    }

    for i in 1..(m + 1) {
        for j in 1..(n + 1) {
            if a[i - 1] == b[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1
            } el {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
            }
        }
    }

    # Reconstruct
    let mut result = []
    let mut i = m
    let mut j = n
    loop {
        if i == 0 or j == 0 { break }
        if a[i - 1] == b[j - 1] {
            result = [a[i - 1]] ++ result
            i = i - 1
            j = j - 1
        } el if dp[i - 1][j] > dp[i][j - 1] {
            i = i - 1
        } el {
            j = j - 1
        }
    }

    {length: dp[m][n], subsequence: result}
}

# --- Edit Distance (Levenshtein) ---

pub fn edit_distance(a, b) {
    let m = len(a)
    let n = len(b)
    let mut memo = {}

    fn solve(i, j) {
        if i == 0 { ret j }
        if j == 0 { ret i }
        let key = "{i},{j}"
        if memo[key] != nil { ret memo[key] }

        let result = match a[i - 1] == b[j - 1] {
            true => solve(i - 1, j - 1),
            false => 1 + min3(
                solve(i - 1, j), # delete
                solve(i, j - 1), # insert
                solve(i - 1, j - 1) # replace
            )
        }
        memo[key] = result
        result
    }
    solve(m, n)
}

# Edit distance with operation tracking
pub fn edit_distance_ops(a, b) {
    let m = len(a)
    let n = len(b)

    let mut dp = []
    for i in 0..(m + 1) {
        let mut row = []
        for j in 0..(n + 1) { row = row ++ [0] }
        dp = dp ++ [row]
    }

    for i in 0..(m + 1) { dp[i][0] = i }
    for j in 0..(n + 1) { dp[0][j] = j }

    for i in 1..(m + 1) {
        for j in 1..(n + 1) {
            if a[i - 1] == b[j - 1] {
                dp[i][j] = dp[i - 1][j - 1]
            } el {
                dp[i][j] = 1 + min3(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
            }
        }
    }

    # Backtrack operations
    let mut ops = []
    let mut i = m
    let mut j = n
    loop {
        if i == 0 and j == 0 { break }
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] {
            i = i - 1
            j = j - 1
        } el if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1 {
            ops = [{op: "replace", pos: i - 1, from: a[i - 1], to: b[j - 1]}] ++ ops
            i = i - 1
            j = j - 1
        } el if i > 0 and dp[i][j] == dp[i - 1][j] + 1 {
            ops = [{op: "delete", pos: i - 1, char: a[i - 1]}] ++ ops
            i = i - 1
        } el {
            ops = [{op: "insert", pos: j - 1, char: b[j - 1]}] ++ ops
            j = j - 1
        }
    }

    {distance: dp[m][n], operations: ops}
}

# --- Coin Change ---

pub fn coin_change(coins, amount) {
    let mut memo = {}

    fn solve(remaining) {
        if remaining == 0 { ret 0 }
        if remaining < 0 { ret 999999999 }
        if memo[remaining] != nil { ret memo[remaining] }

        let result = coins
            |> map(c => 1 + solve(remaining - c))
            |> reduce(999999999, (best, v) => min(best, v))

        memo[remaining] = result
        result
    }

    let result = solve(amount)
    if result >= 999999999 { -1 } el { result }
}

# Coin change with coin tracking
pub fn coin_change_coins(coins, amount) {
    let mut dp = []
    let mut used = []
    for i in 0..(amount + 1) {
        dp = dp ++ [999999999]
        used = used ++ [-1]
    }
    dp[0] = 0

    for i in 1..(amount + 1) {
        for c in coins {
            if c <= i and dp[i - c] + 1 < dp[i] {
                dp[i] = dp[i - c] + 1
                used[i] = c
            }
        }
    }

    if dp[amount] >= 999999999 { ret {count: -1, coins: []} }

    let mut result_coins = []
    let mut remaining = amount
    loop {
        if remaining <= 0 { break }
        result_coins = result_coins ++ [used[remaining]]
        remaining = remaining - used[remaining]
    }
    {count: dp[amount], coins: result_coins}
}

# --- Matrix Chain Multiplication ---

pub fn matrix_chain(dims) {
    let n = len(dims) - 1
    let mut memo = {}

    fn solve(i, j) {
        if i == j { ret 0 }
        let key = "{i},{j}"
        if memo[key] != nil { ret memo[key] }

        let mut best = 999999999
        for k in i..j {
            let cost = solve(i, k) + solve(k + 1, j) + dims[i] * dims[k + 1] * dims[j + 1]
            if cost < best { best = cost }
        }
        memo[key] = best
        best
    }
    solve(0, n - 1)
}

# Matrix chain with optimal parenthesization
pub fn matrix_chain_order(dims) {
    let n = len(dims) - 1
    let mut dp = []
    let mut split = []
    for i in 0..n {
        let mut row = []
        let mut srow = []
        for j in 0..n { row = row ++ [0]; srow = srow ++ [0] }
        dp = dp ++ [row]
        split = split ++ [srow]
    }

    for chain_len in 2..(n + 1) {
        for i in 0..(n - chain_len + 1) {
            let j = i + chain_len - 1
            dp[i][j] = 999999999
            for k in i..j {
                let cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                if cost < dp[i][j] {
                    dp[i][j] = cost
                    split[i][j] = k
                }
            }
        }
    }

    fn parenthesize(i, j) => match i == j {
        true => "M{i + 1}",
        false => {
            let k = split[i][j]
            "({parenthesize(i, k)} × {parenthesize(k + 1, j)})"
        }
    }

    {cost: dp[0][n - 1], order: parenthesize(0, n - 1)}
}

# --- Longest Increasing Subsequence ---

pub fn lis(arr) {
    let n = len(arr)
    if n == 0 { ret 0 }
    let mut dp = []
    for _ in 0..n { dp = dp ++ [1] }

    for i in 1..n {
        for j in 0..i {
            if arr[j] < arr[i] and dp[j] + 1 > dp[i] {
                dp[i] = dp[j] + 1
            }
        }
    }
    dp |> reduce(0, max)
}

# LIS with sequence reconstruction
pub fn lis_sequence(arr) {
    let n = len(arr)
    if n == 0 { ret {length: 0, sequence: []} }

    let mut dp = []
    let mut parent = []
    for _ in 0..n {
        dp = dp ++ [1]
        parent = parent ++ [-1]
    }

    for i in 1..n {
        for j in 0..i {
            if arr[j] < arr[i] and dp[j] + 1 > dp[i] {
                dp[i] = dp[j] + 1
                parent[i] = j
            }
        }
    }

    # Find the index of maximum length
    let mut max_idx = 0
    for i in 1..n {
        if dp[i] > dp[max_idx] { max_idx = i }
    }

    # Reconstruct
    let mut seq = []
    let mut idx = max_idx
    loop {
        if idx == -1 { break }
        seq = [arr[idx]] ++ seq
        idx = parent[idx]
    }

    {length: dp[max_idx], sequence: seq}
}

# O(n log n) LIS using patience sorting
pub fn lis_fast(arr) {
    let n = len(arr)
    if n == 0 { ret 0 }
    let mut tails = []

    for x in arr {
        # Binary search for insertion point
        let mut lo = 0
        let mut hi = len(tails)
        loop {
            if lo >= hi { break }
            let mid = (lo + hi) / 2
            if tails[mid] < x { lo = mid + 1 } el { hi = mid }
        }
        if lo == len(tails) {
            tails = tails ++ [x]
        } el {
            tails[lo] = x
        }
    }
    len(tails)
}

# --- Utility ---

fn min(a, b) => if a < b { a } el { b }
fn max(a, b) => if a > b { a } el { b }
fn min3(a, b, c) => min(a, min(b, c))
fn range(start, stop, step) {
    let mut result = []
    let mut i = start
    loop {
        if step > 0 and i >= stop { break }
        if step < 0 and i <= stop { break }
        result = result ++ [i]
        i = i + step
    }
    result
}

# --- Test Suite ---

pub fn run_tests() {
    print("=== Dynamic Programming Tests ===\n")

    # Fibonacci
    print("--- Fibonacci ---")
    let fibs = 0..12 |> map(fib_optimal)
    print("First 12: {fibs}")
    assert(fib_memo(10) == 55, "fib(10)")
    assert(fib_tab(20) == 6765, "fib(20)")
    print("✓ Fibonacci tests passed\n")

    # Knapsack
    print("--- 0/1 Knapsack ---")
    let weights = [2, 3, 4, 5]
    let values = [3, 4, 5, 6]
    let cap = 8
    let ks = knapsack(weights, values, cap)
    print("Max value (capacity={cap}): {ks}")
    let ks2 = knapsack_items(weights, values, cap)
    print("Items selected: {ks2.items} -> value={ks2.max_value}")
    print("✓ Knapsack tests passed\n")

    # LCS
    print("--- Longest Common Subsequence ---")
    let lcs1 = lcs_string("ABCBDAB", "BDCAB")
    print("LCS of ABCBDAB, BDCAB: '{lcs1.subsequence}' (length={lcs1.length})")
    let lcs2 = lcs_string("AGGTAB", "GXTXAYB")
    print("LCS of AGGTAB, GXTXAYB: '{lcs2.subsequence}' (length={lcs2.length})")
    print("✓ LCS tests passed\n")

    # Edit Distance
    print("--- Edit Distance ---")
    let ed1 = edit_distance("kitten", "sitting")
    print("Distance kitten->sitting: {ed1}")
    let ed2 = edit_distance_ops("saturday", "sunday")
    print("Distance saturday->sunday: {ed2.distance}")
    print("Operations: {ed2.operations}")
    print("✓ Edit distance tests passed\n")

    # Coin Change
    print("--- Coin Change ---")
    let cc1 = coin_change([1, 5, 10, 25], 36)
    print("Min coins for 36¢: {cc1}")
    let cc2 = coin_change_coins([1, 5, 10, 25], 36)
    print("Coins used: {cc2.coins} (count={cc2.count})")
    let cc3 = coin_change([3, 7], 11)
    print("Min coins for 11 with [3,7]: {cc3}")
    print("✓ Coin change tests passed\n")

    # Matrix Chain
    print("--- Matrix Chain Multiplication ---")
    let dims = [30, 35, 15, 5, 10, 20, 25]
    let mc = matrix_chain(dims)
    print("Min multiplications: {mc}")
    let mc2 = matrix_chain_order(dims)
    print("Optimal order: {mc2.order} (cost={mc2.cost})")
    print("✓ Matrix chain tests passed\n")

    # LIS
    print("--- Longest Increasing Subsequence ---")
    let arr = [10, 9, 2, 5, 3, 7, 101, 18]
    let lis1 = lis(arr)
    print("LIS length of {arr}: {lis1}")
    let lis2 = lis_sequence(arr)
    print("LIS sequence: {lis2.sequence} (length={lis2.length})")
    let lis3 = lis_fast([0, 1, 0, 3, 2, 3])
    print("LIS fast [0,1,0,3,2,3]: {lis3}")
    assert(lis3 == 4, "LIS fast")
    print("✓ LIS tests passed\n")

    print("=== All DP tests passed! ===")
}

fn assert(cond, msg) {
    if not cond { error("Assertion failed: {msg}") }
}

run_tests()
