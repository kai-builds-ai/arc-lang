# Arc Standard Library: regex module
# Provides regular expression matching, replacing, splitting, and validation.

# Returns the first match of `pattern` in `text`, or nil if no match
pub fn match(pattern, text) {
  let re = regex_new(pattern)
  regex_find(re, text)
}

# Returns a list of all matches of `pattern` in `text`
pub fn match_all(pattern, text) {
  let re = regex_new(pattern)
  regex_find_all(re, text)
}

# Returns true if `pattern` matches anywhere in `text`, false otherwise
pub fn test(pattern, text) {
  let result = match(pattern, text)
  result != nil
}

# Replaces the first occurrence of `pattern` with `replacement` in `text`
pub fn replace(pattern, replacement, text) {
  let re = regex_new(pattern)
  regex_replace(re, replacement, text)
}

# Replaces all occurrences of `pattern` with `replacement` in `text`
pub fn replace_all(pattern, replacement, text) {
  let re = regex_new(pattern)
  regex_replace_all(re, replacement, text)
}

# Splits `text` by occurrences of `pattern`
pub fn split(pattern, text) {
  let re = regex_new(pattern)
  regex_split(re, text)
}

# Returns a list of capture groups from the first match of `pattern` in `text`
pub fn capture(pattern, text) {
  let re = regex_new(pattern)
  regex_captures(re, text)
}

# Returns a list of all capture group sets from all matches of `pattern` in `text`
pub fn capture_all(pattern, text) {
  let re = regex_new(pattern)
  regex_captures_all(re, text)
}

# Escapes all regex special characters in `text`
pub fn escape(text) {
  let specials = ["\\", ".", "^", "$", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|"]
  let mut result = text
  specials |> each(ch => {
    result = replace_all(ch, "\\" ++ ch, result)
  })
  result
}

# Returns true if `pattern` is a valid regex, false otherwise
pub fn is_valid(pattern) {
  try {
    regex_new(pattern)
    true
  } catch _ {
    false
  }
}
