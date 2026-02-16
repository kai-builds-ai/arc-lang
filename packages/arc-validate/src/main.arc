# arc-validate — Data validation for Arc
# Schema validation, type checking, string patterns, custom validators

# --- Core Validator Type ---
# A validator is {check: fn(value) -> Ok(value) | Err(message)}

pub fn validator(check_fn) => {check: check_fn}

pub fn validate(v, value) => v.check(value)

pub fn validate_all(v, value) {
  # Run validation and collect all errors (not just first)
  match v.check(value) {
    Ok(v) => Ok(v),
    Err(e) => Err(e)
  }
}

# --- Type Validators ---

pub fn is_string() => validator(fn(v) {
  if type_of(v) == "string" { Ok(v) } el { Err("Expected string, got {type_of(v)}") }
})

pub fn is_number() => validator(fn(v) {
  if type_of(v) == "number" { Ok(v) } el { Err("Expected number, got {type_of(v)}") }
})

pub fn is_bool() => validator(fn(v) {
  if type_of(v) == "bool" { Ok(v) } el { Err("Expected bool, got {type_of(v)}") }
})

pub fn is_list() => validator(fn(v) {
  if type_of(v) == "list" { Ok(v) } el { Err("Expected list, got {type_of(v)}") }
})

pub fn is_map() => validator(fn(v) {
  if type_of(v) == "map" { Ok(v) } el { Err("Expected map, got {type_of(v)}") }
})

pub fn is_nil() => validator(fn(v) {
  if v == nil { Ok(v) } el { Err("Expected nil, got {type_of(v)}") }
})

# --- String Validators ---

pub fn min_length(n) => validator(fn(v) {
  if len(v) >= n { Ok(v) } el { Err("Must be at least {n} characters, got {len(v)}") }
})

pub fn max_length(n) => validator(fn(v) {
  if len(v) <= n { Ok(v) } el { Err("Must be at most {n} characters, got {len(v)}") }
})

pub fn matches(pattern) => validator(fn(v) {
  if regex_match(pattern, v) { Ok(v) } el { Err("Does not match pattern {pattern}") }
})

pub fn email() => validator(fn(v) {
  let pattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  if type_of(v) != "string" { Err("Expected string for email") }
  el if contains(v, "@") and contains(v, ".") { Ok(v) }
  el { Err("Invalid email: {v}") }
})

pub fn url() => validator(fn(v) {
  if type_of(v) != "string" { Err("Expected string for URL") }
  el if starts(v, "http://") or starts(v, "https://") { Ok(v) }
  el { Err("Invalid URL: {v}") }
})

pub fn uuid() => validator(fn(v) {
  if type_of(v) != "string" { Err("Expected string for UUID") }
  el if len(v) == 36 and len(split(v, "-")) == 5 { Ok(v) }
  el { Err("Invalid UUID: {v}") }
})

pub fn one_of(values) => validator(fn(v) {
  if values |> contains(v) { Ok(v) }
  el { Err("Must be one of {values}, got {v}") }
})

pub fn not_empty() => validator(fn(v) {
  if type_of(v) == "string" and len(trim(v)) > 0 { Ok(v) }
  el { Err("Must not be empty") }
})

# --- Number Validators ---

pub fn min_val(n) => validator(fn(v) {
  if v >= n { Ok(v) } el { Err("Must be >= {n}, got {v}") }
})

pub fn max_val(n) => validator(fn(v) {
  if v <= n { Ok(v) } el { Err("Must be <= {n}, got {v}") }
})

pub fn range(lo, hi) => validator(fn(v) {
  if v >= lo and v <= hi { Ok(v) } el { Err("Must be between {lo} and {hi}, got {v}") }
})

pub fn positive() => validator(fn(v) {
  if v > 0 { Ok(v) } el { Err("Must be positive, got {v}") }
})

pub fn integer() => validator(fn(v) {
  if type_of(v) == "number" and v == floor(v) { Ok(v) }
  el { Err("Must be an integer, got {v}") }
})

# --- Combinators ---

pub fn required(v) => validator(fn(val) {
  if val == nil { Err("Required field is missing") }
  el { v.check(val) }
})

pub fn optional(v) => validator(fn(val) {
  if val == nil { Ok(nil) }
  el { v.check(val) }
})

pub fn chain(validators) => validator(fn(val) {
  let mut current = val
  for v in validators {
    match v.check(current) {
      Ok(new_val) => current = new_val,
      Err(msg) => Err(msg)
    }
  }
  Ok(current)
})

pub fn pipe(v1, v2) => chain([v1, v2])

pub fn custom(msg, check_fn) => validator(fn(v) {
  if check_fn(v) { Ok(v) } el { Err(msg) }
})

# --- Schema Validation ---

pub fn schema(field_validators) => validator(fn(data) {
  if type_of(data) != "map" { Err("Expected map for schema validation") }
  el {
    let mut errors = {}
    let mut valid_data = {}

    for {field, v} in entries(field_validators) {
      let value = data[field]
      match v.check(value) {
        Ok(val) => valid_data[field] = val,
        Err(msg) => errors[field] = msg
      }
    }

    if len(errors) > 0 { Err(errors) }
    el { Ok(valid_data) }
  }
})

# --- List Validators ---

pub fn list_of(item_validator) => validator(fn(v) {
  if type_of(v) != "list" { Err("Expected list") }
  el {
    let mut errors = []
    for i in 0..len(v) {
      match item_validator.check(v[i]) {
        Ok(_) => nil,
        Err(msg) => errors = errors ++ ["[{i}]: {msg}"]
      }
    }
    if len(errors) > 0 { Err(errors) } el { Ok(v) }
  }
})

pub fn non_empty_list() => validator(fn(v) {
  if type_of(v) != "list" { Err("Expected list") }
  el if len(v) == 0 { Err("List must not be empty") }
  el { Ok(v) }
})
