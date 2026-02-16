# Arc Standard Library: strings module

pub fn pad_left(s, width, ch) {
  let mut result = str(s)
  if len(result) >= width { result }
  el {
    do {
      result = str(ch) ++ result
    } until len(result) >= width
    result
  }
}

pub fn pad_right(s, width, ch) {
  let mut result = str(s)
  if len(result) >= width { result }
  el {
    do {
      result = result ++ str(ch)
    } until len(result) >= width
    result
  }
}

pub fn capitalize(s) {
  if len(s) == 0 { "" }
  el {
    let first = upper(slice(s, 0, 1))
    let rest = lower(slice(s, 1, len(s)))
    first ++ rest
  }
}

pub fn words(s) {
  split(trim(s), " ") |> filter(w => len(w) > 0)
}
