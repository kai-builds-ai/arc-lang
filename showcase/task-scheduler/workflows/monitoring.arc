# Monitoring Workflow: Health Check System
# Recurring health checks with cron scheduling and alerting

import std/collections
import std/datetime
import std/json
import std/error
import "../main" as scheduler

# ============================================================
# Health Check Handlers
# ============================================================

fn http_health_check(meta) => {
  let url = meta.url ?? "https://api.example.com/health"
  let start = datetime.now()
  # Simulate HTTP health check
  await async.sleep(100)
  let latency = datetime.diff_ms(datetime.now(), start)
  let healthy = latency < (meta.threshold_ms ?? 500)
  {
    check: "http",
    url: url,
    status: if healthy { "healthy" } else { "degraded" },
    latency_ms: latency,
    timestamp: datetime.format(datetime.now(), "ISO8601")
  }
}

fn database_health_check(meta) => {
  let dsn = meta.dsn ?? "postgres://localhost/app"
  await async.sleep(50)
  {
    check: "database",
    dsn: dsn,
    status: "healthy",
    connections_active: 12,
    connections_max: 100,
    replication_lag_ms: 45
  }
}

fn redis_health_check(meta) => {
  await async.sleep(30)
  {
    check: "redis",
    status: "healthy",
    memory_used_mb: 256,
    memory_max_mb: 1024,
    keys: 48210,
    hit_rate: 0.94
  }
}

fn disk_health_check(meta) => {
  await async.sleep(20)
  {
    check: "disk",
    status: "healthy",
    volumes: [
      { mount: "/", used_pct: 42.3, total_gb: 500 },
      { mount: "/data", used_pct: 67.8, total_gb: 2000 }
    ]
  }
}

fn cpu_health_check(meta) => {
  await async.sleep(20)
  {
    check: "cpu",
    status: "healthy",
    load_avg: [1.2, 0.9, 0.7],
    cores: 8,
    usage_pct: 32.5
  }
}

fn ssl_cert_check(meta) => {
  let domain = meta.domain ?? "example.com"
  await async.sleep(80)
  let expires = datetime.add(datetime.now(), { days: 45 })
  let days_left = 45
  {
    check: "ssl_cert",
    domain: domain,
    status: if days_left > 14 { "healthy" } else { "warning" },
    expires_at: datetime.format(expires, "ISO8601"),
    days_remaining: days_left,
    issuer: "Let's Encrypt"
  }
}

fn queue_health_check(meta) => {
  await async.sleep(40)
  {
    check: "queue",
    status: "healthy",
    queues: [
      { name: "default", pending: 42, processing: 3, failed: 0 },
      { name: "priority", pending: 5, processing: 1, failed: 0 },
      { name: "bulk", pending: 1240, processing: 10, failed: 2 }
    ]
  }
}

# ============================================================
# Alert System
# ============================================================

fn evaluate_alerts(results) => {
  results
    |> collections.filter(fn(r) => r.task.result.status != "healthy")
    |> collections.map(fn(r) => {
      {
        check: r.task.result.check,
        status: r.task.result.status,
        task_name: r.task.name,
        details: r.task.result,
        alerted_at: datetime.format(datetime.now(), "ISO8601")
      }
    })
}

fn format_alert(alert) =>
  "⚠️ [{alert.status}] {alert.check}: {alert.task_name} — {json.encode(alert.details)}"

# ============================================================
# Monitoring Pipeline
# ============================================================

# All health checks run in parallel (no dependencies)
# Cron: every 5 minutes = "*/5 * * * *"

pub fn create_monitoring_pipeline(config) => {
  let meta = config.metadata ?? {}
  let cron = config.cron ?? "*/5 * * * *"

  let checks = [
    scheduler.create_task("http_api_health", http_health_check, { priority: 1, cron: cron, metadata: { url: "https://api.example.com/health", threshold_ms: 500 }, timeout_ms: 5000 }),
    scheduler.create_task("http_web_health", http_health_check, { priority: 1, cron: cron, metadata: { url: "https://www.example.com/health", threshold_ms: 1000 }, timeout_ms: 5000 }),
    scheduler.create_task("database_health", database_health_check, { priority: 1, cron: cron, metadata: meta, timeout_ms: 5000 }),
    scheduler.create_task("redis_health", redis_health_check, { priority: 1, cron: cron, metadata: meta, timeout_ms: 5000 }),
    scheduler.create_task("disk_health", disk_health_check, { priority: 2, cron: cron, metadata: meta }),
    scheduler.create_task("cpu_health", cpu_health_check, { priority: 2, cron: cron, metadata: meta }),
    scheduler.create_task("ssl_cert_check", ssl_cert_check, { priority: 3, cron: "0 9 * * *", metadata: { domain: "example.com" } }),
    scheduler.create_task("queue_health", queue_health_check, { priority: 2, cron: cron, metadata: meta, timeout_ms: 5000 })
  ]

  let sched = scheduler.create_scheduler({ max_concurrency: 8 })
    |> scheduler.use_middleware("after_run", fn(ctx) => {
      let status = ctx.task.result.status ?? "unknown"
      let icon = match status {
        "healthy"  => "🟢"
        "degraded" => "🟡"
        "warning"  => "🟡"
        "critical" => "🔴"
        _          => "⚪"
      }
      print("{icon} {ctx.task.name}: {status}")
      ctx
    })
    |> scheduler.use_middleware("on_error", fn(ctx) => {
      print("🔴 {ctx.task.name}: UNREACHABLE — {ctx.task.error}")
      ctx
    })

  checks |> collections.reduce(sched, fn(s, task) => scheduler.add_task(s, task))
}

pub async fn run_health_checks(config) => {
  print("🏥 Running health checks at {datetime.format(datetime.now(), "ISO8601")}")
  print("─────────────────────────────────────")
  let pipeline = create_monitoring_pipeline(config)
  let result = await scheduler.run(pipeline)

  # Evaluate alerts
  let alerts = evaluate_alerts(result.results ?? [])
  match collections.length(alerts) {
    0 => print("\n✅ All systems healthy")
    n => {
      print("\n⚠️ {n} alert(s) triggered:")
      alerts |> collections.each(fn(a) => print(format_alert(a)))
    }
  }

  # Summary report
  let report = scheduler.generate_report(result)
  print("\n📊 Monitoring Summary: {scheduler.report_to_json(report)}")
  result
}
