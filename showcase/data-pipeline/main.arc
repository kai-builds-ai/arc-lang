# ETL Data Pipeline
# Reads CSV sales data, transforms, filters, aggregates, outputs JSON.

use std/csv: parse_csv_headers, to_csv
use std/json: to_json, pretty
use std/collections: group_by, sort_by, max_by, frequencies
use std/strings: pad_right, capitalize

# --- Extract: Read raw CSV data ---

let raw_csv = "name,region,product,quantity,unit_price,date
Alice,North,Widget,50,12.99,2026-01-15
Bob,South,Gadget,30,24.50,2026-01-16
Alice,North,Gizmo,20,8.75,2026-01-17
Carol,East,Widget,45,12.99,2026-01-18
Dave,South,Widget,60,12.99,2026-01-19
Bob,South,Gizmo,15,8.75,2026-01-20
Carol,East,Gadget,25,24.50,2026-01-21
Eve,West,Widget,35,12.99,2026-01-22
Dave,South,Gadget,40,24.50,2026-01-23
Eve,West,Gizmo,10,8.75,2026-01-24"

let records = parse_csv_headers(raw_csv)

print("📥 Extracted {len(records)} records")
print("")

# --- Transform: Compute derived fields ---

fn transform(row) {
  let qty = int(row.quantity)
  let price = float(row.unit_price)
  let revenue = qty * price
  let tier = match revenue {
    r if r >= 1000 => "Premium"
    r if r >= 500 => "Standard"
    _ => "Basic"
  }
  {
    name: row.name,
    region: row.region,
    product: row.product,
    quantity: qty,
    unit_price: price,
    revenue: revenue,
    tier: tier,
    date: row.date
  }
}

let transformed = records |> map(r => transform(r))

# --- Filter: Only meaningful sales ---

let filtered = transformed |> filter(r => r.revenue > 100)

print("🔄 Transformed & filtered: {len(filtered)} records (revenue > $100)")
print("")

# --- Aggregate: Group and summarize ---

# Revenue by region
let by_region = filtered |> group_by(r => r.region)

fn sum_revenue(items) {
  let mut total = 0.0
  for item in items {
    total = total + item.revenue
  }
  total
}

fn summarize_region(region, items) {
  let total = sum_revenue(items)
  let count = len(items)
  let avg = total / count
  let top_seller = items |> max_by(r => r.revenue)
  {
    region: region,
    total_revenue: total,
    order_count: count,
    avg_revenue: avg,
    top_sale: top_seller.name ++ " (" ++ top_seller.product ++ ")"
  }
}

let region_summaries = keys(by_region)
  |> map(k => summarize_region(k, by_region[k]))
  |> sort_by(s => 0 - s.total_revenue)

# Revenue by product
let by_product = filtered |> group_by(r => r.product)

let product_totals = keys(by_product)
  |> map(k => { product: k, revenue: sum_revenue(by_product[k]), units: by_product[k] |> map(r => r.quantity) |> sum })
  |> sort_by(p => 0 - p.revenue)

# Tier distribution
let tier_counts = filtered |> frequencies(r => r.tier)

# --- Load: Format and output ---

print("📊 Revenue by Region:")
print(repeat("-", 60))
for s in region_summaries {
  let name = pad_right(s.region, 10, " ")
  print("  {name}  ${s.total_revenue}  ({s.order_count} orders, avg ${s.avg_revenue})")
  print("           Top: {s.top_sale}")
}
print("")

print("📦 Revenue by Product:")
print(repeat("-", 40))
for p in product_totals {
  let name = pad_right(p.product, 10, " ")
  print("  {name}  ${p.revenue}  ({p.units} units)")
}
print("")

print("🏷️ Tier Distribution:")
for tier in keys(tier_counts) {
  print("  {tier}: {tier_counts[tier]} orders")
}
print("")

# Output as JSON
let output = {
  generated: "2026-02-16",
  summary: {
    total_records: len(filtered),
    total_revenue: sum_revenue(filtered),
    regions: region_summaries,
    products: product_totals
  }
}

print("📄 JSON Output:")
print(pretty(output))
print("")
print("✅ Pipeline complete.")
