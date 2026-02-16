# Test: function used as argument should not be "unused"
fn helper(x) => x * 2

let result = [1, 2, 3] |> map(helper)
print(result)
