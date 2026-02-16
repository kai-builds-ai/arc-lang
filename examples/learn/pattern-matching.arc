# Learn Arc: Pattern Matching
# Extracted from Tutorial 3 — match expressions, destructuring, guards

# --- Basic Match ---
let day = "Monday"
let mood = match day {
  "Friday" => "🎉",
  "Saturday" | "Sunday" => "😎",
  _ => "😤"
}
print(mood)    # "😤"

# --- Match is an expression ---
let label = match status_code {
  200 => "OK",
  404 => "Not Found",
  500 => "Server Error",
  _ => "Unknown"
}

# --- Or Patterns ---
match key {
  "q" | "Q" | "quit" | "exit" => shutdown(),
  "h" | "help" => show_help(),
  _ => process(key)
}

# --- Guards ---
match temperature {
  t if t > 40 => "dangerously hot",
  t if t > 30 => "hot",
  t if t > 20 => "pleasant",
  t if t > 10 => "cool",
  t => "cold ({t}°)"
}

# --- Range Patterns ---
match score {
  90..101 => "A",
  80..90 => "B",
  70..80 => "C",
  60..70 => "D",
  _ => "F"
}

# --- Map Destructuring ---
match response {
  {status: 200, body} => parse(body),
  {status: 404} => nil,
  {status: s} if s >= 500 => retry(),
  _ => error("unexpected")
}

# --- List Destructuring ---
match items {
  [] => "empty list",
  [x] => "single item: {x}",
  [first, second] => "pair: {first}, {second}",
  [head, ..tail] => "head: {head}, rest has {len(tail)} items"
}

# --- Nested Destructuring ---
match event {
  {type: "click", target: {id, class}} =>
    print("Clicked #{id} (.{class})"),
  {type: "keypress", key: "Enter"} =>
    submit(),
  _ => nil
}

# --- Result Matching ---
match fetch_data(url) {
  Ok(data) => process(data),
  Err("timeout") => retry(),
  Err(msg) => print("Failed: {msg}")
}

# --- API Response Handler ---
fn handle_response(response) => match response {
  {status: 200, body} => parse(body),
  {status: 201, body} => {created: true, data: parse(body)},
  {status: 400, body} => error("Bad request: {body}"),
  {status: 401 | 403} => { redirect_to_login(); nil },
  {status: 404} => nil,
  {status: 500, url} => { print("Server error"); retry(url) },
  {status: s} => error("Unexpected status: {s}")
}

# --- Command Parser ---
fn parse_command(input) {
  let parts = input |> trim |> split(" ")
  match parts {
    ["help"] => show_help(),
    ["add", item] => add_item(item),
    ["remove", item] => remove_item(item),
    ["list"] => list_items(),
    ["search", ..words] => search(words |> join(" ")),
    [cmd, ..] => "Unknown command: {cmd}"
  }
}

# --- Classify with guards ---
fn classify(x) => match x {
  x if x < 0 => "negative",
  0 => "zero",
  x if x < 10 => "small",
  x if x < 100 => "medium",
  _ => "large"
}

# --- Flat nested match ---
fn handle(event) => match event {
  {type: "user", action: "login", user} => log_login(user),
  {type: "user", action: "logout", user} => log_logout(user),
  {type: "system", level: "error", message} => alert(message),
  {type: "system", message} => log(message),
  {type: t} => print("Unknown event type: {t}")
}

# --- Exercises ---
fn grade(score) => match score {
  s if s < 0 or s > 100 => "Invalid",
  s if s >= 90 => "A",
  s if s >= 80 => "B",
  s if s >= 70 => "C",
  s if s >= 60 => "D",
  _ => "F"
}

fn area(s) => match s {
  {shape: "circle", radius: r} => 3.14159 * r * r,
  {shape: "rect", width: w, height: h} => w * h,
  {shape: "triangle", base: b, height: h} => b * h / 2,
  {shape} => error("Unknown shape: {shape}")
}

fn calc(expr) => match expr {
  {op: "+", a, b} => a + b,
  {op: "-", a, b} => a - b,
  {op: "*", a, b} => a * b,
  {op: "/", a, b: 0} => error("divide by zero"),
  {op: "/", a, b} => a / b,
  {op} => "unknown op: {op}"
}
