# Arc Standard Library: math module

pub let PI = 3.141592653589793
pub let E = 2.718281828459045

pub fn abs(x) => if x < 0 { 0 - x } el { x }

pub fn pow(base, exp) {
  if exp == 0 { 1 }
  el {
    let mut result = 1
    for i in 0..exp {
      result = result * base
    }
    result
  }
}

pub fn sqrt(x) {
  # Newton's method
  if x == 0 { 0 }
  el if x < 0 { nil }
  el {
    let mut guess = x / 2
    let mut i = 0
    do {
      guess = (guess + x / guess) / 2
      i = i + 1
    } until i == 20
    guess
  }
}

pub fn ceil(x) {
  let i = int(x)
  if float(i) == float(x) { i }
  el if x > 0 { i + 1 }
  el { i }
}

pub fn floor(x) {
  let i = int(x)
  if float(i) == float(x) { i }
  el if x < 0 { i - 1 }
  el { i }
}

pub fn clamp(x, lo, hi) {
  if x < lo { lo }
  el if x > hi { hi }
  el { x }
}
