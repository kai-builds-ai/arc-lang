# Version semver edge cases - tested via code review
# 1. compareSemver("1.0", "1.0.0") - only 2 parts, pa[2] is NaN
# 2. compareSemver("1.0.0-beta", "1.0.0") - pre-release tags not handled
# 3. checkVersionCompatibility("^0.5.0") - caret with major=0 should match minor
# 4. Exact match uses >= instead of ==

print("version edge cases are code-review findings")
