# Pipeline with lambda
let nums = [1, 2, 3, 4, 5]
let result = nums |> filter((x) => x > 2) |> len
print(result)
