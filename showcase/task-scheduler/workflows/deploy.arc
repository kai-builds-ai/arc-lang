# Deploy Workflow: Build → Test → Deploy Pipeline
# Demonstrates a CI/CD pipeline as a DAG-based workflow

import std/datetime
import std/crypto
import std/json
import std/error
import "../main" as scheduler

# ============================================================
# Pipeline Stage Handlers
# ============================================================

fn checkout_handler(meta) => {
  let repo = meta.repo ?? "https://github.com/org/app"
  let branch = meta.branch ?? "main"
  # Simulate git checkout
  await async.sleep(200)
  { stage: "checkout", repo: repo, branch: branch, commit: crypto.uuid_v4() |> string.slice(0, 8) }
}

fn install_deps_handler(meta) => {
  await async.sleep(300)
  { stage: "install_deps", packages_installed: 142, cache_hit: true }
}

fn lint_handler(meta) => {
  await async.sleep(150)
  let warnings = 3
  { stage: "lint", warnings: warnings, errors: 0, passed: true }
}

fn build_handler(meta) => {
  let env = meta.environment ?? "production"
  await async.sleep(500)
  {
    stage: "build",
    environment: env,
    artifacts: ["dist/app.js", "dist/app.css", "dist/index.html"],
    size_kb: 847
  }
}

fn unit_test_handler(meta) => {
  await async.sleep(400)
  { stage: "unit_tests", total: 256, passed: 254, failed: 0, skipped: 2 }
}

fn integration_test_handler(meta) => {
  await async.sleep(600)
  { stage: "integration_tests", total: 48, passed: 48, failed: 0 }
}

fn security_scan_handler(meta) => {
  await async.sleep(350)
  { stage: "security_scan", vulnerabilities: { critical: 0, high: 0, medium: 1, low: 3 } }
}

fn deploy_staging_handler(meta) => {
  let url = "https://staging.{meta.app_name ?? "app"}.example.com"
  await async.sleep(800)
  { stage: "deploy_staging", url: url, status: "healthy" }
}

fn smoke_test_handler(meta) => {
  await async.sleep(200)
  { stage: "smoke_tests", endpoints_checked: 12, all_passed: true }
}

fn deploy_production_handler(meta) => {
  let url = "https://{meta.app_name ?? "app"}.example.com"
  await async.sleep(1000)
  {
    stage: "deploy_production",
    url: url,
    version: meta.version ?? "1.0.0",
    deployed_at: datetime.format(datetime.now(), "ISO8601")
  }
}

fn notify_handler(meta) => {
  await async.sleep(100)
  { stage: "notify", channels: ["slack", "email"], message: "Deploy complete ✓" }
}

# ============================================================
# Build the Deploy Pipeline DAG
# ============================================================

#   checkout → install_deps → lint ──────────→ build → deploy_staging → smoke_test → deploy_prod → notify
#                           → unit_tests ──┘        → security_scan ──┘
#                           → integration_tests ────┘

pub fn create_deploy_pipeline(config) => {
  let meta = { environment: config.environment ?? "production", app_name: config.app_name ?? "myapp", version: config.version ?? "1.0.0" }

  let checkout     = scheduler.create_task("checkout", checkout_handler, { priority: 1, metadata: meta })
  let install_deps = scheduler.create_task("install_deps", install_deps_handler, { priority: 1, dependencies: [checkout.id], metadata: meta })
  let lint         = scheduler.create_task("lint", lint_handler, { priority: 2, dependencies: [install_deps.id], metadata: meta })
  let unit_tests   = scheduler.create_task("unit_tests", unit_test_handler, { priority: 2, dependencies: [install_deps.id], metadata: meta })
  let int_tests    = scheduler.create_task("integration_tests", integration_test_handler, { priority: 2, dependencies: [install_deps.id], metadata: meta })
  let build        = scheduler.create_task("build", build_handler, { priority: 3, dependencies: [lint.id, unit_tests.id, int_tests.id], metadata: meta })
  let security     = scheduler.create_task("security_scan", security_scan_handler, { priority: 3, dependencies: [build.id], metadata: meta })
  let staging      = scheduler.create_task("deploy_staging", deploy_staging_handler, { priority: 4, dependencies: [build.id, security.id], metadata: meta })
  let smoke        = scheduler.create_task("smoke_tests", smoke_test_handler, { priority: 4, dependencies: [staging.id], metadata: meta })
  let production   = scheduler.create_task("deploy_production", deploy_production_handler, { priority: 5, dependencies: [smoke.id], metadata: meta, retries: 5 })
  let notify       = scheduler.create_task("notify", notify_handler, { priority: 6, dependencies: [production.id], metadata: meta })

  let sched = scheduler.create_scheduler({ max_concurrency: 3 })
    |> scheduler.use_middleware("before_run", fn(ctx) => {
      print("▶ Starting: {ctx.task.name}")
      ctx
    })
    |> scheduler.use_middleware("after_run", fn(ctx) => {
      print("✓ Completed: {ctx.task.name} → {json.encode(ctx.task.result)}")
      ctx
    })
    |> scheduler.use_middleware("on_error", fn(ctx) => {
      print("✗ Failed: {ctx.task.name} — {ctx.task.error}")
      ctx
    })
    |> scheduler.add_task(checkout)
    |> scheduler.add_task(install_deps)
    |> scheduler.add_task(lint)
    |> scheduler.add_task(unit_tests)
    |> scheduler.add_task(int_tests)
    |> scheduler.add_task(build)
    |> scheduler.add_task(security)
    |> scheduler.add_task(staging)
    |> scheduler.add_task(smoke)
    |> scheduler.add_task(production)
    |> scheduler.add_task(notify)

  sched
}

pub async fn run_deploy(config) => {
  let pipeline = create_deploy_pipeline(config)
  print("🚀 Starting deploy pipeline for {config.app_name ?? "app"} v{config.version ?? "1.0.0"}")
  let result = await scheduler.run(pipeline)
  let report = scheduler.generate_report(result)
  print("\n📊 Deploy Report:")
  print(scheduler.report_to_json(report))
  result
}
