# arc-validate — Data validation for Arc
# Schema validation, type checking, string patterns, custom validators

# --- Core Validator Type ---
# A validator is {check: fn(value) -> {ok: true, value: v} | {ok: false, error: msg}}

pub fn validator(check_fn) => {check: check_fn}

pub fn validate(v, value) => v.check(value)

pub fn validate_all(v, value) => v.check(value)

fn ok_result(v) => {ok: true, value: v}
fn err_result(msg) => {ok: false, error: msg}

# --- Type Validators ---

pub fn is_string() => validator(v => {
  if type_of(v) == "string" { ok_result(v) } el { err_result("Expected string, got {type_of(v)}") }
})

pub fn is_number() => validator(v => {
  let t = type_of(v)
  if t == "int" or t == "float" { ok_result(v) } el { err_result("Expected number, got {t}") }
})

pub fn is_bool() => validator(v => {
  if type_of(v) == "bool" { ok_result(v) } el { err_result("Expected bool, got {type_of(v)}") }
})

pub fn is_list() => validator(v => {
  if type_of(v) == "list" { ok_result(v) } el { err_result("Expected list, got {type_of(v)}") }
})

pub fn is_map() => validator(v => {
  if type_of(v) == "map" { ok_result(v) } el { err_result("Expected map, got {type_of(v)}") }
})

pub fn is_nil() => validator(v => {
  if v == nil { ok_result(v) } el { err_result("Expected nil, got {type_of(v)}") }
})

# --- String Validators ---

pub fn min_length(n) => validator(v => {
  if len(v) >= n { ok_result(v) } el { err_result("Must be at least {n} characters, got {len(v)}") }
})

pub fn max_length(n) => validator(v => {
  if len(v) <= n { ok_result(v) } el { err_result("Must be at most {n} characters, got {len(v)}") }
})

pub fn matches(pattern) => validator(v => {
  if contains(v, pattern) { ok_result(v) } el { err_result("Does not match pattern {pattern}") }
})

pub fn email() => validator(v => {
  if type_of(v) != "string" { err_result("Expected string for email") }
  el if contains(v, "@") and contains(v, ".") { ok_result(v) }
  el { err_result("Invalid email: {v}") }
})

pub fn url() => validator(v => {
  if type_of(v) != "string" { err_result("Expected string for URL") }
  el if starts(v, "http://") or starts(v, "https://") { ok_result(v) }
  el { err_result("Invalid URL: {v}") }
})

pub fn uuid() => validator(v => {
  if type_of(v) != "string" { err_result("Expected string for UUID") }
  el if len(v) == 36 and len(split(v, "-")) == 5 { ok_result(v) }
  el { err_result("Invalid UUID: {v}") }
})

pub fn one_of(values) => validator(v => {
  if values |> contains(v) { ok_result(v) }
  el { err_result("Must be one of {values}, got {v}") }
})

pub fn not_empty() => validator(v => {
  if type_of(v) == "string" and len(trim(v)) > 0 { ok_result(v) }
  el { err_result("Must not be empty") }
})

# --- Number Validators ---

pub fn min_val(n) => validator(v => {
  if v >= n { ok_result(v) } el { err_result("Must be >= {n}, got {v}") }
})

pub fn max_val(n) => validator(v => {
  if v <= n { ok_result(v) } el { err_result("Must be <= {n}, got {v}") }
})

pub fn range(lo, hi) => validator(v => {
  if v >= lo and v <= hi { ok_result(v) } el { err_result("Must be between {lo} and {hi}, got {v}") }
})

pub fn positive() => validator(v => {
  if v > 0 { ok_result(v) } el { err_result("Must be positive, got {v}") }
})

pub fn integer() => validator(v => {
  if type_of(v) == "int" { ok_result(v) }
  el { err_result("Must be an integer, got {v}") }
})

# --- Combinators ---

pub fn required(v) => validator(val => {
  if val == nil { err_result("Required field is missing") }
  el { v.check(val) }
})

pub fn optional(v) => validator(val => {
  if val == nil { ok_result(nil) }
  el { v.check(val) }
})

pub fn chain(validators) => validator(val => {
  let mut current = val
  let mut err_msg = nil
  for v in validators {
    if err_msg == nil {
      let r = v.check(current)
      if r.ok { current = r.value }
      el { err_msg = r.error }
    }
  }
  if err_msg != nil { err_result(err_msg) } el { ok_result(current) }
})

pub fn pipe(v1, v2) => chain([v1, v2])

pub fn custom(msg, check_fn) => validator(v => {
  if check_fn(v) { ok_result(v) } el { err_result(msg) }
})

# --- Schema Validation ---

pub fn schema(field_validators) => validator(data => {
  if type_of(data) != "map" { err_result("Expected map for schema validation") }
  el {
    let mut errors = {}
    let mut valid_data = {}
    let field_keys = keys(field_validators)

    for field in field_keys {
      let v = field_validators[field]
      let value = data[field]
      let r = v.check(value)
      if r.ok { valid_data[field] = r.value }
      el { errors[field] = r.error }
    }

    if len(errors) > 0 { err_result(errors) }
    el { ok_result(valid_data) }
  }
})

# --- List Validators ---

pub fn list_of(item_validator) => validator(v => {
  if type_of(v) != "list" { err_result("Expected list") }
  el {
    let mut errors = []
    for i in 0..len(v) {
      let r = item_validator.check(v[i])
      if not r.ok { errors = errors ++ ["[{i}]: {r.error}"] }
    }
    if len(errors) > 0 { err_result(errors) } el { ok_result(v) }
  }
})

pub fn non_empty_list() => validator(v => {
  if type_of(v) != "list" { err_result("Expected list") }
  el if len(v) == 0 { err_result("List must not be empty") }
  el { ok_result(v) }
})
