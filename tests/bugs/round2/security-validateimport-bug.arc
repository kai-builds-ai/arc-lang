# BUG: In SafeInterpreter.run(), validateImport uses (useStmt as any).module
# but UseStmt has .path (string[]) not .module
# This means the import validation ALWAYS passes because it validates 'undefined'

# This is a code-review finding - the sandbox validateImport call is broken
print("security validateImport bug is code-review only")
