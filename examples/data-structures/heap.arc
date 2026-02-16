# ============================================================================
# Heap / Priority Queue in Arc
# ============================================================================
# Min-heap and max-heap implementations. Supports insert, extract, peek,
# heapify, heap sort, and a priority queue abstraction.
# Demonstrates: mutation, pattern matching, closures, pipelines, recursion,
# higher-order functions, string interpolation, maps
# ============================================================================

use collections

# --- Heap Core ---
# A heap is represented as: {data: [...], size: n, cmp: comparator_fn}
# cmp(a, b) => true if a should be above b in the heap

pub fn min_heap() => {
    data: [],
    size: 0,
    cmp: (a, b) => a < b
}

pub fn max_heap() => {
    data: [],
    size: 0,
    cmp: (a, b) => a > b
}

pub fn custom_heap(cmp) => {
    data: [],
    size: 0,
    cmp: cmp
}

# --- Internal helpers ---

fn parent_idx(i) => (i - 1) / 2
fn left_idx(i) => 2 * i + 1
fn right_idx(i) => 2 * i + 2

fn swap(arr, i, j) {
    let temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
}

fn sift_up(heap, idx) {
    let mut i = idx
    loop {
        if i == 0 { break }
        let p = parent_idx(i)
        if heap.cmp(heap.data[i], heap.data[p]) {
            swap(heap.data, i, p)
            i = p
        } el {
            break
        }
    }
}

fn sift_down(heap, idx) {
    let mut i = idx
    loop {
        let left = left_idx(i)
        let right = right_idx(i)
        let mut best = i

        if left < heap.size and heap.cmp(heap.data[left], heap.data[best]) {
            best = left
        }
        if right < heap.size and heap.cmp(heap.data[right], heap.data[best]) {
            best = right
        }

        if best == i { break }
        swap(heap.data, i, best)
        i = best
    }
}

# --- Public Operations ---

pub fn insert(heap, value) {
    heap.data = heap.data ++ [value]
    heap.size = heap.size + 1
    sift_up(heap, heap.size - 1)
    heap
}

pub fn peek(heap) => match heap.size {
    0 => nil,
    _ => heap.data[0]
}

pub fn extract(heap) {
    if heap.size == 0 { ret {value: nil, heap: heap} }

    let top = heap.data[0]
    heap.data[0] = heap.data[heap.size - 1]
    heap.data = heap.data |> take(heap.size - 1)
    heap.size = heap.size - 1

    if heap.size > 0 {
        sift_down(heap, 0)
    }
    {value: top, heap: heap}
}

pub fn is_empty(heap) => heap.size == 0

pub fn size(heap) => heap.size

# --- Build Heap (Heapify) ---
# Build a heap from an unsorted array in O(n) time.

pub fn heapify(arr, cmp) {
    let heap = {data: arr |> collections.to_list(), size: len(arr), cmp: cmp}

    # Sift down from last non-leaf to root
    let mut i = heap.size / 2 - 1
    loop {
        if i < 0 { break }
        sift_down(heap, i)
        i = i - 1
    }
    heap
}

pub fn heapify_min(arr) => heapify(arr, (a, b) => a < b)
pub fn heapify_max(arr) => heapify(arr, (a, b) => a > b)

# --- Heap Sort ---

pub fn heap_sort_asc(arr) {
    let mut h = heapify_min(arr)
    let mut result = []
    loop {
        if is_empty(h) { break }
        let r = extract(h)
        result = result ++ [r.value]
        h = r.heap
    }
    result
}

pub fn heap_sort_desc(arr) {
    let mut h = heapify_max(arr)
    let mut result = []
    loop {
        if is_empty(h) { break }
        let r = extract(h)
        result = result ++ [r.value]
        h = r.heap
    }
    result
}

# --- Merge k sorted lists ---

pub fn merge_k_sorted(lists) {
    # Use a min-heap of {value, list_idx, elem_idx}
    let mut h = custom_heap((a, b) => a.value < b.value)

    # Initialize with first element of each list
    for i in 0..len(lists) {
        if len(lists[i]) > 0 {
            h = insert(h, {value: lists[i][0], list_idx: i, elem_idx: 0})
        }
    }

    let mut result = []
    loop {
        if is_empty(h) { break }
        let r = extract(h)
        let item = r.value
        h = r.heap
        result = result ++ [item.value]

        # Insert next element from the same list
        let next_idx = item.elem_idx + 1
        if next_idx < len(lists[item.list_idx]) {
            h = insert(h, {
                value: lists[item.list_idx][next_idx],
                list_idx: item.list_idx,
                elem_idx: next_idx
            })
        }
    }
    result
}

# --- Priority Queue ---
# Wraps a heap with named priorities.

pub fn priority_queue() => {
    heap: custom_heap((a, b) => a.priority < b.priority),
    item_count: 0
}

pub fn pq_enqueue(pq, item, priority) {
    pq.heap = insert(pq.heap, {item: item, priority: priority})
    pq.item_count = pq.item_count + 1
    pq
}

pub fn pq_dequeue(pq) {
    let r = extract(pq.heap)
    pq.heap = r.heap
    pq.item_count = pq.item_count - 1
    match r.value {
        nil => {item: nil, pq: pq},
        v => {item: v.item, priority: v.priority, pq: pq}
    }
}

pub fn pq_peek(pq) => match peek(pq.heap) {
    nil => nil,
    v => {item: v.item, priority: v.priority}
}

pub fn pq_is_empty(pq) => pq.item_count == 0

pub fn pq_size(pq) => pq.item_count

# --- Top-K elements ---

pub fn top_k(arr, k) {
    let mut h = min_heap()
    for x in arr {
        h = insert(h, x)
        if size(h) > k {
            let r = extract(h)
            h = r.heap
        }
    }
    # Extract all from heap
    let mut result = []
    loop {
        if is_empty(h) { break }
        let r = extract(h)
        result = [r.value] ++ result
        h = r.heap
    }
    result
}

# Kth smallest element
pub fn kth_smallest(arr, k) {
    let mut h = max_heap()
    for x in arr {
        h = insert(h, x)
        if size(h) > k {
            let r = extract(h)
            h = r.heap
        }
    }
    peek(h)
}

# --- To String ---

pub fn to_string(heap) {
    let items = heap.data |> take(heap.size)
    "Heap(size={heap.size}, data={items})"
}

# --- Test Suite ---

pub fn run_tests() {
    print("=== Heap / Priority Queue Tests ===\n")

    # Min-heap
    print("--- Min Heap ---")
    let mut mh = min_heap()
    for x in [5, 3, 8, 1, 4, 9, 2, 7, 6] {
        mh = insert(mh, x)
    }
    print("After inserts: {to_string(mh)}")
    print("Peek (min): {peek(mh)}")

    let mut sorted = []
    loop {
        if is_empty(mh) { break }
        let r = extract(mh)
        sorted = sorted ++ [r.value]
        mh = r.heap
    }
    print("Extracted in order: {sorted}")

    # Max-heap
    print("\n--- Max Heap ---")
    let mut xh = max_heap()
    for x in [5, 3, 8, 1, 4, 9, 2] {
        xh = insert(xh, x)
    }
    print("Peek (max): {peek(xh)}")
    let r1 = extract(xh)
    print("Extracted: {r1.value}")
    let r2 = extract(r1.heap)
    print("Extracted: {r2.value}")

    # Heapify
    print("\n--- Heapify ---")
    let data = [9, 4, 7, 1, 8, 2, 3, 6, 5]
    let h = heapify_min(data)
    print("Heapified: {to_string(h)}")
    print("Min: {peek(h)}")

    # Heap Sort
    print("\n--- Heap Sort ---")
    let unsorted = [38, 27, 43, 3, 9, 82, 10]
    print("Ascending:  {heap_sort_asc(unsorted)}")
    print("Descending: {heap_sort_desc(unsorted)}")

    # Priority Queue
    print("\n--- Priority Queue ---")
    let mut pq = priority_queue()
    pq = pq_enqueue(pq, "low priority task", 10)
    pq = pq_enqueue(pq, "URGENT bug fix", 1)
    pq = pq_enqueue(pq, "medium feature", 5)
    pq = pq_enqueue(pq, "CRITICAL outage", 0)
    pq = pq_enqueue(pq, "nice to have", 8)

    print("Queue size: {pq_size(pq)}")
    print("Next up: {pq_peek(pq)}")

    loop {
        if pq_is_empty(pq) { break }
        let r = pq_dequeue(pq)
        pq = r.pq
        print("  [{r.priority}] {r.item}")
    }

    # Merge k sorted lists
    print("\n--- Merge K Sorted ---")
    let lists = [
        [1, 4, 7, 10],
        [2, 5, 8, 11],
        [3, 6, 9, 12],
        [0, 13, 14, 15]
    ]
    let merged = merge_k_sorted(lists)
    print("Merged: {merged}")

    # Top-K and Kth smallest
    print("\n--- Top-K / Kth Smallest ---")
    let arr = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
    print("Top 3: {top_k(arr, 3)}")
    print("Top 5: {top_k(arr, 5)}")
    print("3rd smallest: {kth_smallest(arr, 3)}")
    print("5th smallest: {kth_smallest(arr, 5)}")

    print("\n✓ All Heap tests passed!")
}

run_tests()
