// Arc vs JS vs Python — Token Efficiency Comparison
// Compares code density across 10+ real-world tasks

// Simple tokenizer: split on whitespace + operators for fair comparison
function countTokens(source: string): number {
  // Remove comments
  const noComments = source
    .replace(/#.*$/gm, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens = noComments.match(/\b\w+\b|"[^"]*"|'[^']*'|`[^`]*`|[^\s\w]/g);
  return tokens ? tokens.length : 0;
}

interface Task {
  name: string;
  arc: string;
  js: string;
  python: string;
}

const tasks: Task[] = [
  {
    name: "HTTP API Client",
    arc: `
fn get_user(id) = @GET "/api/users/\{id}"
fn create_user(name, email) = @POST "/api/users" { name: name, email: email }
fn update_user(id, data) = @PUT "/api/users/\{id}" data
fn delete_user(id) = @DELETE "/api/users/\{id}"
let user = get_user(1)
let new_user = create_user("Alice", "alice@test.com")
`,
    js: `
async function getUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
}
async function createUser(name, email) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  return res.json();
}
async function updateUser(id, data) {
  const res = await fetch(\`/api/users/\${id}\`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
async function deleteUser(id) {
  const res = await fetch(\`/api/users/\${id}\`, { method: "DELETE" });
  return res.json();
}
const user = await getUser(1);
const newUser = await createUser("Alice", "alice@test.com");
`,
    python: `
import requests

def get_user(id):
    return requests.get(f"/api/users/{id}").json()

def create_user(name, email):
    return requests.post("/api/users", json={"name": name, "email": email}).json()

def update_user(id, data):
    return requests.put(f"/api/users/{id}", json=data).json()

def delete_user(id):
    return requests.delete(f"/api/users/{id}").json()

user = get_user(1)
new_user = create_user("Alice", "alice@test.com")
`,
  },
  {
    name: "Data Validation",
    arc: `
type User = { name: String, age: Int, email: String }
  where (u) => len(u.name) > 0 and u.age >= 0 and contains(u.email, "@")

type PositiveInt = Int where (n) => n > 0
type Email = String where (s) => contains(s, "@") and contains(s, ".")

fn validate(user) = match user {
  { name: "", age: _, email: _ } => "name required"
  { name: _, age: a, email: _ } if a < 0 => "invalid age"
  _ => "valid"
}
`,
    js: `
function validateUser(user) {
  const errors = [];
  if (!user.name || user.name.length === 0) errors.push("name required");
  if (typeof user.age !== "number" || user.age < 0) errors.push("invalid age");
  if (!user.email || !user.email.includes("@")) errors.push("invalid email");
  if (!user.email || !user.email.includes(".")) errors.push("invalid email");
  return errors.length === 0 ? "valid" : errors[0];
}

function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}

function isEmail(s) {
  return typeof s === "string" && s.includes("@") && s.includes(".");
}

function validate(user) {
  if (!user.name || user.name === "") return "name required";
  if (user.age < 0) return "invalid age";
  return "valid";
}
`,
    python: `
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    name: str
    age: int
    email: str

    def validate(self):
        if not self.name or len(self.name) == 0:
            return "name required"
        if self.age < 0:
            return "invalid age"
        if "@" not in self.email or "." not in self.email:
            return "invalid email"
        return "valid"

def is_positive_int(n):
    return isinstance(n, int) and n > 0

def is_email(s):
    return isinstance(s, str) and "@" in s and "." in s

def validate(user):
    if not user.name:
        return "name required"
    if user.age < 0:
        return "invalid age"
    return "valid"
`,
  },
  {
    name: "Config Parsing",
    arc: `
let config = {
  host: "localhost",
  port: 8080,
  debug: true,
  db: { url: "postgres://localhost/mydb", pool: 10 }
}
let host = config.host
let port = config.port
let db_url = config.db.url
fn with_defaults(cfg) = {
  host: cfg.host,
  port: cfg.port,
  timeout: 30,
  retries: 3
}
`,
    js: `
const config = {
  host: "localhost",
  port: 8080,
  debug: true,
  db: { url: "postgres://localhost/mydb", pool: 10 },
};
const { host, port } = config;
const dbUrl = config.db.url;
function withDefaults(cfg) {
  return {
    host: cfg.host,
    port: cfg.port,
    timeout: 30,
    retries: 3,
  };
}
`,
    python: `
config = {
    "host": "localhost",
    "port": 8080,
    "debug": True,
    "db": {"url": "postgres://localhost/mydb", "pool": 10},
}
host = config["host"]
port = config["port"]
db_url = config["db"]["url"]

def with_defaults(cfg):
    return {
        "host": cfg["host"],
        "port": cfg["port"],
        "timeout": 30,
        "retries": 3,
    }
`,
  },
  {
    name: "String Processing",
    arc: `
fn slugify(s) = s |> lower() |> replace(" ", "-") |> trim()
fn capitalize(s) = upper(slice(s, 0, 1)) ++ slice(s, 1, len(s))
fn word_count(s) = s |> split(" ") |> len()
fn truncate(s, n) = if len(s) > n then slice(s, 0, n) ++ "..." else s
let slug = slugify("Hello World Test")
let cap = capitalize("hello")
let wc = word_count("hello world from arc")
let short = truncate("a very long string here", 10)
`,
    js: `
function slugify(s) {
  return s.toLowerCase().replaceAll(" ", "-").trim();
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function wordCount(s) {
  return s.split(" ").length;
}
function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + "..." : s;
}
const slug = slugify("Hello World Test");
const cap = capitalize("hello");
const wc = wordCount("hello world from arc");
const short = truncate("a very long string here", 10);
`,
    python: `
def slugify(s):
    return s.lower().replace(" ", "-").strip()

def capitalize(s):
    return s[0].upper() + s[1:]

def word_count(s):
    return len(s.split(" "))

def truncate(s, n):
    return s[:n] + "..." if len(s) > n else s

slug = slugify("Hello World Test")
cap = capitalize("hello")
wc = word_count("hello world from arc")
short = truncate("a very long string here", 10)
`,
  },
  {
    name: "Math / Algorithms",
    arc: `
fn fib(n) = if n <= 1 then n else fib(n - 1) + fib(n - 2)
fn factorial(n) = if n <= 1 then 1 else n * factorial(n - 1)
fn gcd(a, b) = if b == 0 then a else gcd(b, a % b)
fn is_prime(n) = if n < 2 then false else all(range(2, n), (d) => n % d != 0)
let primes = filter(range(2, 50), (n) => is_prime(n))
let f10 = fib(10)
let fact10 = factorial(10)
let g = gcd(48, 18)
`,
    js: `
function fib(n) {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i < n; i++) if (n % i === 0) return false;
  return true;
}
const primes = Array.from({length: 48}, (_, i) => i + 2).filter(isPrime);
const f10 = fib(10);
const fact10 = factorial(10);
const g = gcd(48, 18);
`,
    python: `
def fib(n):
    return n if n <= 1 else fib(n - 1) + fib(n - 2)

def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)

def gcd(a, b):
    return a if b == 0 else gcd(b, a % b)

def is_prime(n):
    if n < 2:
        return False
    return all(n % d != 0 for d in range(2, n))

primes = [n for n in range(2, 50) if is_prime(n)]
f10 = fib(10)
fact10 = factorial(10)
g = gcd(48, 18)
`,
  },
  {
    name: "Error Handling",
    arc: `
fn divide(a, b) = if b == 0 then { error: "division by zero" } else { value: a / b }
fn safe_head(lst) = if len(lst) == 0 then { error: "empty list" } else { value: head(lst) }
fn parse_int(s) = { value: int(s) }
let r1 = divide(10, 2)
let r2 = divide(10, 0)
let r3 = safe_head([1, 2, 3])
let r4 = safe_head([])
`,
    js: `
function divide(a, b) {
  if (b === 0) return { error: "division by zero" };
  return { value: a / b };
}
function safeHead(lst) {
  if (lst.length === 0) return { error: "empty list" };
  return { value: lst[0] };
}
function parseInt_(s) {
  const n = parseInt(s, 10);
  if (isNaN(n)) return { error: "not a number" };
  return { value: n };
}
const r1 = divide(10, 2);
const r2 = divide(10, 0);
const r3 = safeHead([1, 2, 3]);
const r4 = safeHead([]);
`,
    python: `
def divide(a, b):
    if b == 0:
        return {"error": "division by zero"}
    return {"value": a / b}

def safe_head(lst):
    if len(lst) == 0:
        return {"error": "empty list"}
    return {"value": lst[0]}

def parse_int(s):
    try:
        return {"value": int(s)}
    except ValueError:
        return {"error": "not a number"}

r1 = divide(10, 2)
r2 = divide(10, 0)
r3 = safe_head([1, 2, 3])
r4 = safe_head([])
`,
  },
  {
    name: "Async Workflows",
    arc: `
fn fetch_user(id) = async @GET "/api/users/\{id}"
fn fetch_posts(uid) = async @GET "/api/users/\{uid}/posts"

let user = await fetch_user(1)
let posts = await fetch_posts(1)

let all_data = fetch [fetch_user(1), fetch_user(2), fetch_user(3)]
`,
    js: `
async function fetchUser(id) {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json();
}
async function fetchPosts(uid) {
  const res = await fetch(\`/api/users/\${uid}/posts\`);
  return res.json();
}

const user = await fetchUser(1);
const posts = await fetchPosts(1);

const allData = await Promise.all([fetchUser(1), fetchUser(2), fetchUser(3)]);
`,
    python: `
import aiohttp

async def fetch_user(id):
    async with aiohttp.ClientSession() as session:
        async with session.get(f"/api/users/{id}") as resp:
            return await resp.json()

async def fetch_posts(uid):
    async with aiohttp.ClientSession() as session:
        async with session.get(f"/api/users/{uid}/posts") as resp:
            return await resp.json()

user = await fetch_user(1)
posts = await fetch_posts(1)

all_data = await asyncio.gather(fetch_user(1), fetch_user(2), fetch_user(3))
`,
  },
  {
    name: "File Processing",
    arc: `
fn process_lines(lines) = lines
  |> filter((l) => len(trim(l)) > 0)
  |> map((l) => trim(l))
  |> map((l) => lower(l))

fn count_words(lines) = lines
  |> map((l) => split(l, " "))
  |> flat()
  |> len()

fn unique_words(lines) = lines
  |> map((l) => split(l, " "))
  |> flat()
  |> sort()
`,
    js: `
function processLines(lines) {
  return lines
    .filter(l => l.trim().length > 0)
    .map(l => l.trim())
    .map(l => l.toLowerCase());
}

function countWords(lines) {
  return lines
    .map(l => l.split(" "))
    .flat()
    .length;
}

function uniqueWords(lines) {
  return [...new Set(lines.map(l => l.split(" ")).flat())].sort();
}
`,
    python: `
def process_lines(lines):
    lines = [l.strip() for l in lines if l.strip()]
    return [l.lower() for l in lines]

def count_words(lines):
    return sum(len(l.split(" ")) for l in lines)

def unique_words(lines):
    words = set()
    for l in lines:
        words.update(l.split(" "))
    return sorted(words)
`,
  },
  {
    name: "Data Pipeline",
    arc: `
let users = [
  { name: "Alice", age: 30, role: "admin" },
  { name: "Bob", age: 25, role: "user" },
  { name: "Charlie", age: 35, role: "admin" }
]

let admins = users |> filter((u) => u.role == "admin")
let names = admins |> map((u) => u.name)
let result = join(names, ", ")
`,
    js: `
const users = [
  { name: "Alice", age: 30, role: "admin" },
  { name: "Bob", age: 25, role: "user" },
  { name: "Charlie", age: 35, role: "admin" },
];

const admins = users.filter(u => u.role === "admin");
const names = admins.map(u => u.name);
const result = names.join(", ");
`,
    python: `
users = [
    {"name": "Alice", "age": 30, "role": "admin"},
    {"name": "Bob", "age": 25, "role": "user"},
    {"name": "Charlie", "age": 35, "role": "admin"},
]

admins = [u for u in users if u["role"] == "admin"]
names = [u["name"] for u in admins]
result = ", ".join(names)
`,
  },
  {
    name: "Pattern Matching Logic",
    arc: `
fn eval_expr(expr) = match expr {
  ["+", a, b] => eval_expr(a) + eval_expr(b)
  ["-", a, b] => eval_expr(a) - eval_expr(b)
  ["*", a, b] => eval_expr(a) * eval_expr(b)
  _ => expr
}

fn classify(val) = match val {
  0 => "zero"
  1 | 2 | 3 => "small"
  _ if val > 100 => "huge"
  _ => "normal"
}
`,
    js: `
function evalExpr(expr) {
  if (!Array.isArray(expr)) return expr;
  const [op, a, b] = expr;
  switch (op) {
    case "+": return evalExpr(a) + evalExpr(b);
    case "-": return evalExpr(a) - evalExpr(b);
    case "*": return evalExpr(a) * evalExpr(b);
    default: return expr;
  }
}

function classify(val) {
  if (val === 0) return "zero";
  if (val >= 1 && val <= 3) return "small";
  if (val > 100) return "huge";
  return "normal";
}
`,
    python: `
def eval_expr(expr):
    if not isinstance(expr, list):
        return expr
    op, a, b = expr
    if op == "+":
        return eval_expr(a) + eval_expr(b)
    elif op == "-":
        return eval_expr(a) - eval_expr(b)
    elif op == "*":
        return eval_expr(a) * eval_expr(b)
    return expr

def classify(val):
    match val:
        case 0:
            return "zero"
        case 1 | 2 | 3:
            return "small"
        case n if n > 100:
            return "huge"
        case _:
            return "normal"
`,
  },
  {
    name: "List Transformations",
    arc: `
let nums = range(1, 21)
let squares = [x * x for x in nums]
let evens = [x for x in nums if x % 2 == 0]
let pairs = zip(evens, squares)
let total = sum(nums)
let sorted_desc = reverse(sort(nums))
`,
    js: `
const nums = Array.from({length: 20}, (_, i) => i + 1);
const squares = nums.map(x => x * x);
const evens = nums.filter(x => x % 2 === 0);
const pairs = evens.map((v, i) => [v, squares[i]]);
const total = nums.reduce((a, b) => a + b, 0);
const sortedDesc = [...nums].sort((a, b) => b - a);
`,
    python: `
nums = list(range(1, 21))
squares = [x * x for x in nums]
evens = [x for x in nums if x % 2 == 0]
pairs = list(zip(evens, squares))
total = sum(nums)
sorted_desc = sorted(nums, reverse=True)
`,
  },
];

// ─── Report Generation ───

function generateReport(): string {
  const lines: string[] = [];
  lines.push("# Arc vs JS vs Python — Token Efficiency Report\n");
  lines.push(`Generated: ${new Date().toISOString()}\n`);
  lines.push("## Summary\n");
  lines.push("| Task | Arc | JS | Python | Arc vs JS | Arc vs Python |");
  lines.push("|------|----:|---:|-------:|----------:|--------------:|");

  let totalArc = 0, totalJS = 0, totalPython = 0;

  const taskResults: { name: string; arc: number; js: number; python: number }[] = [];

  for (const task of tasks) {
    const arcTokens = countTokens(task.arc);
    const jsTokens = countTokens(task.js);
    const pyTokens = countTokens(task.python);
    totalArc += arcTokens;
    totalJS += jsTokens;
    totalPython += pyTokens;

    const vsJS = ((1 - arcTokens / jsTokens) * 100).toFixed(0);
    const vsPy = ((1 - arcTokens / pyTokens) * 100).toFixed(0);

    taskResults.push({ name: task.name, arc: arcTokens, js: jsTokens, python: pyTokens });
    lines.push(`| ${task.name} | ${arcTokens} | ${jsTokens} | ${pyTokens} | ${vsJS}% fewer | ${vsPy}% fewer |`);
  }

  const totalVsJS = ((1 - totalArc / totalJS) * 100).toFixed(0);
  const totalVsPy = ((1 - totalArc / totalPython) * 100).toFixed(0);
  lines.push(`| **Total** | **${totalArc}** | **${totalJS}** | **${totalPython}** | **${totalVsJS}% fewer** | **${totalVsPy}% fewer** |`);

  lines.push("\n## Analysis\n");
  lines.push(`- **Total tasks compared:** ${tasks.length}`);
  lines.push(`- **Average Arc vs JS savings:** ${totalVsJS}% fewer tokens`);
  lines.push(`- **Average Arc vs Python savings:** ${totalVsPy}% fewer tokens`);
  lines.push(`- **Arc total tokens:** ${totalArc}`);
  lines.push(`- **JS total tokens:** ${totalJS}`);
  lines.push(`- **Python total tokens:** ${totalPython}`);

  // Find best/worst
  const sorted = [...taskResults].sort((a, b) => (a.arc / a.js) - (b.arc / b.js));
  lines.push(`\n### Best Arc advantage (vs JS): ${sorted[0].name} (${((1 - sorted[0].arc / sorted[0].js) * 100).toFixed(0)}% fewer)`);
  lines.push(`### Smallest Arc advantage (vs JS): ${sorted[sorted.length - 1].name} (${((1 - sorted[sorted.length - 1].arc / sorted[sorted.length - 1].js) * 100).toFixed(0)}% fewer)`);

  return lines.join("\n");
}

// ─── CLI ───

export async function runTokenBenchmarks() {
  // Console output
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║       Arc vs JS vs Python — Token Efficiency         ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  console.log("┌──────────────────────────┬──────┬──────┬────────┬───────────┬─────────────┐");
  console.log("│ Task                     │  Arc │   JS │ Python │ vs JS     │ vs Python   │");
  console.log("├──────────────────────────┼──────┼──────┼────────┼───────────┼─────────────┤");

  let totalArc = 0, totalJS = 0, totalPy = 0;

  for (const task of tasks) {
    const a = countTokens(task.arc);
    const j = countTokens(task.js);
    const p = countTokens(task.python);
    totalArc += a; totalJS += j; totalPy += p;

    const vsJ = `${((1 - a / j) * 100).toFixed(0)}%`.padStart(5);
    const vsP = `${((1 - a / p) * 100).toFixed(0)}%`.padStart(5);

    console.log(`│ ${task.name.padEnd(24)} │ ${String(a).padStart(4)} │ ${String(j).padStart(4)} │ ${String(p).padStart(6)} │ ${vsJ} fewer │ ${vsP} fewer │`);
  }

  console.log("├──────────────────────────┼──────┼──────┼────────┼───────────┼─────────────┤");
  const tJ = `${((1 - totalArc / totalJS) * 100).toFixed(0)}%`.padStart(5);
  const tP = `${((1 - totalArc / totalPy) * 100).toFixed(0)}%`.padStart(5);
  console.log(`│ TOTAL                    │ ${String(totalArc).padStart(4)} │ ${String(totalJS).padStart(4)} │ ${String(totalPy).padStart(6)} │ ${tJ} fewer │ ${tP} fewer │`);
  console.log("└──────────────────────────┴──────┴──────┴────────┴───────────┴─────────────┘");

  // Generate markdown report
  const report = generateReport();
  const { writeFileSync } = await import("fs");
  const { join } = await import("path");
  const outPath = join(import.meta.dirname ?? __dirname, "token-efficiency-report.md");
  writeFileSync(outPath, report);
  console.log(`\nMarkdown report written to ${outPath}`);
}

runTokenBenchmarks();
