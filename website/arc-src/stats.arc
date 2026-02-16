# Arc-powered stats counter
# Demonstrates Arc's token efficiency in action

fn count_tokens(code) {
  code
    |> split(" ")
    |> filter(t => len(t) > 0)
    |> len()
}

let arc_code = "fn fetchUsers() @GET api/users |> filter u => u.active |> map u => u.name |> sort"
let js_code = "async function fetchUsers() const res = await fetch api/users const data = await res.json return data.filter u => u.active .map u => u.name .sort"

let arc_tokens = count_tokens(arc_code)
let js_tokens = count_tokens(js_code)
let savings = 100 - (arc_tokens * 100 / js_tokens)

print("Arc tokens: {arc_tokens}")
print("JS tokens: {js_tokens}")  
print("Savings: {savings}%")
