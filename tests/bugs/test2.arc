# Test: nested if/else, match, pipelines
fn process(x) {
  if x > 10 {
    x * 2
  } el {
    x + 1
  }
}

fn pipeline_test(items) {
  items |> filter(x => x > 0) |> map(x => x * 2) |> sum
}

fn match_test(val) {
  match val {
    0 => "zero",
    1 => "one",
    _ => "other"
  }
}
