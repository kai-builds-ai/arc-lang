// =============================================================================
// linked-list.arc — Linked List Data Structure
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, closures, higher-order
// functions, pattern matching, recursion, string interpolation, collections
// =============================================================================

import collections

// --- Node structure ---
pub struct Node {
  value: any,
  mut next: Node?,
}

// --- LinkedList structure ---
pub struct LinkedList {
  mut head: Node?,
  mut size: int,
}

// --- Create empty list ---
pub fn new_list() -> LinkedList {
  LinkedList { head: null, size: 0 }
}

// --- Prepend: add to front O(1) ---
pub fn prepend(list: mut LinkedList, value: any) -> LinkedList {
  let node = Node { value: value, next: list.head }
  list.head = node
  list.size = list.size + 1
  list
}

// --- Append: add to end O(n) ---
pub fn append(list: mut LinkedList, value: any) -> LinkedList {
  let node = Node { value: value, next: null }

  match list.head {
    null => { list.head = node }
    _ => {
      let mut current = list.head
      while current.next != null {
        current = current.next
      }
      current.next = node
    }
  }

  list.size = list.size + 1
  list
}

// --- Insert at index ---
pub fn insert_at(list: mut LinkedList, index: int, value: any) -> LinkedList {
  if index < 0 || index > list.size {
    panic("Index {index} out of bounds for list of size {list.size}")
  }

  if index == 0 {
    return prepend(list, value)
  }

  let node = Node { value: value, next: null }
  let mut current = list.head
  let mut i = 0

  while i < index - 1 {
    current = current.next
    i = i + 1
  }

  node.next = current.next
  current.next = node
  list.size = list.size + 1
  list
}

// --- Get value at index ---
pub fn get(list: LinkedList, index: int) -> any {
  if index < 0 || index >= list.size {
    panic("Index {index} out of bounds for list of size {list.size}")
  }

  let mut current = list.head
  let mut i = 0
  while i < index {
    current = current.next
    i = i + 1
  }
  current.value
}

// --- Remove first occurrence of value ---
pub fn remove(list: mut LinkedList, value: any) -> bool {
  match list.head {
    null => false
    _ => {
      if list.head.value == value {
        list.head = list.head.next
        list.size = list.size - 1
        return true
      }

      let mut current = list.head
      while current.next != null {
        if current.next.value == value {
          current.next = current.next.next
          list.size = list.size - 1
          return true
        }
        current = current.next
      }
      false
    }
  }
}

// --- Remove at index ---
pub fn remove_at(list: mut LinkedList, index: int) -> any {
  if index < 0 || index >= list.size {
    panic("Index {index} out of bounds")
  }

  let removed_value = if index == 0 {
    let val = list.head.value
    list.head = list.head.next
    val
  } else {
    let mut current = list.head
    let mut i = 0
    while i < index - 1 {
      current = current.next
      i = i + 1
    }
    let val = current.next.value
    current.next = current.next.next
    val
  }

  list.size = list.size - 1
  removed_value
}

// --- Find: returns index or -1 ---
pub fn find(list: LinkedList, value: any) -> int {
  let mut current = list.head
  let mut i = 0

  while current != null {
    if current.value == value {
      return i
    }
    current = current.next
    i = i + 1
  }
  -1
}

// --- Find with predicate ---
pub fn find_by(list: LinkedList, predicate: fn) -> any {
  let mut current = list.head
  while current != null {
    if predicate(current.value) {
      return current.value
    }
    current = current.next
  }
  null
}

// --- Contains ---
pub fn contains(list: LinkedList, value: any) -> bool {
  find(list, value) != -1
}

// --- Length ---
pub fn length(list: LinkedList) -> int {
  list.size
}

// --- Is empty ---
pub fn is_empty(list: LinkedList) -> bool {
  list.size == 0
}

// --- Reverse the list in place ---
pub fn reverse(list: mut LinkedList) -> LinkedList {
  let mut prev = null
  let mut current = list.head

  while current != null {
    let next = current.next
    current.next = prev
    prev = current
    current = next
  }

  list.head = prev
  list
}

// --- Map: transform each element ---
pub fn ll_map(list: LinkedList, transform: fn) -> LinkedList {
  let mut result = new_list()
  let mut current = list.head
  let mut values = []

  while current != null {
    values = values |> collections::append(transform(current.value))
    current = current.next
  }

  // Build in order
  values |> each(fn(v) {
    append(result, v)
  })
  result
}

// --- Filter: keep elements matching predicate ---
pub fn ll_filter(list: LinkedList, predicate: fn) -> LinkedList {
  let mut result = new_list()
  let mut current = list.head

  while current != null {
    if predicate(current.value) {
      append(result, current.value)
    }
    current = current.next
  }
  result
}

// --- Reduce: fold elements into accumulator ---
pub fn ll_reduce(list: LinkedList, initial: any, reducer: fn) -> any {
  let mut acc = initial
  let mut current = list.head

  while current != null {
    acc = reducer(acc, current.value)
    current = current.next
  }
  acc
}

// --- ForEach ---
pub fn for_each(list: LinkedList, callback: fn) {
  let mut current = list.head
  while current != null {
    callback(current.value)
    current = current.next
  }
}

// --- Convert to array ---
pub fn to_list(list: LinkedList) -> list {
  let mut result = []
  let mut current = list.head

  while current != null {
    result = result |> collections::append(current.value)
    current = current.next
  }
  result
}

// --- Create from array ---
pub fn from_list(arr: list) -> LinkedList {
  let mut ll = new_list()
  arr |> each(fn(item) {
    append(ll, item)
  })
  ll
}

// --- Merge sort ---
pub fn sort(list: mut LinkedList, compare: fn) -> LinkedList {
  if list.size <= 1 {
    return list
  }

  // Split into two halves
  let mid = list.size / 2
  let mut left = new_list()
  let mut right = new_list()

  let mut current = list.head
  let mut i = 0
  while current != null {
    if i < mid {
      append(left, current.value)
    } else {
      append(right, current.value)
    }
    current = current.next
    i = i + 1
  }

  // Recursively sort both halves
  left = sort(left, compare)
  right = sort(right, compare)

  // Merge
  merge(left, right, compare)
}

fn merge(left: LinkedList, right: LinkedList, compare: fn) -> LinkedList {
  let mut result = new_list()
  let mut l = left.head
  let mut r = right.head

  while l != null && r != null {
    if compare(l.value, r.value) <= 0 {
      append(result, l.value)
      l = l.next
    } else {
      append(result, r.value)
      r = r.next
    }
  }

  while l != null {
    append(result, l.value)
    l = l.next
  }

  while r != null {
    append(result, r.value)
    r = r.next
  }

  result
}

// --- Concatenate two lists ---
pub fn concat(a: LinkedList, b: LinkedList) -> LinkedList {
  let mut result = new_list()
  for_each(a, fn(v) { append(result, v) })
  for_each(b, fn(v) { append(result, v) })
  result
}

// --- Nth from end ---
pub fn nth_from_end(list: LinkedList, n: int) -> any {
  let idx = list.size - 1 - n
  if idx < 0 { panic("Index out of bounds") }
  get(list, idx)
}

// --- Detect cycle (Floyd's algorithm) ---
pub fn has_cycle(list: LinkedList) -> bool {
  let mut slow = list.head
  let mut fast = list.head

  while fast != null && fast.next != null {
    slow = slow.next
    fast = fast.next.next
    if slow == fast { return true }
  }
  false
}

// --- To string ---
pub fn to_string(list: LinkedList) -> str {
  let items = to_list(list)
    |> map(fn(v) => "{v}")
    |> str::join(" -> ")
  "[{items}]"
}

// --- Demo ---
fn main() {
  let mut ll = new_list()

  // Build the list
  ll |> append(3) |> append(1) |> append(4) |> append(1) |> append(5) |> append(9)
  print("Original: {to_string(ll)}")
  print("Length: {length(ll)}")

  // Prepend
  ll |> prepend(0)
  print("After prepend 0: {to_string(ll)}")

  // Insert at index
  ll |> insert_at(3, 99)
  print("After insert 99 at index 3: {to_string(ll)}")

  // Find
  let idx = find(ll, 4)
  print("Index of 4: {idx}")

  // Remove
  remove(ll, 99)
  print("After remove 99: {to_string(ll)}")

  // Reverse
  reverse(ll)
  print("Reversed: {to_string(ll)}")

  // Sort
  let sorted = sort(ll, fn(a, b) => a - b)
  print("Sorted: {to_string(sorted)}")

  // Map
  let doubled = ll_map(sorted, fn(x) => x * 2)
  print("Doubled: {to_string(doubled)}")

  // Filter
  let big = ll_filter(sorted, fn(x) => x > 3)
  print("Greater than 3: {to_string(big)}")

  // Reduce
  let sum = ll_reduce(sorted, 0, fn(acc, x) => acc + x)
  print("Sum: {sum}")

  // From/to array
  let arr = [10, 20, 30, 40, 50]
  let from_arr = from_list(arr)
  print("From array: {to_string(from_arr)}")
  print("Back to array: {to_list(from_arr)}")

  // Nth from end
  print("2nd from end: {nth_from_end(from_arr, 2)}")

  // Cycle detection
  print("Has cycle: {has_cycle(from_arr)}")
}
