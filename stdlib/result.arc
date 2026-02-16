# Arc Standard Library: result module
# Result type pattern for error handling

pub fn ok(value) => {ok: true, value: value, error: nil}

pub fn err(message) => {ok: false, value: nil, error: message}

pub fn is_ok(result) => result.ok == true

pub fn is_err(result) => result.ok == false

pub fn unwrap(result) {
  assert(result.ok == true, "unwrap called on error: " ++ str(result.error))
  result.value
}

pub fn unwrap_or(result, default) {
  if result.ok == true { result.value }
  el { default }
}

pub fn map_result(result, f) {
  if result.ok == true {
    ok(f(result.value))
  } el {
    result
  }
}

pub fn flat_map_result(result, f) {
  if result.ok == true {
    f(result.value)
  } el {
    result
  }
}

pub fn try_fn(f) {
  # Without try/catch, this just runs the function
  # If it throws, the program aborts (Arc has no exception handling yet)
  ok(f())
}
