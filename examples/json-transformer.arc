# JSON Data Transformer
# Demonstrates: destructuring, nested maps, pipelines, comprehensions
# Showcases Arc's expressiveness for data transformation tasks

# Sample API response (nested data)
let api_response = {
  users: [
    {name: "Alice", age: 30, roles: ["admin", "user"], active: true},
    {name: "Bob", age: 25, roles: ["user"], active: false},
    {name: "Charlie", age: 35, roles: ["admin", "moderator"], active: true},
    {name: "Diana", age: 28, roles: ["user"], active: true}
  ],
  meta: {total: 4, page: 1}
}

# Extract active admins with destructuring + pipeline
let active_admins = api_response.users
  |> filter(u => u.active)
  |> filter(u => "admin" in u.roles)
  |> map(u => {name: u.name, age: u.age})

print("Active admins: {active_admins}")

# Transform to lookup map
let by_name = api_response.users
  |> map(u => [u.name, u])
  |> from_entries

print("Lookup Bob: {by_name["Bob"].age}")

# Compute stats with pipeline
let stats = {
  active: api_response.users |> filter(u => u.active) |> len,
  avg_age: api_response.users |> map(u => u.age) |> avg,
  all_roles: api_response.users
    |> flat_map(u => u.roles)
    |> unique
}

print("Stats: {stats}")

# Reshape for a different API format
let output = [
  {
    display_name: "{u.name} ({u.age})",
    is_admin: "admin" in u.roles,
    status: if u.active { "active" } el { "inactive" }
  }
  for u in api_response.users
]

print("Transformed:")
for item in output {
  print("  {item.display_name} - {item.status}")
}
