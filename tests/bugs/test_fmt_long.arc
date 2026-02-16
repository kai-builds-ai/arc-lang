# Formatter should break this across lines
fn complex(x) {
  if x > 100 {
    if x > 200 {
      if x > 300 {
        "very very very deep nesting here"
      } el {
        "medium deep nesting here"
      }
    } el {
      "shallow nesting here"
    }
  } el {
    "not nested at all"
  }
}
