---
title: math
---

# math

Mathematical constants and functions.

```arc
use math
```

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PI` | `3.141592653589793` | Ratio of circle's circumference to diameter |
| `E` | `2.718281828459045` | Euler's number |
| `TAU` | `6.283185307179586` | 2π — full circle in radians |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `abs` | `(x) -> Number` | Absolute value |
| `sign` | `(x) -> Number` | Sign of number (-1, 0, or 1) |
| `clamp` | `(x, lo, hi) -> Number` | Constrain to range [lo, hi] |
| `ceil` | `(x) -> Int` | Smallest integer ≥ x |
| `floor` | `(x) -> Int` | Largest integer ≤ x |
| `round` | `(x) -> Int` | Round to nearest integer |
| `pow` | `(base, exp) -> Number` | Raise base to power |
| `sqrt` | `(x) -> Number \| nil` | Square root (nil for negative) |
| `cbrt` | `(x) -> Number` | Cube root |
| `hypot` | `(a, b) -> Number` | Hypotenuse (√(a²+b²)) |
| `sin` | `(x) -> Number` | Sine (radians) |
| `cos` | `(x) -> Number` | Cosine (radians) |
| `tan` | `(x) -> Number` | Tangent (radians) |
| `asin` | `(x) -> Number` | Arcsine |
| `acos` | `(x) -> Number` | Arccosine |
| `atan` | `(x) -> Number` | Arctangent |
| `atan2` | `(y, x) -> Number` | Two-argument arctangent |
| `degrees` | `(radians) -> Number` | Convert radians to degrees |
| `radians` | `(degrees) -> Number` | Convert degrees to radians |
| `log` | `(x) -> Number` | Natural logarithm |
| `log2` | `(x) -> Number` | Base-2 logarithm |
| `log10` | `(x) -> Number` | Base-10 logarithm |
| `exp` | `(x) -> Number` | e^x |
| `factorial` | `(n) -> Int` | Factorial |
| `gcd` | `(a, b) -> Int` | Greatest common divisor |
| `lcm` | `(a, b) -> Int` | Least common multiple |
| `sum` | `(list) -> Number` | Sum of a list |
| `product` | `(list) -> Number` | Product of a list |

```arc
math.abs(-5)       # => 5
math.pow(2, 10)    # => 1024
math.sqrt(144)     # => 12
math.round(4.6)    # => 5
math.sin(math.PI)  # => ~0
math.sum([1,2,3])  # => 6
```
