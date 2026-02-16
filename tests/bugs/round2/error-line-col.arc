# Test error reporting line/column accuracy

# Intentionally cause an error on a specific line
# This is line 4
# This is line 5
let x = 10
# Line 7
# Line 8
# Cause error on line 9 - undefined variable
print(undefined_var_on_line_10)
