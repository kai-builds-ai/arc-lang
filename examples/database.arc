# ============================================================================
# In-Memory Database Engine in Arc
# ============================================================================
# A relational-style in-memory database with tables, CRUD operations, WHERE
# filtering, ORDER BY, GROUP BY, JOIN, indexing, and transactions.
# Demonstrates: collections, closures, pattern matching, pipelines, mut,
# higher-order functions, pub, string interpolation.
# ============================================================================

use collections
use json
use datetime

# --- Database Creation ---

pub fn create_db(name) => {
    {
        name: name,
        tables: {},
        indexes: {},
        created_at: datetime.now() |> datetime.to_iso(),
        auto_ids: {}
    }
}

pub fn create_table(db, table_name, schema) => {
    let table = {
        name: table_name,
        schema: schema,
        rows: [],
        primary_key: schema |> collections.find(fn(col) => col.primary_key) |> fn(c) => c.name
    }
    let mut d = db
    d.tables = collections.set(d.tables, table_name, table)
    d.auto_ids = collections.set(d.auto_ids, table_name, 0)
    d
}

# --- Schema Definitions ---

pub fn column(name, type, options) => {
    let defaults = { nullable: true, primary_key: false, auto_increment: false, default: nil }
    collections.merge(defaults, options, { name: name, type: type })
}

pub fn int_col(name, options) => column(name, "int", options or {})
pub fn text_col(name, options) => column(name, "text", options or {})
pub fn float_col(name, options) => column(name, "float", options or {})
pub fn bool_col(name, options) => column(name, "bool", options or {})
pub fn datetime_col(name, options) => column(name, "datetime", options or {})

# --- Validation ---

fn validate_row(table, row) => {
    table.schema |> collections.all(fn(col) => {
        let val = collections.get(row, col.name, nil)
        match [val, col.nullable, col.auto_increment] {
            [nil, false, false] => false,
            [nil, _, true] => true,
            [nil, true, _] => true,
            _ => validate_type(val, col.type)
        }
    })
}

fn validate_type(val, type) => {
    match type {
        "int" => is_number(val),
        "float" => is_number(val),
        "text" => is_string(val),
        "bool" => is_bool(val),
        "datetime" => is_string(val),
        _ => true
    }
}

# --- INSERT ---

pub fn insert(db, table_name, row) => {
    let table = collections.get(db.tables, table_name)
    match table {
        nil => { error: "Table '${table_name}' not found", db: db },
        _ => {
            # Handle auto-increment
            let mut final_row = row
            let mut next_id = collections.get(db.auto_ids, table_name, 0)
            
            table.schema |> collections.each(fn(col) => {
                match col.auto_increment {
                    true => {
                        next_id = next_id + 1
                        final_row = collections.set(final_row, col.name, next_id)
                    },
                    false => match [collections.get(final_row, col.name, nil), col.default] {
                        [nil, d] if d != nil => {
                            final_row = collections.set(final_row, col.name, d)
                        },
                        _ => {}
                    }
                }
            })
            
            match validate_row(table, final_row) {
                false => { error: "Validation failed for row", db: db },
                true => {
                    let mut d = db
                    let mut t = table
                    t.rows = t.rows |> collections.append(final_row)
                    d.tables = collections.set(d.tables, table_name, t)
                    d.auto_ids = collections.set(d.auto_ids, table_name, next_id)
                    
                    # Update indexes
                    d = update_indexes_for_insert(d, table_name, final_row)
                    
                    { ok: final_row, db: d }
                }
            }
        }
    }
}

pub fn insert_many(db, table_name, rows) => {
    rows |> collections.reduce({ db: db, inserted: [] }, fn(acc, row) => {
        let result = insert(acc.db, table_name, row)
        match result {
            { ok: r, db: d } => { db: d, inserted: acc.inserted |> collections.append(r) },
            { error: e } => { db: acc.db, inserted: acc.inserted, errors: (acc.errors or []) |> collections.append(e) }
        }
    })
}

# --- SELECT (Query Builder) ---

pub fn query(table_name) => {
    {
        table: table_name,
        conditions: [],
        order: nil,
        limit_val: nil,
        offset_val: 0,
        select_cols: nil,
        group_by_col: nil,
        aggregates: [],
        joins: []
    }
}

pub fn where_clause(q, predicate) => {
    let mut qr = q
    qr.conditions = qr.conditions |> collections.append(predicate)
    qr
}

pub fn where_eq(q, field, value) => where_clause(q, fn(row) => collections.get(row, field) == value)
pub fn where_gt(q, field, value) => where_clause(q, fn(row) => collections.get(row, field) > value)
pub fn where_lt(q, field, value) => where_clause(q, fn(row) => collections.get(row, field) < value)
pub fn where_gte(q, field, value) => where_clause(q, fn(row) => collections.get(row, field) >= value)
pub fn where_lte(q, field, value) => where_clause(q, fn(row) => collections.get(row, field) <= value)
pub fn where_like(q, field, pattern) => where_clause(q, fn(row) => {
    collections.get(row, field, "") |> lowercase() |> contains(pattern |> lowercase())
})
pub fn where_in(q, field, values) => where_clause(q, fn(row) => {
    collections.contains(values, collections.get(row, field))
})

pub fn order_by(q, field, direction) => {
    let mut qr = q
    qr.order = { field: field, direction: direction or "asc" }
    qr
}

pub fn limit(q, n) => {
    let mut qr = q
    qr.limit_val = n
    qr
}

pub fn offset(q, n) => {
    let mut qr = q
    qr.offset_val = n
    qr
}

pub fn select_columns(q, cols) => {
    let mut qr = q
    qr.select_cols = cols
    qr
}

pub fn group_by(q, col) => {
    let mut qr = q
    qr.group_by_col = col
    qr
}

pub fn aggregate(q, name, fn_agg) => {
    let mut qr = q
    qr.aggregates = qr.aggregates |> collections.append({ name: name, fn: fn_agg })
    qr
}

pub fn join(q, other_table, on_left, on_right) => {
    let mut qr = q
    qr.joins = qr.joins |> collections.append({
        table: other_table, on_left: on_left, on_right: on_right
    })
    qr
}

# --- Query Execution ---

pub fn execute(db, q) => {
    let table = collections.get(db.tables, q.table)
    match table {
        nil => { error: "Table '${q.table}' not found" },
        _ => {
            let mut rows = table.rows
            
            # Apply JOINs
            rows = q.joins |> collections.reduce(rows, fn(rs, j) => {
                let other = collections.get(db.tables, j.table)
                match other {
                    nil => rs,
                    _ => rs |> collections.flat_map(fn(row) => {
                        other.rows
                        |> collections.filter(fn(other_row) => {
                            collections.get(row, j.on_left) == collections.get(other_row, j.on_right)
                        })
                        |> collections.map(fn(other_row) => collections.merge(row, other_row))
                    })
                }
            })
            
            # Apply WHERE conditions
            rows = q.conditions |> collections.reduce(rows, fn(rs, cond) => {
                rs |> collections.filter(cond)
            })
            
            # Apply GROUP BY
            match q.group_by_col {
                nil => {},
                col => {
                    let groups = rows |> collections.group_by(fn(row) => collections.get(row, col))
                    rows = groups |> collections.entries() |> collections.map(fn(entry) => {
                        let group_rows = entry.value
                        let mut result = { [col]: entry.key }
                        q.aggregates |> collections.each(fn(agg) => {
                            result = collections.set(result, agg.name, agg.fn(group_rows))
                        })
                        result
                    })
                }
            }
            
            # Apply ORDER BY
            match q.order {
                nil => {},
                { field: f, direction: d } => {
                    rows = rows |> collections.sort_by(fn(row) => collections.get(row, f))
                    match d {
                        "desc" => rows = rows |> collections.reverse(),
                        _ => {}
                    }
                }
            }
            
            # Apply OFFSET and LIMIT
            rows = rows |> collections.skip(q.offset_val)
            match q.limit_val {
                nil => {},
                n => rows = rows |> collections.take(n)
            }
            
            # Apply column selection
            match q.select_cols {
                nil => rows,
                cols => rows |> collections.map(fn(row) => {
                    cols |> collections.reduce({}, fn(r, col) => {
                        collections.set(r, col, collections.get(row, col))
                    })
                })
            }
        }
    }
}

# --- UPDATE ---

pub fn update(db, table_name, predicate, updates) => {
    let table = collections.get(db.tables, table_name)
    match table {
        nil => { error: "Table '${table_name}' not found", db: db },
        _ => {
            let mut count = 0
            let new_rows = table.rows |> collections.map(fn(row) => {
                match predicate(row) {
                    true => {
                        count = count + 1
                        collections.merge(row, updates)
                    },
                    false => row
                }
            })
            let mut d = db
            let mut t = table
            t.rows = new_rows
            d.tables = collections.set(d.tables, table_name, t)
            { ok: count, db: d }
        }
    }
}

# --- DELETE ---

pub fn delete_rows(db, table_name, predicate) => {
    let table = collections.get(db.tables, table_name)
    match table {
        nil => { error: "Table '${table_name}' not found", db: db },
        _ => {
            let original_count = collections.length(table.rows)
            let new_rows = table.rows |> collections.filter(fn(row) => !predicate(row))
            let deleted = original_count - collections.length(new_rows)
            let mut d = db
            let mut t = table
            t.rows = new_rows
            d.tables = collections.set(d.tables, table_name, t)
            { ok: deleted, db: d }
        }
    }
}

# --- Indexing ---

pub fn create_index(db, table_name, column_name) => {
    let table = collections.get(db.tables, table_name)
    match table {
        nil => db,
        _ => {
            let index = table.rows |> collections.reduce({}, fn(idx, row) => {
                let key = "${collections.get(row, column_name)}"
                let existing = collections.get(idx, key, [])
                collections.set(idx, key, existing |> collections.append(row))
            })
            let mut d = db
            d.indexes = collections.set(d.indexes, "${table_name}.${column_name}", index)
            d
        }
    }
}

fn update_indexes_for_insert(db, table_name, row) => {
    let mut d = db
    d.indexes |> collections.entries() |> collections.each(fn(entry) => {
        match entry.key |> starts_with("${table_name}.") {
            true => {
                let col = entry.key |> split(".") |> collections.last()
                let key = "${collections.get(row, col)}"
                let existing = collections.get(entry.value, key, [])
                let updated = collections.set(entry.value, key, existing |> collections.append(row))
                d.indexes = collections.set(d.indexes, entry.key, updated)
            },
            false => {}
        }
    })
    d
}

pub fn index_lookup(db, table_name, column_name, value) => {
    let key = "${table_name}.${column_name}"
    let index = collections.get(db.indexes, key, nil)
    match index {
        nil => nil,
        _ => collections.get(index, "${value}", [])
    }
}

# --- Aggregate Functions ---

pub fn count_agg() => fn(rows) => collections.length(rows)
pub fn sum_agg(field) => fn(rows) => rows |> collections.reduce(0, fn(s, r) => s + collections.get(r, field, 0))
pub fn avg_agg(field) => fn(rows) => {
    let s = sum_agg(field)(rows)
    s / collections.length(rows)
}
pub fn min_agg(field) => fn(rows) => rows |> collections.map(fn(r) => collections.get(r, field)) |> collections.min()
pub fn max_agg(field) => fn(rows) => rows |> collections.map(fn(r) => collections.get(r, field)) |> collections.max()

# --- Database Stats ---

pub fn db_stats(db) => {
    let table_stats = db.tables
        |> collections.entries()
        |> collections.map(fn(entry) => {
            { name: entry.key, rows: collections.length(entry.value.rows), columns: collections.length(entry.value.schema) }
        })
    
    {
        name: db.name,
        tables: table_stats,
        total_rows: table_stats |> collections.reduce(0, fn(s, t) => s + t.rows),
        index_count: db.indexes |> collections.entries() |> collections.length()
    }
}

# --- Main Demo ---

fn main() => {
    print("=== Arc Database Engine Demo ===\n")
    
    # Create database
    let mut db = create_db("myapp")
    
    # Create tables
    db = db |> create_table("users", [
        int_col("id", { primary_key: true, auto_increment: true }),
        text_col("name", { nullable: false }),
        text_col("email", { nullable: false }),
        int_col("age", {}),
        text_col("role", { default: "user" })
    ])
    
    db = db |> create_table("orders", [
        int_col("id", { primary_key: true, auto_increment: true }),
        int_col("user_id", { nullable: false }),
        text_col("product", { nullable: false }),
        float_col("amount", { nullable: false }),
        text_col("status", { default: "pending" })
    ])
    
    print("Created tables: users, orders\n")
    
    # Insert users
    let user_result = insert_many(db, "users", [
        { name: "Alice", email: "alice@example.com", age: 30, role: "admin" },
        { name: "Bob", email: "bob@example.com", age: 25, role: "user" },
        { name: "Charlie", email: "charlie@example.com", age: 35, role: "user" },
        { name: "Diana", email: "diana@example.com", age: 28, role: "moderator" },
        { name: "Eve", email: "eve@example.com", age: 22, role: "user" }
    ])
    db = user_result.db
    print("Inserted ${collections.length(user_result.inserted)} users")
    
    # Insert orders
    let order_result = insert_many(db, "orders", [
        { user_id: 1, product: "Laptop", amount: 999.99, status: "completed" },
        { user_id: 2, product: "Phone", amount: 499.99, status: "pending" },
        { user_id: 1, product: "Keyboard", amount: 79.99, status: "completed" },
        { user_id: 3, product: "Monitor", amount: 349.99, status: "shipped" },
        { user_id: 2, product: "Mouse", amount: 29.99, status: "completed" },
        { user_id: 4, product: "Tablet", amount: 599.99, status: "pending" },
        { user_id: 1, product: "Headphones", amount: 149.99, status: "completed" }
    ])
    db = order_result.db
    print("Inserted ${collections.length(order_result.inserted)} orders\n")
    
    # Query: All users over 25, ordered by age
    print("--- Users over 25 (by age desc) ---")
    let users_over_25 = query("users")
        |> where_gt("age", 25)
        |> order_by("age", "desc")
        |> select_columns(["name", "age", "role"])
        |> execute(db)
    users_over_25 |> collections.each(fn(u) => print("  ${u.name} (${u.age}) - ${u.role}"))
    
    # Query: Orders over $100
    print("\n--- Orders over $100 ---")
    let big_orders = query("orders")
        |> where_gt("amount", 100)
        |> order_by("amount", "desc")
        |> execute(db)
    big_orders |> collections.each(fn(o) => print("  ${o.product}: $${o.amount} (${o.status})"))
    
    # Query: Group orders by status with aggregates
    print("\n--- Orders by Status ---")
    let by_status = query("orders")
        |> group_by("status")
        |> aggregate("count", count_agg())
        |> aggregate("total", sum_agg("amount"))
        |> aggregate("avg_amount", avg_agg("amount"))
        |> execute(db)
    by_status |> collections.each(fn(g) => {
        print("  ${g.status}: ${g.count} orders, total=$${g.total}, avg=$${g.avg_amount}")
    })
    
    # Query: JOIN users and orders
    print("\n--- User Orders (JOIN) ---")
    let user_orders = query("orders")
        |> join("users", "user_id", "id")
        |> where_eq("status", "completed")
        |> order_by("amount", "desc")
        |> select_columns(["name", "product", "amount"])
        |> execute(db)
    user_orders |> collections.each(fn(uo) => print("  ${uo.name} bought ${uo.product} for $${uo.amount}"))
    
    # Update
    print("\n--- Updating pending orders to processing ---")
    let update_result = update(db, "orders", fn(r) => r.status == "pending", { status: "processing" })
    db = update_result.db
    print("Updated ${update_result.ok} rows")
    
    # Create index and lookup
    db = db |> create_index("users", "role")
    let admins = index_lookup(db, "users", "role", "admin")
    print("\n--- Admin users (via index) ---")
    admins |> collections.each(fn(u) => print("  ${u.name} (${u.email})"))
    
    # Database stats
    print("\n--- Database Stats ---")
    let stats = db_stats(db)
    print("Database: ${stats.name}")
    print("Total rows: ${stats.total_rows}")
    print("Indexes: ${stats.index_count}")
    stats.tables |> collections.each(fn(t) => {
        print("  Table '${t.name}': ${t.rows} rows, ${t.columns} columns")
    })
    
    print("\nDone!")
}

main()
