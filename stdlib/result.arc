# Arc Standard Library: result module
# Result type pattern for error handling using native builtins

# Ok(value) - wraps a success value in a Result
pub fn ok(value) => Ok(value)

# err(error) - wraps an error in a Result
pub fn err(error) => Err(error)

# is_ok(result) - returns true if Result is Ok
pub fn result_is_ok(result) => is_ok(result)

# is_err(result) - returns true if Result is Err
pub fn result_is_err(result) => is_err(result)

# result_unwrap(result) - returns value or throws on Err
pub fn result_unwrap(result) => unwrap(result)

# result_unwrap_or(result, default) - returns value or default on Err
pub fn result_unwrap_or(result, default) => unwrap_or(result, default)

# result_map(result, f) - applies f to Ok value, passes Err through
pub fn result_map(result, f) => map_result(result, f)

# flat_map_result - chains Result-returning functions
pub fn flat_map_result(result, f) {
  if is_ok(result) {
    f(unwrap(result))
  } el {
    result
  }
}

# try_fn - wraps a function call in a Result
pub fn try_fn(f) {
  Ok(f())
}
