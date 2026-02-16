# Test: empty blocks, deeply nested
fn empty() {}

fn nested(x) {
  if x > 0 {
    if x > 10 {
      if x > 100 {
        "deep"
      } el {
        "medium"
      }
    } el {
      "low"
    }
  } el {
    "negative"
  }
}

# Long line test
let very_long_list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
