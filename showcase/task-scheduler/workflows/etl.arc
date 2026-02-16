# ETL Workflow: Extract → Transform → Load
# Data pipeline with validation, transformation stages, and quality checks

import std/collections
import std/datetime
import std/json
import std/error
import "../main" as scheduler

# ============================================================
# Data Source Handlers
# ============================================================

fn extract_api_handler(meta) => {
  let endpoint = meta.api_url ?? "https://api.example.com/data"
  await async.sleep(400)
  {
    stage: "extract_api",
    source: endpoint,
    records: 15420,
    format: "json",
    extracted_at: datetime.format(datetime.now(), "ISO8601")
  }
}

fn extract_db_handler(meta) => {
  let table = meta.table ?? "events"
  await async.sleep(300)
  {
    stage: "extract_db",
    source: "postgres://warehouse/{table}",
    records: 82350,
    query_time_ms: 245
  }
}

fn extract_csv_handler(meta) => {
  let path = meta.file_path ?? "/data/uploads/report.csv"
  await async.sleep(150)
  { stage: "extract_csv", source: path, records: 5200, columns: 24 }
}

fn validate_handler(meta) => {
  await async.sleep(200)
  {
    stage: "validate",
    total_records: meta.total ?? 102970,
    valid: 102841,
    invalid: 129,
    validation_rules: ["not_null", "type_check", "range_check", "unique_key"]
  }
}

fn deduplicate_handler(meta) => {
  await async.sleep(250)
  { stage: "deduplicate", before: 102841, after: 101200, duplicates_removed: 1641 }
}

fn normalize_handler(meta) => {
  await async.sleep(300)
  {
    stage: "normalize",
    transformations: [
      "lowercase_emails",
      "parse_dates_to_iso8601",
      "standardize_phone_numbers",
      "trim_whitespace"
    ],
    records_transformed: 101200
  }
}

fn enrich_handler(meta) => {
  await async.sleep(500)
  {
    stage: "enrich",
    lookups_performed: 101200,
    enrichment_sources: ["geo_ip", "company_db", "currency_rates"],
    cache_hit_rate: 0.87
  }
}

fn aggregate_handler(meta) => {
  await async.sleep(350)
  {
    stage: "aggregate",
    input_records: 101200,
    output_records: 8450,
    aggregations: ["daily_totals", "category_counts", "geo_distribution"]
  }
}

fn quality_check_handler(meta) => {
  await async.sleep(200)
  {
    stage: "quality_check",
    checks_passed: 14,
    checks_failed: 0,
    data_completeness: 0.994,
    schema_valid: true
  }
}

fn load_warehouse_handler(meta) => {
  let target = meta.warehouse ?? "snowflake://analytics/fact_events"
  await async.sleep(600)
  {
    stage: "load_warehouse",
    destination: target,
    records_loaded: 8450,
    load_mode: "upsert",
    loaded_at: datetime.format(datetime.now(), "ISO8601")
  }
}

fn load_cache_handler(meta) => {
  await async.sleep(150)
  { stage: "load_cache", destination: "redis://cache/etl_results", keys_written: 340, ttl_hours: 24 }
}

fn generate_manifest_handler(meta) => {
  await async.sleep(100)
  {
    stage: "manifest",
    pipeline_id: meta.pipeline_id ?? "etl-001",
    completed_at: datetime.format(datetime.now(), "ISO8601"),
    summary: { extracted: 102970, loaded: 8450, rejected: 129 }
  }
}

# ============================================================
# ETL Pipeline DAG
# ============================================================

#   extract_api ──┐
#   extract_db  ──┼→ validate → deduplicate → normalize → enrich → aggregate → quality_check → load_warehouse → manifest
#   extract_csv ──┘                                                                         → load_cache     ──┘

pub fn create_etl_pipeline(config) => {
  let meta = { pipeline_id: config.pipeline_id ?? "etl-{datetime.format(datetime.now(), "YYYYMMDD")}" }

  let ext_api = scheduler.create_task("extract_api", extract_api_handler, { priority: 1, metadata: meta, timeout_ms: 60000 })
  let ext_db  = scheduler.create_task("extract_db", extract_db_handler, { priority: 1, metadata: meta, timeout_ms: 60000 })
  let ext_csv = scheduler.create_task("extract_csv", extract_csv_handler, { priority: 1, metadata: meta })

  let validate    = scheduler.create_task("validate", validate_handler, { priority: 2, dependencies: [ext_api.id, ext_db.id, ext_csv.id], metadata: meta })
  let dedup       = scheduler.create_task("deduplicate", deduplicate_handler, { priority: 3, dependencies: [validate.id], metadata: meta })
  let normalize   = scheduler.create_task("normalize", normalize_handler, { priority: 4, dependencies: [dedup.id], metadata: meta })
  let enrich      = scheduler.create_task("enrich", enrich_handler, { priority: 5, dependencies: [normalize.id], metadata: meta })
  let aggregate   = scheduler.create_task("aggregate", aggregate_handler, { priority: 6, dependencies: [enrich.id], metadata: meta })
  let quality     = scheduler.create_task("quality_check", quality_check_handler, { priority: 7, dependencies: [aggregate.id], metadata: meta })
  let load_wh     = scheduler.create_task("load_warehouse", load_warehouse_handler, { priority: 8, dependencies: [quality.id], metadata: meta, retries: 5 })
  let load_cache  = scheduler.create_task("load_cache", load_cache_handler, { priority: 8, dependencies: [quality.id], metadata: meta })
  let manifest    = scheduler.create_task("generate_manifest", generate_manifest_handler, { priority: 9, dependencies: [load_wh.id, load_cache.id], metadata: meta })

  let sched = scheduler.create_scheduler({ max_concurrency: 3 })
    |> scheduler.use_middleware("before_run", fn(ctx) => {
      print("  📥 {ctx.task.name}...")
      ctx
    })
    |> scheduler.use_middleware("after_run", fn(ctx) => {
      let records = ctx.task.result.records ?? ctx.task.result.records_loaded ?? ctx.task.result.output_records ?? "—"
      print("  ✓ {ctx.task.name} ({records} records)")
      ctx
    })
    |> scheduler.add_task(ext_api)
    |> scheduler.add_task(ext_db)
    |> scheduler.add_task(ext_csv)
    |> scheduler.add_task(validate)
    |> scheduler.add_task(dedup)
    |> scheduler.add_task(normalize)
    |> scheduler.add_task(enrich)
    |> scheduler.add_task(aggregate)
    |> scheduler.add_task(quality)
    |> scheduler.add_task(load_wh)
    |> scheduler.add_task(load_cache)
    |> scheduler.add_task(manifest)

  sched
}

pub async fn run_etl(config) => {
  print("🔄 Starting ETL pipeline: {config.pipeline_id ?? "default"}")
  let pipeline = create_etl_pipeline(config)
  let result = await scheduler.run(pipeline)
  let report = scheduler.generate_report(result)
  print("\n📊 ETL Report: {scheduler.report_to_json(report)}")
  result
}
