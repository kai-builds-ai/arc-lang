# TEST: Tool calls (mocked)
let resp = @GET "https://api.example.com/data"
assert(resp.status == 200, "GET status")
assert(resp.method == "GET", "GET method")

let resp2 = @POST "https://api.example.com/data" {name: "test"}
assert(resp2.status == 200, "POST status")
assert(resp2.method == "POST", "POST method")

# Custom tool call
let result = @myTool(42)
assert(type_of(result) == "string", "custom tool returns string")

print("tool-calls: all passed")
