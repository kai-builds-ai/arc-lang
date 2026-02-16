# BUG: validateSource uses regex to find string literals
# But the regex /"([^"\\]|\\.)*"/g doesn't handle multi-line contexts
# and could be confused by strings in comments

# Also: the regex check for string length runs on raw source
# while the lexer processes escape sequences
# A string with many escape sequences would have different lengths

let a = "short"
print(a)
