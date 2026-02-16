# arc-logger — Structured logging for Arc
# Log levels, JSON output, timestamps, context/scope, colorized console

use std/time: now, format_time

# --- Log Levels ---

let LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
}

# --- ANSI Colors ---

let COLORS = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m"
}

# --- Logger ---

pub fn logger(name) => {
  _name: name,
  _level: "info",
  _context: {},
  _format: "pretty",
  _outputs: [console_output]
}

pub fn level(log, lvl) => {
  _name: log._name, _level: lvl, _context: log._context,
  _format: log._format, _outputs: log._outputs
}

pub fn format(log, fmt) => {
  _name: log._name, _level: log._level, _context: log._context,
  _format: fmt, _outputs: log._outputs
}

pub fn context(log, ctx) {
  let merged = merge_maps(log._context, ctx)
  {
    _name: log._name, _level: log._level, _context: merged,
    _format: log._format, _outputs: log._outputs
  }
}

pub fn child(log, name, ctx) {
  let merged = merge_maps(log._context, ctx)
  {
    _name: log._name ++ ":" ++ name, _level: log._level, _context: merged,
    _format: log._format, _outputs: log._outputs
  }
}

pub fn add_output(log, output_fn) => {
  _name: log._name, _level: log._level, _context: log._context,
  _format: log._format, _outputs: log._outputs ++ [output_fn]
}

# Helper to merge two maps
fn merge_maps(base, overrides) {
  let mut result = {}
  let base_keys = keys(base)
  for k in base_keys { result[k] = base[k] }
  let over_keys = keys(overrides)
  for k in over_keys { result[k] = overrides[k] }
  result
}

# --- Log Functions ---

pub fn debug(log, msg, data) => emit(log, "debug", msg, data)
pub fn info(log, msg, data) => emit(log, "info", msg, data)
pub fn warn(log, msg, data) => emit(log, "warn", msg, data)
pub fn error(log, msg, data) => emit(log, "error", msg, data)

fn emit(log, lvl, msg, data) {
  let min_level = if LEVELS[log._level] != nil { LEVELS[log._level] } el { 0 }
  let msg_level = if LEVELS[lvl] != nil { LEVELS[lvl] } el { 0 }

  if msg_level < min_level { nil }
  el {
    let entry = {
      level: lvl,
      msg: msg,
      name: log._name,
      time: now(),
      timestamp: format_time(now(), "ISO"),
      data: data,
      context: log._context
    }

    for output in log._outputs {
      output(log._format, entry)
    }

    entry
  }
}

# --- Output Handlers ---

fn console_output(fmt, entry) {
  match fmt {
    "json" => print(json_format(entry))
    "pretty" => print(pretty_format(entry))
    _ => print(pretty_format(entry))
  }
}

fn json_format(entry) {
  let mut obj = {
    level: entry.level,
    msg: entry.msg,
    name: entry.name,
    timestamp: entry.timestamp
  }
  if entry.data != nil {
    let data_keys = keys(entry.data)
    for k in data_keys { obj[k] = entry.data[k] }
  }
  if len(entry.context) > 0 {
    obj["context"] = entry.context
  }
  json_encode(obj)
}

fn pretty_format(entry) {
  let color = if COLORS[entry.level] != nil { COLORS[entry.level] } el { "" }
  let reset = COLORS.reset
  let dim = COLORS.dim
  let lvl_str = upper(entry.level) |> pad_right(5)

  let ctx_str = if len(entry.context) > 0 {
    " " ++ dim ++ str(entry.context) ++ reset
  } el { "" }

  let data_str = if entry.data != nil {
    " " ++ dim ++ str(entry.data) ++ reset
  } el { "" }

  "{dim}{entry.timestamp}{reset} {color}{lvl_str}{reset} {dim}[{entry.name}]{reset} {entry.msg}{data_str}{ctx_str}"
}

fn pad_right(s, n) {
  let padding = n - len(s)
  if padding > 0 { s ++ repeat(" ", padding) } el { s }
}

# --- Convenience: Module-Level Logger ---

pub fn create(name) => logger(name)

pub fn json_logger(name) => logger(name) |> format("json")

# --- Timer Utility ---

pub fn timed(log, label, f) {
  let start = now()
  let result = f()
  let elapsed = now() - start
  info(log, "{label} completed", {duration_ms: elapsed})
  result
}

# --- File Output (factory) ---

pub fn file_output(path) => (fmt, entry) => {
  let line = match fmt {
    "json" => json_format(entry)
    _ => "{entry.timestamp} [{upper(entry.level)}] [{entry.name}] {entry.msg}"
  }
  append_file(path, line ++ "\n")
}
