# REPL bug: The multi-line brace counting doesn't account for braces in strings
# If you type: let x = "{"
# The REPL will think you started a block and wait for }

# This is a code-review-only finding since we can't test the REPL interactively here
# but we can verify the behavior by checking the REPL source

let x = "{"
print(x)
print(len(x))
