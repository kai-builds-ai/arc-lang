// ============================================================================
// Sorting Algorithms in Arc
// ============================================================================
// Implements six classic sorting algorithms: bubble sort, selection sort,
// insertion sort, merge sort, quick sort, and heap sort. Each is a pub fn.
// Includes benchmarking utilities to compare performance.
// Demonstrates: recursion, pattern matching, pipelines, closures, mutation,
// list comprehensions, destructuring, string interpolation, higher-order fns
// ============================================================================

import collections
import datetime

// --- Bubble Sort ---
// Repeatedly swap adjacent elements if they are in the wrong order.

pub fn bubble_sort(lst) {
    let mut arr = lst |> collections.to_list()
    let n = len(arr)
    for i in 0..n {
        let mut swapped = false
        for j in 0..(n - i - 1) {
            if arr[j] > arr[j + 1] {
                let temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp
                swapped = true
            }
        }
        // Early termination if no swaps occurred
        if not swapped { break }
    }
    arr
}

// --- Selection Sort ---
// Find the minimum element and place it at the beginning, repeat.

pub fn selection_sort(lst) {
    let mut arr = lst |> collections.to_list()
    let n = len(arr)
    for i in 0..n {
        let mut min_idx = i
        for j in (i + 1)..n {
            if arr[j] < arr[min_idx] {
                min_idx = j
            }
        }
        if min_idx != i {
            let temp = arr[i]
            arr[i] = arr[min_idx]
            arr[min_idx] = temp
        }
    }
    arr
}

// --- Insertion Sort ---
// Build sorted array one element at a time by inserting into correct position.

pub fn insertion_sort(lst) => match lst {
    [] => [],
    [x] => [x],
    _ => {
        let mut arr = lst |> collections.to_list()
        let n = len(arr)
        for i in 1..n {
            let key = arr[i]
            let mut j = i - 1
            loop {
                if j < 0 { break }
                if arr[j] <= key { break }
                arr[j + 1] = arr[j]
                j = j - 1
            }
            arr[j + 1] = key
        }
        arr
    }
}

// Functional insertion sort using recursion
pub fn insertion_sort_rec(lst) => match lst {
    [] => [],
    [x, ..rest] => insert_into_sorted(x, insertion_sort_rec(rest))
}

fn insert_into_sorted(x, sorted) => match sorted {
    [] => [x],
    [h, ..t] => if x <= h {
        [x] ++ sorted
    } el {
        [h] ++ insert_into_sorted(x, t)
    }
}

// --- Merge Sort ---
// Divide the list in half, sort each half, then merge.

pub fn merge_sort(lst) => match lst {
    [] => [],
    [x] => [x],
    _ => {
        let mid = len(lst) / 2
        let left = lst |> take(mid) |> merge_sort()
        let right = lst |> drop(mid) |> merge_sort()
        merge(left, right)
    }
}

fn merge(a, b) => match [a, b] {
    [[], b] => b,
    [a, []] => a,
    [[x, ..xs], [y, ..ys]] => if x <= y {
        [x] ++ merge(xs, [y] ++ ys)
    } el {
        [y] ++ merge([x] ++ xs, ys)
    }
}

// Bottom-up merge sort (iterative)
pub fn merge_sort_iterative(lst) {
    let n = len(lst)
    if n <= 1 { ret lst }
    let mut arr = lst |> collections.to_list()
    let mut width = 1
    loop {
        if width >= n { break }
        let mut i = 0
        loop {
            if i >= n { break }
            let left_end = min(i + width, n)
            let right_end = min(i + 2 * width, n)
            let left = arr |> drop(i) |> take(left_end - i)
            let right = arr |> drop(left_end) |> take(right_end - left_end)
            let merged = merge(left, right)
            for j in 0..len(merged) {
                arr[i + j] = merged[j]
            }
            i = i + 2 * width
        }
        width = width * 2
    }
    arr
}

// --- Quick Sort ---
// Partition around a pivot element, recursively sort partitions.

pub fn quick_sort(lst) => match lst {
    [] => [],
    [x] => [x],
    [pivot, ..rest] => {
        let lo = [x for x in rest if x < pivot]
        let eq = [x for x in rest if x == pivot]
        let hi = [x for x in rest if x > pivot]
        quick_sort(lo) ++ [pivot] ++ eq ++ quick_sort(hi)
    }
}

// Quick sort with custom comparator
pub fn quick_sort_by(lst, cmp) => match lst {
    [] => [],
    [pivot, ..rest] => {
        let lo = rest |> filter(x => cmp(x, pivot) < 0)
        let eq = rest |> filter(x => cmp(x, pivot) == 0)
        let hi = rest |> filter(x => cmp(x, pivot) > 0)
        quick_sort_by(lo, cmp) ++ [pivot] ++ eq ++ quick_sort_by(hi, cmp)
    }
}

// Three-way partition quick sort (Dutch National Flag)
pub fn quick_sort_3way(lst) => match lst {
    [] => [],
    [x] => [x],
    _ => {
        let pivot = lst[len(lst) / 2]
        let lo = [x for x in lst if x < pivot]
        let eq = [x for x in lst if x == pivot]
        let hi = [x for x in lst if x > pivot]
        quick_sort_3way(lo) ++ eq ++ quick_sort_3way(hi)
    }
}

// --- Heap Sort ---
// Build a max-heap, then repeatedly extract the maximum.

pub fn heap_sort(lst) {
    let mut arr = lst |> collections.to_list()
    let n = len(arr)

    // Build max heap
    let mut i = n / 2 - 1
    loop {
        if i < 0 { break }
        heapify(arr, n, i)
        i = i - 1
    }

    // Extract elements from heap one by one
    let mut end = n - 1
    loop {
        if end <= 0 { break }
        // Swap root (max) with last element
        let temp = arr[0]
        arr[0] = arr[end]
        arr[end] = temp
        // Heapify reduced heap
        heapify(arr, end, 0)
        end = end - 1
    }
    arr
}

fn heapify(arr, n, i) {
    let mut largest = i
    let left = 2 * i + 1
    let right = 2 * i + 2

    if left < n and arr[left] > arr[largest] {
        largest = left
    }
    if right < n and arr[right] > arr[largest] {
        largest = right
    }

    if largest != i {
        let temp = arr[i]
        arr[i] = arr[largest]
        arr[largest] = temp
        heapify(arr, n, largest)
    }
}

// --- Utility Functions ---

fn min(a, b) => if a < b { a } el { b }
fn max(a, b) => if a > b { a } el { b }

// Generate a random-ish list for benchmarking
fn generate_test_data(size) {
    let mut data = []
    let mut seed = 42
    for _ in 0..size {
        seed = (seed * 1103515245 + 12345) % 2147483648
        data = data ++ [seed % 10000]
    }
    data
}

// Benchmark a sorting function
fn benchmark(name, sort_fn, data) {
    let start = datetime.now()
    let result = sort_fn(data)
    let elapsed = datetime.now() - start
    let sorted_check = is_sorted(result)
    print("[{name}] Time: {elapsed}ms | Sorted: {sorted_check} | Size: {len(data)}")
    result
}

pub fn is_sorted(lst) => match lst {
    [] => true,
    [_] => true,
    [a, b, ..rest] => if a <= b { is_sorted([b] ++ rest) } el { false }
}

// --- Benchmarking Suite ---

pub fn run_benchmarks() {
    let sizes = [100, 500, 1000]

    for size in sizes {
        print("\n=== Sorting {size} elements ===")
        let data = generate_test_data(size)

        benchmark("Bubble Sort   ", bubble_sort, data)
        benchmark("Selection Sort", selection_sort, data)
        benchmark("Insertion Sort", insertion_sort, data)
        benchmark("Merge Sort    ", merge_sort, data)
        benchmark("Quick Sort    ", quick_sort, data)
        benchmark("Heap Sort     ", heap_sort, data)
    }

    // Test edge cases
    print("\n=== Edge Cases ===")
    let empty = []
    let single = [42]
    let already_sorted = [1, 2, 3, 4, 5]
    let reversed = [5, 4, 3, 2, 1]
    let duplicates = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]

    let algorithms = [
        {name: "bubble", fn: bubble_sort},
        {name: "selection", fn: selection_sort},
        {name: "insertion", fn: insertion_sort},
        {name: "merge", fn: merge_sort},
        {name: "quick", fn: quick_sort},
        {name: "heap", fn: heap_sort}
    ]

    for algo in algorithms {
        let f = algo.fn
        assert(f(empty) == [], "{algo.name} failed on empty")
        assert(f(single) == [42], "{algo.name} failed on single")
        assert(f(already_sorted) == [1, 2, 3, 4, 5], "{algo.name} failed on sorted")
        assert(f(reversed) == [1, 2, 3, 4, 5], "{algo.name} failed on reversed")
        assert(is_sorted(f(duplicates)), "{algo.name} failed on duplicates")
        print("[{algo.name}] All edge cases passed ✓")
    }

    // Custom comparator demo
    print("\n=== Custom Sort ===")
    let words = ["banana", "apple", "cherry", "date", "elderberry"]
    let by_length = quick_sort_by(words, (a, b) => len(a) - len(b))
    print("Sorted by length: {by_length}")

    let descending = quick_sort_by([5, 2, 8, 1, 9], (a, b) => b - a)
    print("Descending: {descending}")
}

fn assert(cond, msg) {
    if not cond { error("Assertion failed: {msg}") }
}

// Run everything
run_benchmarks()
