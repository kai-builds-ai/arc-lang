# Arc Standard Library: error module
# Structured error handling beyond basic Result

# Create a structured error with code and message
pub fn error(code, message) => {type: "error", code: code, message: message, details: {}, context: nil}

# Create a structured error with extra details map
pub fn error_with(code, message, details) => {type: "error", code: code, message: message, details: details, context: nil}

# Check if a value is an error
pub fn is_error(value) => value.type == "error"

# Extract error code
pub fn error_code(err) => err.code

# Extract error message
pub fn error_message(err) => err.message

# Wrap an error with additional context string
pub fn wrap_error(err, context) => {
  type: "error",
  code: err.code,
  message: err.message,
  details: err.details,
  context: context
}

# Throw an error with a message (creates and returns an error)
pub fn throw(message) => error("THROW", message)

# Unrecoverable error — like Rust's panic!
pub fn panic(message) => error("PANIC", "PANIC: " ++ message)

# Assert condition or return error
pub fn assert(condition, message) {
  if condition { true }
  el { throw(message) }
}

# Assert equality or return error
pub fn assert_eq(actual, expected, message) {
  if actual == expected { true }
  el { throw(message ++ ": expected " ++ str(expected) ++ " but got " ++ str(actual)) }
}

# Execute fn, call handler if result is an error
pub fn try_catch(f, handler) {
  let result = f()
  if is_error(result) { handler(result) }
  el { result }
}

# Execute fn, always run cleanup, return fn result
pub fn try_finally(f, cleanup) {
  let result = f()
  cleanup()
  result
}

# Full try/catch/finally
pub fn try_catch_finally(f, handler, cleanup) {
  let result = f()
  let handled = if is_error(result) { handler(result) } el { result }
  cleanup()
  handled
}

# Retry a function up to max_attempts times with delay_ms between attempts
pub fn retry(f, max_attempts, delay_ms) {
  let mut attempt = 0
  let mut last_result = nil
  while attempt < max_attempts {
    last_result = f()
    if not is_error(last_result) { return last_result }
    attempt = attempt + 1
    if attempt < max_attempts { sleep(delay_ms) }
  }
  wrap_error(last_result, "failed after " ++ str(max_attempts) ++ " attempts")
}

# Execute with timeout — returns error if exceeded
# Note: true async timeout requires runtime support; this is a placeholder pattern
pub fn timeout(f, ms) {
  let start = time_ms()
  let result = f()
  let elapsed = time_ms() - start
  if elapsed > ms {
    error("TIMEOUT", "operation exceeded " ++ str(ms) ++ "ms (took " ++ str(elapsed) ++ "ms)")
  } el {
    result
  }
}
