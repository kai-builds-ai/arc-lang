# arc-validate

Data validation library for Arc with schemas, type checking, and composable validators.

## Install

```toml
[dependencies]
arc-validate = "0.1.0"
```

## Quick Start

```arc
use arc-validate: schema, required, is_string, is_number, email, range, validate

let user_schema = schema({
  name: required(chain([is_string(), min_length(1)])),
  email: required(email()),
  age: required(chain([is_number(), range(0, 150)]))
})

match validate(user_schema, {name: "Alice", email: "alice@ex.com", age: 30}) {
  Ok(data) => print("Valid: {data.name}"),
  Err(errors) => print("Errors: {errors}")
}
```

## Composable Validators

Chain validators with pipelines:

```arc
let username_validator = chain([
  is_string(),
  min_length(3),
  max_length(20),
  custom("No spaces allowed", fn(v) => not contains(v, " "))
])

validate(username_validator, "alice")    # => Ok("alice")
validate(username_validator, "al")       # => Err("Must be at least 3 characters...")
```

## Built-in Validators

### Type Validators
- `is_string()`, `is_number()`, `is_bool()`, `is_list()`, `is_map()`, `is_nil()`

### String Validators
- `min_length(n)`, `max_length(n)`, `not_empty()`
- `email()`, `url()`, `uuid()`, `matches(pattern)`
- `one_of(values)`

### Number Validators
- `min_val(n)`, `max_val(n)`, `range(lo, hi)`
- `positive()`, `integer()`

### Combinators
- `required(v)` — fails on nil
- `optional(v)` — passes nil through
- `chain(validators)` — run validators in sequence
- `custom(msg, fn)` — custom check function

### Collections
- `schema(fields)` — validate map fields
- `list_of(v)` — validate each list item
- `non_empty_list()` — list must have items

## API Reference

| Function | Description |
|----------|-------------|
| `validator(fn)` | Create a custom validator |
| `validate(v, value)` | Run validation |
| `schema(fields)` | Object schema validation |
| `chain(validators)` | Sequence validators |
| `required(v)` | Reject nil |
| `optional(v)` | Allow nil |
| `custom(msg, fn)` | Custom check |

## Token Comparison

**Arc (arc-validate):**
```arc
let s = schema({
  name: required(chain([is_string(), min_length(1)])),
  email: required(email()),
  age: optional(range(0, 150))
})
validate(s, data)
```
~35 tokens

**JavaScript (Joi):**
```javascript
const Joi = require('joi');
const schema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(0).max(150).optional()
});
const { error, value } = schema.validate(data);
```
~55 tokens

**Savings: ~36%**
