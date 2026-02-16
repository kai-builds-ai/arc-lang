# TEST: csv module
use csv

# parse_csv
let data = parse_csv("a,b,c\n1,2,3\n4,5,6")
assert(len(data) == 3, "parse_csv rows")
assert(len(head(data)) == 3, "parse_csv cols")
assert(head(head(data)) == "a", "parse_csv first cell")

# to_csv
let rows = [["name", "age"], ["Alice", "30"], ["Bob", "25"]]
let csv_text = to_csv(rows)
assert(contains(csv_text, "name,age"), "to_csv header")
assert(contains(csv_text, "Alice,30"), "to_csv row")

# parse_csv_headers
let header_data = parse_csv_headers("name,age\nAlice,30\nBob,25")
assert(len(header_data) == 2, "headers row count")
let first_row = head(header_data)
assert(first_row["name"] == "Alice", "headers name")
assert(first_row["age"] == "30", "headers age")

# roundtrip
let original = [["x", "y"], ["1", "2"]]
let roundtripped = parse_csv(to_csv(original))
assert(len(roundtripped) == 2, "roundtrip rows")
assert(head(head(roundtripped)) == "x", "roundtrip value")

print("csv: all passed")
