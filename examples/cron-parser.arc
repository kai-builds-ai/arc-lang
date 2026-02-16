# =============================================================================
# cron-parser.arc — Cron Expression Parser & Scheduler
# =============================================================================
# Demonstrates: fn, let, mut, match, |>, =>, pub, import, regex, datetime,
# closures, higher-order functions, string interpolation, pattern matching
# =============================================================================

use regex
use datetime
use collections

# --- Cron field types ---
pub enum CronValue {
  Any,
  Exact(int),
  Range(int, int),
  Step(int, int), # start, step
  List(list),
}

# --- Parsed cron expression ---
pub struct CronExpr {
  minute: list,
  hour: list,
  day_of_month: list,
  month: list,
  day_of_week: list,
  raw: str,
}

# --- Named constants ---
let MONTH_NAMES = {
  "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
  "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

let DAY_NAMES = {
  "SUN": 0, "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6,
}

let FIELD_RANGES = [
  { "name": "minute", "min": 0, "max": 59 },
  { "name": "hour", "min": 0, "max": 23 },
  { "name": "day_of_month", "min": 1, "max": 31 },
  { "name": "month", "min": 1, "max": 12 },
  { "name": "day_of_week", "min": 0, "max": 6 },
]

# --- Predefined expressions ---
let PRESETS = {
  "@yearly":   "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly":  "0 0 1 * *",
  "@weekly":   "0 0 * * 0",
  "@daily":    "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly":   "0 * * * *",
}

# --- Replace month/day names with numbers ---
fn replace_names(field: str, idx: int) -> str {
  let mut result = field |> str::to_upper()

  if idx == 3 {
    MONTH_NAMES |> map::entries() |> each(fn(entry) {
      result = result |> str::replace(entry.key, "{entry.value}")
    })
  } el if idx == 4 {
    DAY_NAMES |> map::entries() |> each(fn(entry) {
      result = result |> str::replace(entry.key, "{entry.value}")
    })
  }

  result
}

# --- Parse a single cron field into expanded values ---
fn parse_field(field: str, field_idx: int) -> list {
  let range = FIELD_RANGES[field_idx]
  let cleaned = replace_names(field, field_idx)

  # Handle comma-separated list
  let parts = cleaned |> str::split(",")

  let mut values = []
  parts |> each(fn(part) {
    let expanded = parse_field_part(part |> str::trim(), range["min"], range["max"])
    values = values |> concat(expanded)
  })

  values |> collections::unique() |> collections::sort()
}

fn parse_field_part(part: str, min_val: int, max_val: int) -> list {
  # Wildcard
  if part == "*" {
    ret range(min_val, max_val + 1) |> to_list()
  }

  # Step: */n or start/n or start-end/n
  let step_match = regex::capture(part, "^(.+)/(\\d+)$")
  if step_match != nil {
    let base = step_match[1]
    let step = int::parse(step_match[2])

    let (start, end) = if base == "*" {
      (min_val, max_val)
    } el {
      let range_match = regex::capture(base, "^(\\d+)-(\\d+)$")
      if range_match != nil {
        (int::parse(range_match[1]), int::parse(range_match[2]))
      } el {
        (int::parse(base), max_val)
      }
    }

    let mut vals = []
    let mut v = start
    while v <= end {
      vals = vals |> append(v)
      v = v + step
    }
    ret vals
  }

  # Range: start-end
  let range_match = regex::capture(part, "^(\\d+)-(\\d+)$")
  if range_match != nil {
    let start = int::parse(range_match[1])
    let end = int::parse(range_match[2])
    ret range(start, end + 1) |> to_list()
  }

  # Exact value
  [int::parse(part)]
}

# --- Parse a full cron expression ---
pub fn parse(expr: str) -> CronExpr {
  let resolved = PRESETS[expr] ?? expr
  let fields = resolved |> str::trim() |> str::split_whitespace()

  if len(fields) != 5 {
    panic("Invalid cron expression: expected 5 fields, got {len(fields)}")
  }

  CronExpr {
    minute: parse_field(fields[0], 0),
    hour: parse_field(fields[1], 1),
    day_of_month: parse_field(fields[2], 2),
    month: parse_field(fields[3], 3),
    day_of_week: parse_field(fields[4], 4),
    raw: expr,
  }
}

# --- Check if a datetime matches a cron expression ---
pub fn matches(cron: CronExpr, dt: datetime) -> bool {
  let minute = datetime::minute(dt)
  let hour = datetime::hour(dt)
  let day = datetime::day(dt)
  let month = datetime::month(dt)
  let weekday = datetime::weekday(dt) # 0=Sunday

  (cron.minute |> contains(minute)) &&
  (cron.hour |> contains(hour)) &&
  (cron.day_of_month |> contains(day)) &&
  (cron.month |> contains(month)) &&
  (cron.day_of_week |> contains(weekday))
}

# --- Calculate next run time ---
pub fn next_run(cron: CronExpr, from: datetime) -> datetime {
  let mut dt = from |> datetime::add_minutes(1)
  # Zero out seconds
  dt = dt |> datetime::set_seconds(0)

  let mut iterations = 0
  let max_iterations = 525600 # 1 year of minutes

  while iterations < max_iterations {
    if matches(cron, dt) {
      ret dt
    }

    # Smart skip: if month doesn't match, jump to next valid month
    let current_month = datetime::month(dt)
    if !(cron.month |> contains(current_month)) {
      let next_month = cron.month |> find_next_value(current_month)
      if next_month != nil {
        dt = dt |> datetime::set_month(next_month) |> datetime::set_day(1)
          |> datetime::set_hour(0) |> datetime::set_minute(0)
      } el {
        # Wrap to next year
        dt = dt |> datetime::add_years(1) |> datetime::set_month(cron.month[0])
          |> datetime::set_day(1) |> datetime::set_hour(0) |> datetime::set_minute(0)
      }
      continue
    }

    dt = dt |> datetime::add_minutes(1)
    iterations = iterations + 1
  }

  panic("Could not find next run time within 1 year")
}

fn find_next_value(values: list, current: int) -> int? {
  values |> find_by(fn(v) => v > current)
}

# --- Calculate next N run times ---
pub fn next_runs(cron: CronExpr, from: datetime, count: int) -> list {
  let mut runs = []
  let mut current = from

  range(0, count) |> each(fn(_) {
    let next = next_run(cron, current)
    runs = runs |> append(next)
    current = next
  })

  runs
}

# --- Human-readable description ---
pub fn describe(cron: CronExpr) -> str {
  let minute_desc = describe_field(cron.minute, "minute", 0, 59)
  let hour_desc = describe_field(cron.hour, "hour", 0, 23)
  let dom_desc = describe_field(cron.day_of_month, "day", 1, 31)
  let month_desc = describe_month_field(cron.month)
  let dow_desc = describe_dow_field(cron.day_of_week)

  let mut parts = []

  # Time description
  if len(cron.minute) == 1 && len(cron.hour) == 1 {
    let h = cron.hour[0]
    let m = cron.minute[0]
    let period = if h >= 12 { "PM" } el { "AM" }
    let display_h = if h > 12 { h - 12 } el if h == 0 { 12 } el { h }
    parts = parts |> append("At {display_h}:{m |> str::pad_left(2, '0')} {period}")
  } el {
    if minute_desc != "every minute" {
      parts = parts |> append(minute_desc)
    }
    if hour_desc != "every hour" {
      parts = parts |> append(hour_desc)
    }
  }

  if dom_desc != "every day" {
    parts = parts |> append("on {dom_desc}")
  }
  if month_desc != "every month" {
    parts = parts |> append("in {month_desc}")
  }
  if dow_desc != "every day of the week" {
    parts = parts |> append("on {dow_desc}")
  }

  if len(parts) == 0 { "Every minute" }
  el { parts |> str::join(", ") }
}

fn describe_field(values: list, name: str, min_val: int, max_val: int) -> str {
  if len(values) == (max_val - min_val + 1) {
    "every {name}"
  } el if len(values) == 1 {
    "{name} {values[0]}"
  } el if is_consecutive(values) {
    "{name} {values[0]} through {values[len(values) - 1]}"
  } el {
    "{name} {values |> map(fn(v) => "{v}") |> str::join(", ")}"
  }
}

fn describe_month_field(values: list) -> str {
  let names = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  if len(values) == 12 { "every month" }
  el { values |> map(fn(v) => names[v]) |> str::join(", ") }
}

fn describe_dow_field(values: list) -> str {
  let names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  if len(values) == 7 { "every day of the week" }
  el { values |> map(fn(v) => names[v]) |> str::join(", ") }
}

fn is_consecutive(values: list) -> bool {
  if len(values) <= 1 { ret true }
  range(1, len(values)) |> all(fn(i) => values[i] == values[i - 1] + 1)
}

# --- Validate cron expression ---
pub fn validate(expr: str) -> { valid: bool, error: str? } {
  let resolved = PRESETS[expr] ?? expr
  let fields = resolved |> str::trim() |> str::split_whitespace()

  if len(fields) != 5 {
    ret { valid: false, error: "Expected 5 fields, got {len(fields)}" }
  }

  let field_names = ["minute", "hour", "day of month", "month", "day of week"]

  let mut errors = []
  range(0, 5) |> each(fn(i) {
    let range_info = FIELD_RANGES[i]
    let values = parse_field(fields[i], i)
    values |> each(fn(v) {
      if v < range_info["min"] || v > range_info["max"] {
        errors = errors |> append("{field_names[i]}: {v} out of range ({range_info["min"]}-{range_info["max"]})")
      }
    })
  })

  if len(errors) > 0 {
    { valid: false, error: errors |> str::join("; ") }
  } el {
    { valid: true, error: nil }
  }
}

# --- Demo ---
fn main() {
  let expressions = [
    "*/15 * * * *",
    "0 9 * * MON-FRI",
    "30 2 1 * *",
    "0 0 25 DEC *",
    "*/5 8-17 * * 1-5",
    "@daily",
    "@hourly",
    "0 */2 * * *",
    "15,45 * * * *",
    "0 0 1,15 * *",
  ]

  let now = datetime::now()
  print("Current time: {datetime::format(now, "YYYY-MM-DD HH:mm")}\n")

  expressions |> each(fn(expr) {
    print("=== {expr} ===")

    let validation = validate(expr)
    if !validation.valid {
      print("  INVALID: {validation.error}")
      ret
    }

    let cron = parse(expr)
    print("  Description: {describe(cron)}")

    let next_times = next_runs(cron, now, 3)
    print("  Next 3 runs:")
    next_times |> each_with_index(fn(dt, i) {
      print("    {i + 1}. {datetime::format(dt, "YYYY-MM-DD HH:mm (ddd)")}")
    })
    print("")
  })
}
