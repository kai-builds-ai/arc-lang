// Equivalent JavaScript for the Arc Data Pipeline
// Compare token count and verbosity with main.arc

const rawCsv = `name,region,product,quantity,unit_price,date
Alice,North,Widget,50,12.99,2026-01-15
Bob,South,Gadget,30,24.50,2026-01-16
Alice,North,Gizmo,20,8.75,2026-01-17
Carol,East,Widget,45,12.99,2026-01-18
Dave,South,Widget,60,12.99,2026-01-19
Bob,South,Gizmo,15,8.75,2026-01-20
Carol,East,Gadget,25,24.50,2026-01-21
Eve,West,Widget,35,12.99,2026-01-22
Dave,South,Gadget,40,24.50,2026-01-23
Eve,West,Gizmo,10,8.75,2026-01-24`;

// --- Extract ---
function parseCsvHeaders(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

const records = parseCsvHeaders(rawCsv);
console.log(`📥 Extracted ${records.length} records\n`);

// --- Transform ---
function transform(row) {
  const qty = parseInt(row.quantity);
  const price = parseFloat(row.unit_price);
  const revenue = qty * price;
  let tier;
  if (revenue >= 1000) {
    tier = 'Premium';
  } else if (revenue >= 500) {
    tier = 'Standard';
  } else {
    tier = 'Basic';
  }
  return {
    name: row.name,
    region: row.region,
    product: row.product,
    quantity: qty,
    unit_price: price,
    revenue,
    tier,
    date: row.date,
  };
}

const transformed = records.map(r => transform(r));

// --- Filter ---
const filtered = transformed.filter(r => r.revenue > 100);
console.log(`🔄 Transformed & filtered: ${filtered.length} records (revenue > $100)\n`);

// --- Aggregate ---
function groupBy(arr, keyFn) {
  const groups = {};
  for (const item of arr) {
    const key = String(keyFn(item));
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function sumRevenue(items) {
  return items.reduce((sum, item) => sum + item.revenue, 0);
}

const byRegion = groupBy(filtered, r => r.region);

function summarizeRegion(region, items) {
  const total = sumRevenue(items);
  const count = items.length;
  const avg = total / count;
  const topSeller = items.reduce((best, r) =>
    r.revenue > best.revenue ? r : best
  );
  return {
    region,
    total_revenue: total,
    order_count: count,
    avg_revenue: avg,
    top_sale: `${topSeller.name} (${topSeller.product})`,
  };
}

const regionSummaries = Object.keys(byRegion)
  .map(k => summarizeRegion(k, byRegion[k]))
  .sort((a, b) => b.total_revenue - a.total_revenue);

const byProduct = groupBy(filtered, r => r.product);

const productTotals = Object.keys(byProduct)
  .map(k => ({
    product: k,
    revenue: sumRevenue(byProduct[k]),
    units: byProduct[k].reduce((sum, r) => sum + r.quantity, 0),
  }))
  .sort((a, b) => b.revenue - a.revenue);

// --- Output ---
console.log('📊 Revenue by Region:');
console.log('-'.repeat(60));
for (const s of regionSummaries) {
  console.log(`  ${s.region.padEnd(10)}  $${s.total_revenue}  (${s.order_count} orders, avg $${s.avg_revenue})`);
  console.log(`           Top: ${s.top_sale}`);
}
console.log('');

console.log('📦 Revenue by Product:');
console.log('-'.repeat(40));
for (const p of productTotals) {
  console.log(`  ${p.product.padEnd(10)}  $${p.revenue}  (${p.units} units)`);
}
console.log('');

const output = {
  generated: '2026-02-16',
  summary: {
    total_records: filtered.length,
    total_revenue: sumRevenue(filtered),
    regions: regionSummaries,
    products: productTotals,
  },
};

console.log('📄 JSON Output:');
console.log(JSON.stringify(output, null, 2));
console.log('\n✅ Pipeline complete.');
