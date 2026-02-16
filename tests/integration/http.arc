# TEST: http module
use http

# get wraps @GET
let resp = get("https://api.example.com/data")
assert(resp.status == 200, "get status")
assert(resp.method == "GET", "get method")

# post wraps @POST
let resp2 = post("https://api.example.com/data", "test-body")
assert(resp2.status == 200, "post status")
assert(resp2.method == "POST", "post method")

# put wraps @PUT
let resp3 = put("https://api.example.com/data", "test-body")
assert(resp3.status == 200, "put status")
assert(resp3.method == "PUT", "put method")

# delete wraps @DELETE
let resp4 = delete("https://api.example.com/data")
assert(resp4.status == 200, "delete status")
assert(resp4.method == "DELETE", "delete method")

# parse_url
let parsed = parse_url("https://example.com/api/v1/users")
assert(parsed.protocol == "https", "parse protocol")
assert(parsed.host == "example.com", "parse host")
assert(parsed.path == "/api/v1/users", "parse path")

let parsed2 = parse_url("http://localhost:3000/test")
assert(parsed2.protocol == "http", "parse http protocol")
assert(parsed2.host == "localhost:3000", "parse host with port")
assert(parsed2.path == "/test", "parse path simple")

# parse_url with no path
let parsed3 = parse_url("https://example.com")
assert(parsed3.protocol == "https", "no-path protocol")
assert(parsed3.host == "example.com", "no-path host")
assert(parsed3.path == "/", "no-path defaults to /")

print("http: all passed")
