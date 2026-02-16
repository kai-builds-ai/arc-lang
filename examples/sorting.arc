# Sorting Algorithms in Arc
# Demonstrates: recursion, pattern matching, list operations, pipelines

# Quicksort
fn quicksort(lst) => match lst {
  [] => [],
  [pivot, ..rest] => {
    let lo = [x for x in rest if x < pivot]
    let hi = [x for x in rest if x >= pivot]
    quicksort(lo) ++ [pivot] ++ quicksort(hi)
  }
}

# Mergesort
fn merge(a, b) => match [a, b] {
  [[], b] => b,
  [a, []] => a,
  [[x, ..xs], [y, ..ys]] => if x <= y {
    [x] ++ merge(xs, [y] ++ ys)
  } el {
    [y] ++ merge([x] ++ xs, ys)
  }
}

fn mergesort(lst) => match lst {
  [] => [],
  [x] => [x],
  _ => {
    let mid = len(lst) / 2
    let left = lst |> take(mid)
    let right = lst |> drop(mid)
    merge(mergesort(left), mergesort(right))
  }
}

# Insertion sort
fn insert(x, sorted) => match sorted {
  [] => [x],
  [h, ..t] => if x <= h { [x] ++ sorted } el { [h] ++ insert(x, t) }
}

fn insertion_sort(lst) => lst |> reduce([], (acc, x) => insert(x, acc))

# Test them all
let data = [38, 27, 43, 3, 9, 82, 10]
print("Original:  {data}")
print("Quicksort: {quicksort(data)}")
print("Mergesort: {mergesort(data)}")
print("Insertion: {insertion_sort(data)}")

# Sort strings too
let words = ["banana", "apple", "cherry", "date"]
print("Sorted words: {quicksort(words)}")
