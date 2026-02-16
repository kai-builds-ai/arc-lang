# ETL Data Pipeline
# Demonstrates: pipelines, closures, pattern matching, list operations

# --- Extract: Raw data as list of maps ---

let records = [
  { name: "Alice", region: "North", product: "Widget", quantity: 50, unit_price: 12.99 },
  { name: "Bob", region: "South", product: "Gadget", quantity: 30, unit_price: 24.50 },
  { name: "Alice", region: "North", product: "Gizmo", quantity: 20, unit_price: 8.75 },
  { name: "Carol", region: "East", product: "Widget", quantity: 45, unit_price: 12.99 },
  { name: "Dave", region: "South", product: "Widget", quantity: 60, unit_price: 12.99 },
  { name: "Bob", region: "South", product: "Gizmo", quantity: 15, unit_price: 8.75 },
  { name: "Carol", region: "East", product: "Gadget", quantity: 25, unit_price: 24.50 },
  { name: "Eve", region: "West", product: "Widget", quantity: 35, unit_price: 12.99 },
  { name: "Dave", region: "South", product: "Gadget", quantity: 40, unit_price: 24.50 },
  { name: "Eve", region: "West", product: "Gizmo", quantity: 10, unit_price: 8.75 }
]

print("Extracted {len(records)} records")

# --- Transform: Compute revenue and tier ---

fn transform(row) {
  let revenue = row.quantity * row.unit_price
  let tier = match revenue {
    r if r >= 1000 => "Premium",
    r if r >= 500 => "Standard",
    _ => "Basic"
  }
  {
    name: row.name,
    region: row.region,
    product: row.product,
    quantity: row.quantity,
    revenue: revenue,
    tier: tier
  }
}

let transformed = records |> map(r => transform(r))

# --- Filter: Only meaningful sales ---

let filtered = transformed |> filter(r => r.revenue > 100)

print("Transformed and filtered: {len(filtered)} records (revenue > $100)")

# --- Aggregate: Sum revenue ---

fn sum_revenue(items) {
  items |> map(r => r.revenue) |> sum
}

let total_revenue = sum_revenue(filtered)
print("Total revenue: {total_revenue}")

# --- Group by region ---

fn unique_values(items, getter) {
  let mut seen = []
  let mut result = []
  for item in items {
    let val = getter(item)
    if not contains(seen, val) {
      seen = push(seen, val)
      result = push(result, val)
    }
  }
  result
}

let regions = unique_values(filtered, r => r.region)

print("")
print("Revenue by Region:")
for region in regions {
  let region_items = filtered |> filter(r => r.region == region)
  let region_revenue = sum_revenue(region_items)
  let count = len(region_items)
  print("  {region}: ${region_revenue} ({count} orders)")
}

# --- Group by product ---

let products = unique_values(filtered, r => r.product)

print("")
print("Revenue by Product:")
for product in products {
  let product_items = filtered |> filter(r => r.product == product)
  let product_revenue = sum_revenue(product_items)
  let units = product_items |> map(r => r.quantity) |> sum
  print("  {product}: ${product_revenue} ({units} units)")
}

# --- Tier Distribution ---

let tiers = unique_values(filtered, r => r.tier)

print("")
print("Tier Distribution:")
for tier in tiers {
  let count = filtered |> filter(r => r.tier == tier) |> len
  print("  {tier}: {count} orders")
}

print("")
print("Pipeline complete.")
