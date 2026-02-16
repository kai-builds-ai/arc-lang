// =============================================================================
// package-registry.arc — Mini Package Registry
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, import, regex, json,
// closures, higher-order functions, string interpolation, pattern matching,
// collections, async/await
// =============================================================================

import json
import regex
import collections
import datetime

// --- Semantic version ---
pub struct SemVer {
  major: int,
  minor: int,
  patch: int,
  prerelease: str?,
}

pub fn parse_version(version: str) -> SemVer {
  let match = regex::capture(version, "^(\\d+)\\.(\\d+)\\.(\\d+)(?:-(.+))?$")
  if match == null {
    panic("Invalid semver: {version}")
  }
  SemVer {
    major: int::parse(match[1]),
    minor: int::parse(match[2]),
    patch: int::parse(match[3]),
    prerelease: match[4],
  }
}

pub fn version_to_string(v: SemVer) -> str {
  let base = "{v.major}.{v.minor}.{v.patch}"
  if v.prerelease != null { "{base}-{v.prerelease}" } else { base }
}

pub fn compare_versions(a: SemVer, b: SemVer) -> int {
  if a.major != b.major { return a.major - b.major }
  if a.minor != b.minor { return a.minor - b.minor }
  if a.patch != b.patch { return a.patch - b.patch }
  // Prerelease has lower precedence
  match (a.prerelease, b.prerelease) {
    (null, null) => 0
    (null, _) => 1
    (_, null) => -1
    (a_pre, b_pre) => str::compare(a_pre, b_pre)
  }
}

// --- Version range matching ---
pub fn satisfies(version: SemVer, range: str) -> bool {
  let trimmed = range |> str::trim()

  // Exact match
  if regex::matches(trimmed, "^\\d+\\.\\d+\\.\\d+") && !str::contains(trimmed, " ") {
    let target = parse_version(trimmed)
    return compare_versions(version, target) == 0
  }

  // Caret range: ^1.2.3
  let caret = regex::capture(trimmed, "^\\^(\\d+)\\.(\\d+)\\.(\\d+)$")
  if caret != null {
    let min = parse_version("{caret[1]}.{caret[2]}.{caret[3]}")
    return version.major == min.major &&
      compare_versions(version, min) >= 0
  }

  // Tilde range: ~1.2.3
  let tilde = regex::capture(trimmed, "^~(\\d+)\\.(\\d+)\\.(\\d+)$")
  if tilde != null {
    let min = parse_version("{tilde[1]}.{tilde[2]}.{tilde[3]}")
    return version.major == min.major &&
      version.minor == min.minor &&
      compare_versions(version, min) >= 0
  }

  // Greater than: >=1.2.3
  let gte = regex::capture(trimmed, "^>=(\\d+\\.\\d+\\.\\d+)$")
  if gte != null {
    return compare_versions(version, parse_version(gte[1])) >= 0
  }

  // Wildcard: 1.2.* or 1.*
  let wildcard = regex::capture(trimmed, "^(\\d+)\\.(\\d+)\\.\\*$")
  if wildcard != null {
    return version.major == int::parse(wildcard[1]) &&
      version.minor == int::parse(wildcard[2])
  }

  let major_wildcard = regex::capture(trimmed, "^(\\d+)\\.\\*$")
  if major_wildcard != null {
    return version.major == int::parse(major_wildcard[1])
  }

  false
}

// --- Package metadata ---
pub struct PackageVersion {
  version: SemVer,
  dependencies: map,
  published_at: datetime,
  checksum: str,
  size_bytes: int,
  downloads: int,
}

pub struct Package {
  name: str,
  description: str,
  author: str,
  mut versions: list,
  mut tags: map,
  created_at: datetime,
}

// --- Registry ---
pub struct Registry {
  mut packages: map,
  mut download_log: list,
}

pub fn new_registry() -> Registry {
  Registry {
    packages: {},
    download_log: [],
  }
}

// --- Publish a package ---
pub fn publish(registry: mut Registry, name: str, version_str: str, metadata: map) -> bool {
  let version = parse_version(version_str)

  // Validate package name
  if !regex::matches(name, "^[a-z][a-z0-9-]*$") {
    panic("Invalid package name: '{name}'. Must be lowercase alphanumeric with hyphens.")
  }

  let pkg = registry.packages[name] ?? Package {
    name: name,
    description: metadata["description"] ?? "",
    author: metadata["author"] ?? "unknown",
    versions: [],
    tags: {},
    created_at: datetime::now(),
  }

  // Check if version already exists
  let existing = pkg.versions |> find_by(fn(v) => {
    compare_versions(v.version, version) == 0
  })
  if existing != null {
    panic("Version {version_str} of '{name}' already published")
  }

  let pkg_version = PackageVersion {
    version: version,
    dependencies: metadata["dependencies"] ?? {},
    published_at: datetime::now(),
    checksum: metadata["checksum"] ?? "sha256:placeholder",
    size_bytes: metadata["size_bytes"] ?? 0,
    downloads: 0,
  }

  pkg.versions = pkg.versions |> append(pkg_version)
    |> collections::sort_by(fn(a, b) => compare_versions(a.version, b.version))

  // Update latest tag
  pkg.tags = pkg.tags |> map::set("latest", version_str)

  registry.packages = registry.packages |> map::set(name, pkg)
  true
}

// --- Resolve a version for a package ---
pub fn resolve(registry: Registry, name: str, range: str) -> SemVer? {
  let pkg = registry.packages[name]
  if pkg == null { return null }

  // Handle tag references
  if range == "latest" {
    let latest_str = pkg.tags["latest"]
    if latest_str != null { return parse_version(latest_str) }
  }

  // Find best matching version (highest that satisfies)
  let matching = pkg.versions
    |> filter(fn(pv) => satisfies(pv.version, range))
    |> collections::sort_by(fn(a, b) => compare_versions(b.version, a.version))

  if len(matching) > 0 { matching[0].version } else { null }
}

// --- Build dependency tree ---
pub struct DepNode {
  name: str,
  version: SemVer,
  dependencies: list,
}

pub fn build_dep_tree(registry: Registry, name: str, range: str) -> DepNode? {
  let mut visited = {}
  build_dep_tree_recursive(registry, name, range, visited, 0)
}

fn build_dep_tree_recursive(registry: Registry, name: str, range: str, visited: mut map, depth: int) -> DepNode? {
  if depth > 20 {
    panic("Dependency depth limit exceeded (possible circular dependency)")
  }

  let version = resolve(registry, name, range)
  if version == null {
    panic("Cannot resolve {name}@{range}")
  }

  let version_key = "{name}@{version_to_string(version)}"
  if visited[version_key] != null {
    // Already resolved — return cached
    return visited[version_key]
  }

  // Find the package version
  let pkg = registry.packages[name]
  let pkg_version = pkg.versions |> find_by(fn(pv) => {
    compare_versions(pv.version, version) == 0
  })

  let node = DepNode {
    name: name,
    version: version,
    dependencies: [],
  }

  // Mark as visited (before recursion to handle cycles)
  visited = visited |> map::set(version_key, node)

  // Resolve sub-dependencies
  let deps = pkg_version.dependencies |> map::entries()
  node.dependencies = deps |> map(fn(entry) => {
    build_dep_tree_recursive(registry, entry.key, entry.value, visited, depth + 1)
  }) |> filter(fn(d) => d != null)

  node
}

// --- Detect conflicts ---
pub fn detect_conflicts(tree: DepNode) -> list {
  let mut versions_seen = {}
  collect_versions(tree, versions_seen)

  let conflicts = versions_seen |> map::entries()
    |> filter(fn(entry) => len(entry.value) > 1)
    |> map(fn(entry) => {
      let versions = entry.value |> collections::unique()
      if len(versions) > 1 {
        { "package": entry.key, "versions": versions }
      } else { null }
    })
    |> filter(fn(c) => c != null)

  conflicts
}

fn collect_versions(node: DepNode, seen: mut map) {
  let existing = seen[node.name] ?? []
  seen = seen |> map::set(node.name, existing |> append(version_to_string(node.version)))

  node.dependencies |> each(fn(dep) {
    collect_versions(dep, seen)
  })
}

// --- Flatten dependency tree ---
pub fn flatten_deps(tree: DepNode) -> list {
  let mut flat = []
  flatten_recursive(tree, flat)
  flat |> collections::unique_by(fn(d) => "{d["name"]}@{d["version"]}")
}

fn flatten_recursive(node: DepNode, result: mut list) {
  result = result |> append({
    "name": node.name,
    "version": version_to_string(node.version),
  })
  node.dependencies |> each(fn(dep) {
    flatten_recursive(dep, result)
  })
}

// --- Visualize dependency tree ---
pub fn visualize_tree(node: DepNode, prefix: str, is_last: bool) -> str {
  let connector = if prefix == "" { "" } else if is_last { "└── " } else { "├── " }
  let extension = if prefix == "" { "" } else if is_last { "    " } else { "│   " }

  let mut result = "{prefix}{connector}{node.name}@{version_to_string(node.version)}\n"

  node.dependencies |> each_with_index(fn(dep, i) {
    let child_is_last = i == len(node.dependencies) - 1
    result = result + visualize_tree(dep, "{prefix}{extension}", child_is_last)
  })

  result
}

// --- Simulate download ---
pub fn download(registry: mut Registry, name: str, version_str: str) -> map {
  let pkg = registry.packages[name]
  if pkg == null { panic("Package '{name}' not found") }

  let version = parse_version(version_str)
  let mut pkg_version = pkg.versions |> find_by(fn(pv) => {
    compare_versions(pv.version, version) == 0
  })

  if pkg_version == null { panic("Version {version_str} not found for '{name}'") }

  pkg_version.downloads = pkg_version.downloads + 1
  registry.download_log = registry.download_log |> append({
    "package": name,
    "version": version_str,
    "timestamp": datetime::now(),
  })

  {
    "package": name,
    "version": version_str,
    "checksum": pkg_version.checksum,
    "size_bytes": pkg_version.size_bytes,
  }
}

// --- Search packages ---
pub fn search_packages(registry: Registry, query: str) -> list {
  let pattern = regex::compile(query, "i")
  registry.packages |> map::values()
    |> filter(fn(pkg) => {
      regex::test(pattern, pkg.name) || regex::test(pattern, pkg.description)
    })
    |> map(fn(pkg) => {
      let latest = pkg.versions[len(pkg.versions) - 1]
      {
        "name": pkg.name,
        "version": version_to_string(latest.version),
        "description": pkg.description,
        "author": pkg.author,
      }
    })
}

// --- Export registry as JSON ---
pub fn export_registry(registry: Registry) -> str {
  let data = registry.packages |> map::map_values(fn(pkg) => {
    {
      "name": pkg.name,
      "description": pkg.description,
      "author": pkg.author,
      "versions": pkg.versions |> map(fn(pv) => {
        {
          "version": version_to_string(pv.version),
          "dependencies": pv.dependencies,
          "downloads": pv.downloads,
        }
      }),
    }
  })
  json::stringify(data, 2)
}

// --- Demo ---
fn main() {
  let mut registry = new_registry()

  // Publish packages
  publish(registry, "arc-core", "1.0.0", {
    "description": "Arc standard library core",
    "author": "arc-team",
    "dependencies": {},
    "size_bytes": 45000,
  })

  publish(registry, "arc-core", "1.1.0", {
    "description": "Arc standard library core",
    "author": "arc-team",
    "dependencies": {},
    "size_bytes": 48000,
  })

  publish(registry, "arc-json", "2.0.0", {
    "description": "JSON parsing for Arc",
    "author": "arc-team",
    "dependencies": { "arc-core": "^1.0.0" },
    "size_bytes": 12000,
  })

  publish(registry, "arc-http", "1.0.0", {
    "description": "HTTP client for Arc",
    "author": "community",
    "dependencies": { "arc-core": "^1.0.0", "arc-json": "^2.0.0" },
    "size_bytes": 35000,
  })

  publish(registry, "arc-test", "0.5.0", {
    "description": "Testing framework for Arc",
    "author": "community",
    "dependencies": { "arc-core": "^1.0.0" },
    "size_bytes": 18000,
  })

  publish(registry, "my-app", "1.0.0", {
    "description": "Example application",
    "author": "developer",
    "dependencies": { "arc-http": "^1.0.0", "arc-test": "^0.5.0" },
    "size_bytes": 5000,
  })

  // Resolve versions
  print("=== Version Resolution ===")
  let resolved = resolve(registry, "arc-core", "^1.0.0")
  print("arc-core ^1.0.0 -> {version_to_string(resolved)}")

  // Build dependency tree
  print("\n=== Dependency Tree ===")
  let tree = build_dep_tree(registry, "my-app", "latest")
  print(visualize_tree(tree, "", true))

  // Flatten
  print("=== Flat Dependencies ===")
  let flat = flatten_deps(tree)
  flat |> each(fn(dep) {
    print("  {dep["name"]}@{dep["version"]}")
  })

  // Conflicts
  let conflicts = detect_conflicts(tree)
  print("\n=== Conflicts ===")
  if len(conflicts) == 0 {
    print("  No conflicts detected ✓")
  } else {
    conflicts |> each(fn(c) {
      print("  ⚠ {c["package"]}: {c["versions"] |> str::join(", ")}")
    })
  }

  // Search
  print("\n=== Search: 'http' ===")
  search_packages(registry, "http") |> each(fn(pkg) {
    print("  {pkg["name"]}@{pkg["version"]} — {pkg["description"]}")
  })

  // Download simulation
  print("\n=== Download ===")
  let dl = download(registry, "arc-http", "1.0.0")
  print("  Downloaded {dl["package"]}@{dl["version"]} ({dl["size_bytes"]} bytes)")

  // Version checks
  print("\n=== Version Satisfies ===")
  let v = parse_version("1.5.3")
  let ranges = ["^1.0.0", "~1.5.0", ">=1.0.0", "1.5.*", "^2.0.0"]
  ranges |> each(fn(r) {
    let ok = satisfies(v, r)
    let icon = if ok { "✓" } else { "✗" }
    print("  {icon} 1.5.3 satisfies {r}")
  })
}
