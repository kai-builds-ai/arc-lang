# Monitoring Workflow
# Demonstrates: health checks, thresholds, alerting patterns

fn check_health(service) {
  # Simulate health check
  { service: service, status: "healthy", response: "ok" }
}

fn check_metric(name, value, threshold) {
  let status = if value > threshold { "warning" } el { "ok" }
  { metric: name, value: value, threshold: threshold, status: status }
}

fn format_alert(check) {
  if check.status == "warning" {
    "ALERT: {check.metric} = {check.value} (threshold: {check.threshold})"
  } el {
    "OK: {check.metric} = {check.value}"
  }
}

# --- Run Monitoring ---
print("=== Monitoring Workflow ===")
print("")

# Health checks
let services = ["api", "database", "cache", "worker"]
print("Health Checks:")
for svc in services {
  let health = check_health(svc)
  print("  {health.service}: {health.status}")
}

# Metric checks
print("")
print("Metric Checks:")
let metrics = [
  check_metric("cpu_usage", 75, 80),
  check_metric("memory_usage", 85, 80),
  check_metric("disk_usage", 60, 90),
  check_metric("response_time_ms", 250, 200),
  check_metric("error_rate", 2, 5)
]

let mut alerts = []
for m in metrics {
  let msg = format_alert(m)
  print("  {msg}")
  if m.status == "warning" {
    alerts = push(alerts, m)
  }
}

print("")
print("Summary: {len(alerts)} alerts out of {len(metrics)} checks")
if len(alerts) > 0 {
  print("Alert details:")
  for a in alerts {
    print("  - {a.metric}: {a.value} exceeds threshold {a.threshold}")
  }
}
