# Arc Standard Library: csv module
# CSV utilities (pure string manipulation)

pub fn parse_csv(text) => __native("csv.parse", text)

pub fn to_csv(rows) {
  join(map(rows, row => join(map(row, cell => _escape_csv(str(cell))), ",")), "\n")
}

pub fn parse_csv_headers(text) {
  let rows = __native("csv.parse", text)
  if len(rows) < 2 { [] }
  el {
    let headers = head(rows)
    let data_rows = tail(rows)
    map(data_rows, cells => {
      let mut row = {}
      for i in 0..len(headers) {
        let key = trim(headers[i])
        let val = if i < len(cells) { cells[i] } el { "" }
        row[key] = val
      }
      row
    })
  }
}

fn _parse_csv_line(line) {
  # Simple CSV: split by comma, trim each cell
  let cells = split(line, ",")
  map(cells, cell => trim(cell))
}

fn _escape_csv(s) {
  if contains(s, ",") or contains(s, "\"") or contains(s, "\n") {
    "\"" ++ replace(s, "\"", "\"\"") ++ "\""
  } el {
    s
  }
}
