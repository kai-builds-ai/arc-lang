# Creating an Arc Package

Step-by-step guide to building and publishing an Arc package.

## Step 1: Create the Directory

```sh
mkdir my-package
cd my-package
```

## Step 2: Create `arc.toml`

```toml
[package]
name = "my-package"
version = "0.1.0"
description = "What your package does"
author = "your-name"
license = "MIT"

[dependencies]
# arc-fetch = "0.1.0"
```

## Step 3: Write Your Code in `src/main.arc`

```arc
# Mark public API with pub
pub fn my_function(input) {
  input |> process |> transform
}

# Private helpers don't need pub
fn process(data) => data |> trim |> lowercase
fn transform(data) => {result: data, ok: true}
```

## Step 4: Add Tests in `tests/test.arc`

```arc
use std/test: describe, it, expect_eq

describe("my_function", fn {
  it("processes input correctly", fn {
    let result = my_function("  HELLO  ")
    expect_eq(result, {result: "hello", ok: true})
  })
})
```

## Step 5: Write `README.md`

Include:
- What the package does
- Installation
- Quick start example
- API reference
- Token comparison with JS equivalent

## Step 6: Publish

```sh
arc publish
```

## Best Practices

- **Use pipelines** — they're Arc's superpower
- **Pattern match** instead of if/else chains
- **Implicit returns** — skip the `return` keyword
- **pub only what's needed** — keep internals private
- **Test everything** — use `std/test` describe/it pattern
- **Document with examples** — show, don't just tell
