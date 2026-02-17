// Arc Language Tree-Walking Interpreter

import * as AST from "./ast.js";
import * as nodeCrypto from "crypto";
import * as nodeOs from "os";
import * as nodeFs from "fs";
import { execSync } from "child_process";

type Value = number | string | boolean | null | Value[] | MapValue | FnValue | AsyncValue;

interface AsyncValue {
  __async: true;
  thunk: () => Value;
}

interface MapValue {
  __map: true;
  entries: Map<string, Value>;
}

interface FnValue {
  __fn: true;
  name: string;
  params: string[];
  richParams?: AST.Param[];
  body: AST.Expr;
  closure: Env;
}

class Env {
  private vars = new Map<string, { value: Value; mutable: boolean }>();
  private _depth: number;
  constructor(public parent?: Env) {
    this._depth = parent ? parent._depth + 1 : 0;
  }

  get(name: string): Value {
    const v = this.vars.get(name);
    if (v !== undefined) return v.value;
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable: ${name}`);
  }

  // Fast lookup that returns the entry directly (avoids repeated Map lookups in hot paths)
  getEntry(name: string): { value: Value; mutable: boolean } | undefined {
    const v = this.vars.get(name);
    if (v !== undefined) return v;
    if (this.parent) return this.parent.getEntry(name);
    return undefined;
  }

  set(name: string, value: Value, mutable = false): void {
    this.vars.set(name, { value, mutable });
  }

  assign(name: string, value: Value): void {
    const v = this.vars.get(name);
    if (v) {
      if (!v.mutable) throw new Error(`Cannot reassign immutable variable: ${name}`);
      v.value = value;
      return;
    }
    if (this.parent) { this.parent.assign(name, value); return; }
    throw new Error(`Undefined variable: ${name}`);
  }

  has(name: string): boolean {
    return this.vars.has(name) || (this.parent?.has(name) ?? false);
  }
}

function isTruthy(v: Value): boolean {
  if (v === null || v === false || v === 0 || v === "") return false;
  return true;
}

function toStr(v: Value): string {
  if (v === null) return "nil";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number" || typeof v === "string") return String(v);
  if (Array.isArray(v)) return "[" + v.map(toStr).join(", ") + "]";
  if (v && typeof v === "object" && "__map" in v) {
    const entries = [...(v as MapValue).entries.entries()].map(([k, val]) => `${k}: ${toStr(val)}`);
    return "{" + entries.join(", ") + "}";
  }
  if (v && typeof v === "object" && "__fn" in v) return `<fn ${(v as FnValue).name}>`;
  if (v && typeof v === "object" && "__async" in v) return `<async>`;
  return String(v);
}

function syncFetch(method: string, url: string, body: Value): MapValue {
  // Build a small Node script that does fetch and prints JSON result
  // Extract body string: if it's a map with a "data" field, use that; otherwise stringify
  // Also extract optional "headers" map for custom HTTP headers
  let bodyStr: string | null = null;
  let customHeaders: Record<string, string> = {};
  if (body != null) {
    if (typeof body === "object" && "__map" in body) {
      const m = (body as MapValue).entries;
      const d = m.get("data");
      const h = m.get("headers");
      if (h != null && typeof h === "object" && "__map" in h) {
        const hm = (h as MapValue).entries;
        for (const [k, v] of hm) customHeaders[k] = toStr(v);
      }
      bodyStr = d != null ? toStr(d) : toStr(body);
    } else {
      bodyStr = toStr(body);
    }
  }
  const bodyJson = bodyStr != null ? JSON.stringify(bodyStr) : "null";
  // Pass config via env to avoid shell escaping issues
  const fetchConfig = JSON.stringify({ method, url, body: bodyStr, headers: customHeaders });
  const script = `const c=JSON.parse(process.env.ARC_FETCH);(async()=>{const o={method:c.method,headers:{...c.headers}};if(c.body!==null){o.body=c.body;if(!o.headers["Content-Type"])o.headers["Content-Type"]="application/json";}try{const r=await fetch(c.url,o);const t=await r.text();let d;try{d=JSON.parse(t)}catch{d=t}console.log(JSON.stringify({ok:true,status:r.status,data:d}))}catch(e){console.log(JSON.stringify({ok:false,status:0,data:e.message}))}})()`;
  try {
    const raw = execSync(`node -e "${script.replace(/"/g, '\\"')}"`, {
      timeout: 30000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ARC_FETCH: fetchConfig },
    }).trim();
    const parsed = JSON.parse(raw);
    const entries = new Map<string, Value>();
    entries.set("ok", parsed.ok);
    entries.set("status", parsed.status);
    // Convert nested objects/arrays to Arc values
    entries.set("data", jsToArc(parsed.data));
    entries.set("method", method);
    entries.set("url", url);
    return { __map: true, entries } as MapValue;
  } catch (e: any) {
    const entries = new Map<string, Value>();
    entries.set("ok", false);
    entries.set("status", 0);
    entries.set("data", e.message || "fetch error");
    entries.set("method", method);
    entries.set("url", url);
    return { __map: true, entries } as MapValue;
  }
}

function jsToArc(v: any): Value {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map(jsToArc);
  if (typeof v === "object") {
    const entries = new Map<string, Value>();
    for (const [k, val] of Object.entries(v)) {
      entries.set(k, jsToArc(val));
    }
    return { __map: true, entries } as MapValue;
  }
  return String(v);
}

function resolveAsync(v: Value): Value {
  if (v && typeof v === "object" && "__async" in v) {
    return (v as AsyncValue).thunk();
  }
  return v;
}

function makePrelude(env: Env): void {
  const fns: Record<string, (...args: Value[]) => Value> = {
    print: (...args) => { console.log(args.map(toStr).join(" ")); return null; },
    len: (v) => {
      if (typeof v === "string") return v.length;
      if (Array.isArray(v)) return v.length;
      if (v && typeof v === "object" && "__map" in v) return (v as MapValue).entries.size;
      return 0;
    },
    map: (list, fn) => {
      if (!Array.isArray(list)) throw new Error("map expects a list");
      return list.map(item => callFn(fn as FnValue, [item]));
    },
    filter: (list, fn) => {
      if (!Array.isArray(list)) throw new Error("filter expects a list");
      return list.filter(item => isTruthy(callFn(fn as FnValue, [item])));
    },
    reduce: (list, fn, init) => {
      if (!Array.isArray(list)) throw new Error("reduce expects a list");
      let acc = init ?? list[0];
      const start = init !== undefined ? 0 : 1;
      for (let i = start; i < list.length; i++) {
        acc = callFn(fn as FnValue, [acc, list[i]]);
      }
      return acc;
    },
    fold: (list, init, fn) => {
      if (!Array.isArray(list)) throw new Error("fold expects a list");
      let acc = init;
      for (let i = 0; i < list.length; i++) {
        acc = callFn(fn as FnValue, [acc as Value, list[i]]);
      }
      return acc as Value;
    },
    sort: (list) => {
      if (!Array.isArray(list)) throw new Error("sort expects a list");
      return [...list].sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
      });
    },
    take: (list, n) => Array.isArray(list) ? list.slice(0, n as number) : null,
    drop: (list, n) => Array.isArray(list) ? list.slice(n as number) : null,
    find: (list, fn) => {
      if (!Array.isArray(list)) return null;
      return list.find(item => isTruthy(callFn(fn as FnValue, [item]))) ?? null;
    },
    any: (list, fn) => {
      if (!Array.isArray(list)) return false;
      return list.some(item => isTruthy(callFn(fn as FnValue, [item])));
    },
    all: (list, fn) => {
      if (!Array.isArray(list)) return false;
      return list.every(item => isTruthy(callFn(fn as FnValue, [item])));
    },
    sum: (list) => {
      if (!Array.isArray(list)) return 0;
      return list.reduce((a: number, b) => a + (typeof b === "number" ? b : 0), 0);
    },
    flat: (list) => Array.isArray(list) ? list.flat() : list,
    zip: (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return [];
      const minLen = Math.min(a.length, b.length);
      return a.slice(0, minLen).map((v, i) => [v, b[i]] as Value[]);
    },
    enumerate: (list) => {
      if (!Array.isArray(list)) return [];
      return list.map((v, i) => [i, v] as Value[]);
    },
    trim: (s) => typeof s === "string" ? s.trim() : s,
    split: (s, sep) => typeof s === "string" ? s.split(sep as string) : [],
    join: (list, sep) => Array.isArray(list) ? list.map(toStr).join(sep as string) : "",
    upper: (s) => typeof s === "string" ? s.toUpperCase() : s,
    lower: (s) => typeof s === "string" ? s.toLowerCase() : s,
    replace: (s, from, to) => typeof s === "string" ? s.replaceAll(from as string, to as string) : s,
    contains: (s, sub) => {
      if (typeof s === "string") return s.includes(sub as string);
      if (Array.isArray(s)) return s.includes(sub);
      return false;
    },
    starts: (s, pre) => typeof s === "string" ? s.startsWith(pre as string) : false,
    ends: (s, suf) => typeof s === "string" ? s.endsWith(suf as string) : false,
    int: (v) => typeof v === "string" ? parseInt(v) : typeof v === "number" ? Math.floor(v) : 0,
    float: (v) => typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0,
    str: (v) => toStr(v),
    bool: (v) => isTruthy(v),
    min: (...args) => {
      const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return Math.min(...vals.map(v => typeof v === "number" ? v : Infinity));
    },
    max: (...args) => {
      const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return Math.max(...vals.map(v => typeof v === "number" ? v : -Infinity));
    },
    abs: (v) => typeof v === "number" ? Math.abs(v) : 0,
    round: (v) => typeof v === "number" ? Math.round(v) : 0,
    assert: (cond, msg) => {
      if (!isTruthy(cond)) throw new Error(`Assertion failed: ${msg !== null && msg !== undefined ? toStr(msg) : "assertion failed"}`);
      return true;
    },
    sleep: (_ms) => null,
    timeout: (_ms, expr) => expr ?? null,
    type_of: (v) => {
      if (v === null) return "nil";
      if (typeof v === "boolean") return "bool";
      if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
      if (typeof v === "string") return "string";
      if (Array.isArray(v)) return "list";
      if (v && typeof v === "object" && "__map" in v) return "map";
      if (v && typeof v === "object" && "__fn" in v) return "fn";
      return "unknown";
    },
    head: (list) => Array.isArray(list) && list.length > 0 ? list[0] : null,
    tail: (list) => Array.isArray(list) ? list.slice(1) : [],
    last: (list) => Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null,
    reverse: (list) => Array.isArray(list) ? [...list].reverse() : list,
    range: (a, b) => { const r: number[] = []; for (let i = a as number; i < (b as number); i++) r.push(i); return r; },
    keys: (m) => m && typeof m === "object" && "__map" in m ? [...(m as MapValue).entries.keys()] : [],
    values: (m) => m && typeof m === "object" && "__map" in m ? [...(m as MapValue).entries.values()] : [],
    entries: (m) => m && typeof m === "object" && "__map" in m ? [...(m as MapValue).entries.entries()].map(([k, v]) => { const e = new Map<string, Value>(); e.set("key", k); e.set("value", v); return { __map: true, entries: e } as MapValue; }) : [],
    push: (list, item) => Array.isArray(list) ? [...list, item] : list,
    concat: (a, b) => {
      if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
      return toStr(a) + toStr(b);
    },
    chars: (s) => typeof s === "string" ? s.split("") : [],
    repeat: (s, n) => typeof s === "string" ? s.repeat(n as number) : s,
    slice: (v, start, end) => {
      const endVal = (end === null || end === undefined) ? undefined : end as number;
      if (Array.isArray(v)) return v.slice(start as number, endVal);
      if (typeof v === "string") return v.slice(start as number, endVal);
      return null;
    },
    to_string: (v) => toStr(v),
    index_of: (s, sub) => {
      if (typeof s === "string" && typeof sub === "string") {
        const idx = s.indexOf(sub);
        return idx === -1 ? null : idx;
      }
      if (Array.isArray(s)) {
        const idx = s.indexOf(sub);
        return idx === -1 ? null : idx;
      }
      return null;
    },
    ord: (s) => typeof s === "string" && s.length > 0 ? s.charCodeAt(0) : 0,
    chr: (n) => typeof n === "number" ? String.fromCharCode(n) : "",
    char_at: (s, i) => typeof s === "string" ? (s[i as number] ?? null) : null,
    time_ms: () => Date.now(),

    // --- crypto natives ---
    crypto_hash: (algorithm, data) => {
      return nodeCrypto.createHash(algorithm as string).update(data as string).digest("hex");
    },
    crypto_hmac: (algorithm, key, data) => {
      return nodeCrypto.createHmac(algorithm as string, key as string).update(data as string).digest("hex");
    },
    crypto_random_bytes: (n) => {
      const buf = nodeCrypto.randomBytes(n as number);
      return Array.from(buf) as Value[];
    },
    crypto_random_int: (min, max) => {
      const lo = min as number;
      const hi = max as number;
      return nodeCrypto.randomInt(lo, hi + 1);
    },
    crypto_uuid: () => nodeCrypto.randomUUID(),
    crypto_encode_base64: (s) => Buffer.from(s as string).toString("base64"),
    crypto_decode_base64: (s) => Buffer.from(s as string, "base64").toString("utf-8"),

    // --- net natives ---
    net_url_parse: (url) => {
      try {
        const u = new URL(url as string);
        const m = new Map<string, Value>();
        m.set("protocol", u.protocol);
        m.set("host", u.hostname);
        m.set("port", u.port || null);
        m.set("path", u.pathname);
        m.set("query", u.search || null);
        m.set("hash", u.hash || null);
        return { __map: true, entries: m } as MapValue;
      } catch {
        return null;
      }
    },
    net_url_encode: (s) => encodeURIComponent(s as string),
    net_url_decode: (s) => decodeURIComponent(s as string),
    net_query_parse: (s) => {
      const str = (s as string).startsWith("?") ? (s as string).slice(1) : s as string;
      const params = new URLSearchParams(str);
      const m = new Map<string, Value>();
      params.forEach((v, k) => m.set(k, v));
      return { __map: true, entries: m } as MapValue;
    },
    net_query_stringify: (map) => {
      if (map && typeof map === "object" && "__map" in map) {
        const entries = (map as MapValue).entries;
        const parts: string[] = [];
        entries.forEach((v, k) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(toStr(v))}`));
        return parts.join("&");
      }
      return "";
    },
    net_ip_is_valid: (s) => {
      const str = s as string;
      // IPv4
      const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(str);
      if (v4) return v4.slice(1).every(n => parseInt(n) <= 255);
      // IPv6 (simplified check)
      if (str.includes(":")) {
        try { new URL(`http://[${str}]`); return true; } catch { return false; }
      }
      return false;
    },

    // --- error natives ---
    error_new: (kind, message) => {
      const m = new Map<string, Value>();
      m.set("kind", kind);
      m.set("message", message);
      m.set("stack", null);
      return { __map: true, entries: m } as MapValue;
    },
    error_is_error: (val) => {
      if (val && typeof val === "object" && "__map" in val) {
        const entries = (val as MapValue).entries;
        return entries.has("kind") && entries.has("message");
      }
      return false;
    },
    error_wrap: (err, message) => {
      if (err && typeof err === "object" && "__map" in err) {
        const old = (err as MapValue).entries;
        const m = new Map<string, Value>();
        m.set("kind", old.get("kind") ?? null);
        m.set("message", message);
        m.set("stack", null);
        m.set("wrapped", err);
        return { __map: true, entries: m } as MapValue;
      }
      return err;
    },
    error_try: (fn) => {
      try {
        const result = typeof fn === "function" ? (fn as any)() :
          (fn && typeof fn === "object" && "__fn" in fn) ? callFn(fn, []) : null;
        const okMap = new Map<string, Value>();
        okMap.set("ok", true);
        okMap.set("value", result);
        return { __map: true, entries: okMap } as MapValue;
      } catch (e: any) {
        const errMap = new Map<string, Value>();
        errMap.set("ok", false);
        errMap.set("error", e.message ?? toStr(e as Value));
        return { __map: true, entries: errMap } as MapValue;
      }
    },
    Ok: (v) => {
      const m = new Map<string, Value>();
      m.set("ok", true);
      m.set("value", v);
      return { __map: true, entries: m } as MapValue;
    },
    Err: (e) => {
      const m = new Map<string, Value>();
      m.set("ok", false);
      m.set("error", e);
      return { __map: true, entries: m } as MapValue;
    },
    is_ok: (v) => {
      if (v && typeof v === "object" && "__map" in v) {
        return (v as MapValue).entries.get("ok") === true;
      }
      return false;
    },
    is_err: (v) => {
      if (v && typeof v === "object" && "__map" in v) {
        return (v as MapValue).entries.get("ok") === false;
      }
      return false;
    },
    unwrap: (v) => {
      if (v && typeof v === "object" && "__map" in v) {
        const m = v as MapValue;
        if (m.entries.get("ok") === true) return m.entries.get("value") ?? null;
        throw new Error(`Called unwrap on Err: ${toStr(m.entries.get("error") ?? null)}`);
      }
      throw new Error("Called unwrap on non-Result value");
    },
    unwrap_or: (v, defaultVal) => {
      if (v && typeof v === "object" && "__map" in v) {
        const m = v as MapValue;
        if (m.entries.get("ok") === true) return m.entries.get("value") ?? null;
        return defaultVal;
      }
      return defaultVal;
    },
    map_result: (v, fn) => {
      if (v && typeof v === "object" && "__map" in v) {
        const m = v as MapValue;
        if (m.entries.get("ok") === true) {
          const result = callFn(fn as FnValue, [m.entries.get("value") ?? null]);
          const newMap = new Map<string, Value>();
          newMap.set("ok", true);
          newMap.set("value", result);
          return { __map: true, entries: newMap } as MapValue;
        }
        return v; // pass Err through
      }
      throw new Error("map_result expects a Result value");
    },
    unwrap_err: (v) => {
      if (v && typeof v === "object" && "__map" in v) {
        const m = v as MapValue;
        if (m.entries.get("ok") === false) return m.entries.get("error") ?? null;
        throw new Error("Called unwrap_err on Ok value");
      }
      throw new Error("Called unwrap_err on non-Result value");
    },

    // --- regex natives ---
    regex_new: (pattern) => {
      const p = pattern as string;
      // ReDoS protection: reject patterns with nested quantifiers that cause catastrophic backtracking
      if (/(\+|\*|\{)\s*(\+|\*|\{)/.test(p) || /\([^)]*(\+|\*)\)[+*]/.test(p)) {
        throw new Error(`Potentially unsafe regex pattern (ReDoS risk): ${p}`);
      }
      // Validate the pattern
      new RegExp(p);
      // Return a map representing a compiled regex
      const m = new Map<string, Value>();
      m.set("pattern", pattern);
      m.set("__regex", true as any);
      return { __map: true, entries: m } as MapValue;
    },
    regex_try_new: (pattern) => {
      try {
        new RegExp(pattern as string);
        const m = new Map<string, Value>();
        m.set("pattern", pattern);
        m.set("__regex", true as any);
        return { __map: true, entries: m } as MapValue;
      } catch { return null; }
    },
    regex_find: (re, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      const match = new RegExp(pattern).exec(text as string);
      if (!match) return null;
      const m = new Map<string, Value>();
      m.set("match", match[0]);
      m.set("index", match.index);
      const groups = match.slice(1).map(g => g ?? null) as Value[];
      m.set("groups", groups);
      return { __map: true, entries: m } as MapValue;
    },
    regex_find_all: (re, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      const regex = new RegExp(pattern, "g");
      const results: Value[] = [];
      let match;
      while ((match = regex.exec(text as string)) !== null) {
        const m = new Map<string, Value>();
        m.set("match", match[0]);
        m.set("index", match.index);
        const groups = match.slice(1).map(g => g ?? null) as Value[];
        m.set("groups", groups);
        results.push({ __map: true, entries: m } as MapValue);
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) regex.lastIndex++;
      }
      return results;
    },
    regex_replace: (re, replacement, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      return (text as string).replace(new RegExp(pattern), replacement as string);
    },
    regex_replace_all: (re, replacement, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      return (text as string).replace(new RegExp(pattern, "g"), replacement as string);
    },
    regex_split: (re, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      return (text as string).split(new RegExp(pattern));
    },
    regex_captures: (re, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      const match = new RegExp(pattern).exec(text as string);
      if (!match || match.length <= 1) return null;
      return match.slice(1).map(g => g ?? null) as Value[];
    },
    regex_captures_all: (re, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      const regex = new RegExp(pattern, "g");
      const results: Value[] = [];
      let match;
      while ((match = regex.exec(text as string)) !== null) {
        if (match.length > 1) {
          results.push(match.slice(1).map(g => g ?? null) as Value[]);
        }
        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) regex.lastIndex++;
      }
      return results;
    },
    regex_test: (re, text) => {
      const pattern = (re && typeof re === "object" && "__map" in re)
        ? (re as MapValue).entries.get("pattern") as string
        : re as string;
      return new RegExp(pattern).test(text as string);
    },

    // --- datetime natives ---
    __builtin_now: () => Date.now(),
    __builtin_date_from_ts: (ts) => {
      const d = new Date(ts as number);
      const m = new Map<string, Value>();
      m.set("year", d.getFullYear());
      m.set("month", d.getMonth() + 1);
      m.set("day", d.getDate());
      m.set("hour", d.getHours());
      m.set("minute", d.getMinutes());
      m.set("second", d.getSeconds());
      m.set("ms", d.getMilliseconds());
      return { __map: true, entries: m } as MapValue;
    },
    __builtin_date_parse: (dateStr, format) => {
      const s = dateStr as string;
      const fmt = format as string;
      // Support ISO format and custom format tokens
      if (fmt === "ISO" || fmt === "iso") {
        return new Date(s).getTime();
      }
      // Parse using format tokens: YYYY, MM, DD, hh, mm, ss
      let year = 2000, month = 1, day = 1, hour = 0, min = 0, sec = 0;
      let fi = 0, si = 0;
      while (fi < fmt.length && si < s.length) {
        if (fmt.slice(fi, fi + 4) === "YYYY") { year = parseInt(s.slice(si, si + 4)); fi += 4; si += 4; }
        else if (fmt.slice(fi, fi + 2) === "MM") { month = parseInt(s.slice(si, si + 2)); fi += 2; si += 2; }
        else if (fmt.slice(fi, fi + 2) === "DD") { day = parseInt(s.slice(si, si + 2)); fi += 2; si += 2; }
        else if (fmt.slice(fi, fi + 2) === "hh") { hour = parseInt(s.slice(si, si + 2)); fi += 2; si += 2; }
        else if (fmt.slice(fi, fi + 2) === "mm") { min = parseInt(s.slice(si, si + 2)); fi += 2; si += 2; }
        else if (fmt.slice(fi, fi + 2) === "ss") { sec = parseInt(s.slice(si, si + 2)); fi += 2; si += 2; }
        else { fi++; si++; }
      }
      return new Date(year, month - 1, day, hour, min, sec).getTime();
    },
    __builtin_date_format: (ts, fmt) => {
      const d = new Date(ts as number);
      let result = fmt as string;
      result = result.replace("YYYY", String(d.getFullYear()));
      result = result.replace("MM", String(d.getMonth() + 1).padStart(2, "0"));
      result = result.replace("DD", String(d.getDate()).padStart(2, "0"));
      result = result.replace("hh", String(d.getHours()).padStart(2, "0"));
      result = result.replace("mm", String(d.getMinutes()).padStart(2, "0"));
      result = result.replace("ss", String(d.getSeconds()).padStart(2, "0"));
      return result;
    },
    __builtin_date_to_iso: (ts) => new Date(ts as number).toISOString(),
    __builtin_date_from_iso: (s) => new Date(s as string).getTime(),

    // --- os natives ---
    __native: (name, ...args) => {
      const cmd = name as string;
      switch (cmd) {
        case "os.cwd": return process.cwd();
        case "os.env": return process.env[args[0] as string] ?? null;
        case "os.set_env": { process.env[args[0] as string] = args[1] as string; return null; }
        case "os.platform": {
          const p = process.platform;
          if (p === "win32") return "windows";
          if (p === "darwin") return "macos";
          return p;
        }
        case "os.home_dir": return nodeOs.homedir();
        case "os.temp_dir": return nodeOs.tmpdir();
        case "os.list_dir": {
          try {
            const fs = require("fs");
            return nodeFs.readdirSync(args[0] as string) as Value[];
          } catch { return []; }
        }
        case "os.is_file": {
          try {
            const fs = require("fs");
            return nodeFs.statSync(args[0] as string).isFile();
          } catch { return false; }
        }
        case "os.is_dir": {
          try {
            const fs = require("fs");
            return nodeFs.statSync(args[0] as string).isDirectory();
          } catch { return false; }
        }
        case "os.mkdir": {
          try {
            const fs = require("fs");
            nodeFs.mkdirSync(args[0] as string, { recursive: true });
            return true;
          } catch { return false; }
        }
        case "os.rmdir": {
          try {
            const fs = require("fs");
            nodeFs.rmdirSync(args[0] as string);
            return true;
          } catch { return false; }
        }
        case "os.remove": {
          try {
            const fs = require("fs");
            nodeFs.unlinkSync(args[0] as string);
            return true;
          } catch { return false; }
        }
        case "os.rename": {
          try {
            const fs = require("fs");
            nodeFs.renameSync(args[0] as string, args[1] as string);
            return true;
          } catch { return false; }
        }
        case "os.copy": {
          try {
            const fs = require("fs");
            nodeFs.copyFileSync(args[0] as string, args[1] as string);
            return true;
          } catch { return false; }
        }
        case "os.file_size": {
          try {
            const fs = require("fs");
            return nodeFs.statSync(args[0] as string).size;
          } catch { return null; }
        }
        case "os.exec": {
          try {
            const cmd = args[0] as string;
            // Command injection protection: reject commands with common shell injection patterns
            const dangerous = /[;&|`$]|\$\(|>\s*>|<\s*<|\beval\b|\bsource\b/;
            if (dangerous.test(cmd)) {
              throw new Error(`Potentially unsafe command (injection risk): ${cmd}`);
            }
            const cp = require("child_process");
            return execSync(cmd, { encoding: "utf-8", timeout: 10000 }).trim();
          } catch (e: any) {
            if (e.message?.includes("injection risk")) throw e;
            return null;
          }
        }
        // --- prompt natives ---
        case "prompt.token_count": {
          const text = String(args[0] ?? "");
          return Math.ceil(text.length / 4);
        }
        case "prompt.token_truncate": {
          const text = String(args[0] ?? "");
          const maxTokens = args[1] as number;
          const maxChars = maxTokens * 4;
          if (text.length <= maxChars) return text;
          return text.slice(0, maxChars);
        }
        case "prompt.chunk": {
          const text = String(args[0] ?? "");
          const maxTokens = args[1] as number;
          const chunkSize = maxTokens * 4;
          const chunks: string[] = [];
          for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
          }
          return chunks.length > 0 ? chunks : [""];
        }
        case "prompt.context_window": {
          const messages = args[0] as Value[];
          const maxTokens = args[1] as number;
          if (!Array.isArray(messages)) return [];
          let budget = maxTokens;
          const result: Value[] = [];
          for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i] as MapValue;
            const content = msg?.entries?.get("content") ?? "";
            const tokens = Math.ceil(String(content).length / 4);
            if (tokens > budget) break;
            budget -= tokens;
            result.unshift(msg);
          }
          return result;
        }
        case "prompt.template": {
          let text = String(args[0] ?? "");
          const vars = args[1] as MapValue;
          if (vars && typeof vars === "object" && "__map" in vars) {
            for (const [k, v] of vars.entries) {
              text = text.replaceAll(`<<${k}>>`, String(v ?? ""));
            }
          }
          return text;
        }
        // --- store natives ---
        case "store.open": {
          const p = args[0] as string;
          let data: Record<string, Value> = {};
          try {
            const raw = nodeFs.readFileSync(p, "utf-8");
            data = JSON.parse(raw);
          } catch { /* file doesn't exist or invalid JSON — start empty */ }
          return { __store: true, path: p, data } as any;
        }
        case "store.get": {
          const s = args[0] as any;
          const k = args[1] as string;
          return s.data[k] ?? null;
        }
        case "store.set": {
          const s = args[0] as any;
          s.data[args[1] as string] = args[2];
          nodeFs.writeFileSync(s.path, JSON.stringify(s.data, null, 2), "utf-8");
          return args[2];
        }
        case "store.delete": {
          const s = args[0] as any;
          const k = args[1] as string;
          const had = k in s.data;
          delete s.data[k];
          nodeFs.writeFileSync(s.path, JSON.stringify(s.data, null, 2), "utf-8");
          return had;
        }
        case "store.has": {
          const s = args[0] as any;
          return (args[1] as string) in s.data;
        }
        case "store.keys": {
          const s = args[0] as any;
          return Object.keys(s.data) as Value[];
        }
        case "store.values": {
          const s = args[0] as any;
          return Object.values(s.data) as Value[];
        }
        case "store.entries": {
          const s = args[0] as any;
          return Object.entries(s.data).map(([k, v]) => ({ key: k, value: v }) as unknown as Value);
        }
        case "store.clear": {
          const s = args[0] as any;
          s.data = {};
          nodeFs.writeFileSync(s.path, JSON.stringify(s.data, null, 2), "utf-8");
          return true;
        }
        case "store.size": {
          const s = args[0] as any;
          return Object.keys(s.data).length;
        }
        case "store.merge": {
          const s = args[0] as any;
          const m = args[1] as any;
          if (m && typeof m === "object" && "__map" in m && m.entries instanceof Map) {
            for (const [k, v] of m.entries) {
              s.data[k] = v as Value;
            }
          } else if (m && typeof m === "object" && !Array.isArray(m)) {
            for (const [k, v] of Object.entries(m)) {
              if (k !== "__type" && k !== "__proto__" && k !== "__map" && k !== "entries") s.data[k] = v as Value;
            }
          }
          nodeFs.writeFileSync(s.path, JSON.stringify(s.data, null, 2), "utf-8");
          return true;
        }
        default: return null;
      }
    },

    // --- embed/vector natives ---
    embed_dot_product: (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return 0;
      let sum = 0;
      for (let i = 0; i < a.length; i++) sum += (a[i] as number) * (b[i] as number);
      return sum;
    },
    embed_magnitude: (v) => {
      if (!Array.isArray(v)) return 0;
      let sum = 0;
      for (let i = 0; i < v.length; i++) sum += (v[i] as number) * (v[i] as number);
      return Math.sqrt(sum);
    },
    embed_cosine_similarity: (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return 0;
      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < a.length; i++) {
        const ai = a[i] as number, bi = b[i] as number;
        dot += ai * bi;
        magA += ai * ai;
        magB += bi * bi;
      }
      const denom = Math.sqrt(magA) * Math.sqrt(magB);
      return denom === 0 ? 0 : dot / denom;
    },
    embed_normalize: (v) => {
      if (!Array.isArray(v)) return [];
      let sum = 0;
      for (let i = 0; i < v.length; i++) sum += (v[i] as number) * (v[i] as number);
      const mag = Math.sqrt(sum);
      if (mag === 0) return v;
      return v.map(x => (x as number) / mag);
    },
    embed_euclidean_distance: (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return 0;
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const d = (a[i] as number) - (b[i] as number);
        sum += d * d;
      }
      return Math.sqrt(sum);
    },
    embed_centroid: (vectors) => {
      if (!Array.isArray(vectors) || vectors.length === 0) return [];
      const first = vectors[0] as Value[];
      const dim = first.length;
      const sums = new Float64Array(dim);
      for (let i = 0; i < vectors.length; i++) {
        const v = vectors[i] as Value[];
        for (let j = 0; j < dim; j++) sums[j] += v[j] as number;
      }
      const n = vectors.length;
      const result: Value[] = new Array(dim);
      for (let j = 0; j < dim; j++) result[j] = sums[j] / n;
      return result;
    },
    embed_most_similar: (query, candidates, topK) => {
      if (!Array.isArray(query) || !Array.isArray(candidates)) return [];
      const k = topK as number;
      const scored: { score: number; idx: number }[] = [];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i] as MapValue;
        const vec = c.entries.get("vector") as Value[];
        let dot = 0, magA = 0, magB = 0;
        for (let j = 0; j < query.length; j++) {
          const qj = query[j] as number, vj = vec[j] as number;
          dot += qj * vj;
          magA += qj * qj;
          magB += vj * vj;
        }
        const denom = Math.sqrt(magA) * Math.sqrt(magB);
        scored.push({ score: denom === 0 ? 0 : dot / denom, idx: i });
      }
      scored.sort((a, b) => b.score - a.score);
      const results: Value[] = [];
      for (let i = 0; i < Math.min(k, scored.length); i++) {
        const s = scored[i];
        const c = candidates[s.idx] as MapValue;
        const m = new Map<string, Value>();
        m.set("id", c.entries.get("id") ?? null);
        m.set("score", s.score);
        results.push({ __map: true, entries: m } as MapValue);
      }
      return results;
    },

    // --- file I/O (used by stdlib/io.arc) ---
    read: (path) => {
      try {
        return nodeFs.readFileSync(path as string, "utf-8");
      } catch { return null; }
    },
    write: (path, content) => {
      try {
        nodeFs.writeFileSync(path as string, content as string, "utf-8");
        return true;
      } catch { return false; }
    },
  };

  function callFn(fn: FnValue | Value, args: Value[]): Value {
    if (fn && typeof fn === "object" && "__fn" in fn) {
      const f = fn as FnValue;
      const fnEnv = new Env(f.closure);
      bindParams(f, args, fnEnv, evalExpr);
      try {
        return evalExpr(f.body, fnEnv);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        throw e;
      }
    }
    // It might be a native function stored as a special wrapper
    if (typeof fn === "function") return (fn as any)(...args);
    throw new Error(`Not a function: ${toStr(fn)}`);
  }

  // Register prelude fns as special callable values
  for (const [name, fn] of Object.entries(fns)) {
    env.set(name, fn as any);
  }
}

function bindParams(fn: FnValue, args: Value[], fnEnv: Env, evalExprFn: (e: AST.Expr, env: Env) => Value): void {
  if (fn.richParams) {
    for (let i = 0; i < fn.richParams.length; i++) {
      const p = fn.richParams[i];
      if (p.rest) {
        fnEnv.set(p.name, args.slice(i));
      } else if (i < args.length) {
        fnEnv.set(p.name, args[i]);
      } else if (p.default) {
        fnEnv.set(p.name, evalExprFn(p.default, fn.closure));
      } else {
        fnEnv.set(p.name, null);
      }
    }
  } else {
    fn.params.forEach((p, i) => fnEnv.set(p, args[i] ?? null));
  }
}

// Return signal — thrown to unwind the stack on `ret`
class ReturnSignal {
  constructor(public value: Value) {}
}

// Tail Call Optimization signal
interface TCOSignal {
  __tco: true;
  args: Value[];
}

// Evaluate expression in tail position — returns TCOSignal for self-recursive tail calls
function evalExprTCO(expr: AST.Expr, env: Env, fnName: string): Value | TCOSignal {
  // Only handle tail-position expressions specially
  switch (expr.kind) {
    case "IfExpr": {
      const cond = evalExpr(expr.condition, env);
      if (isTruthy(cond)) return evalExprTCO(expr.then, env, fnName);
      if (expr.else_) return evalExprTCO(expr.else_, env, fnName);
      return null;
    }
    case "CallExpr": {
      // Check if this is a self-recursive tail call
      if (expr.callee.kind === "Identifier" && expr.callee.name === fnName) {
        const args = expr.args.map(a => evalExpr(a, env));
        return { __tco: true, args } as TCOSignal;
      }
      return evalExpr(expr, env);
    }
    case "BlockExpr": {
      const blockEnv = new Env(env);
      let result: Value | TCOSignal = null;
      for (let i = 0; i < expr.stmts.length; i++) {
        if (i === expr.stmts.length - 1 && expr.stmts[i].kind === "ExprStmt") {
          return evalExprTCO((expr.stmts[i] as AST.ExprStmt).expr, blockEnv, fnName);
        }
        result = evalStmt(expr.stmts[i], blockEnv);
      }
      return result;
    }
    case "MatchExpr": {
      const subject = evalExpr(expr.subject, env);
      for (const arm of expr.arms) {
        const matchEnv = new Env(env);
        if (matchPattern(arm.pattern, subject, matchEnv)) {
          if (arm.guard && !isTruthy(evalExpr(arm.guard, matchEnv))) continue;
          return evalExprTCO(arm.body, matchEnv, fnName);
        }
      }
      return null;
    }
    default:
      return evalExpr(expr, env);
  }
}

function evalExpr(expr: AST.Expr, env: Env): Value {
  switch (expr.kind) {
    case "IntLiteral": return expr.value;
    case "FloatLiteral": return expr.value;
    case "BoolLiteral": return expr.value;
    case "NilLiteral": return null;
    case "StringLiteral": return expr.value;

    case "StringInterp": {
      return expr.parts.map(p => typeof p === "string" ? p : toStr(evalExpr(p, env))).join("");
    }

    case "Identifier": return env.get(expr.name);

    case "BinaryExpr": {
      // Short-circuit for logical operators
      if (expr.op === "and") {
        const left = evalExpr(expr.left, env);
        return isTruthy(left) ? evalExpr(expr.right, env) : left;
      }
      if (expr.op === "or") {
        const left = evalExpr(expr.left, env);
        return isTruthy(left) ? left : evalExpr(expr.right, env);
      }
      const left = evalExpr(expr.left, env);
      const right = evalExpr(expr.right, env);
      switch (expr.op) {
        case "+": {
          if (typeof left === "string" || typeof right === "string") {
            return toStr(left) + toStr(right);
          }
          return (left as number) + (right as number);
        }
        case "-": return (left as number) - (right as number);
        case "*": return (left as number) * (right as number);
        case "/": {
          if (right === 0) throw new Error(`Division by zero at line ${expr.loc.line}`);
          return (left as number) / (right as number);
        }
        case "%": {
          if (right === 0) throw new Error(`Modulo by zero at line ${expr.loc.line}`);
          return (left as number) % (right as number);
        }
        case "**": return Math.pow(left as number, right as number);
        case "==": return left === right;
        case "!=": return left !== right;
        case "<": return (left as number) < (right as number);
        case ">": return (left as number) > (right as number);
        case "<=": return (left as number) <= (right as number);
        case ">=": return (left as number) >= (right as number);
        case "++": {
          if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
          return toStr(left) + toStr(right);
        }
        default: throw new Error(`Unknown operator: ${expr.op} at line ${expr.loc.line}`);
      }
    }

    case "UnaryExpr": {
      const operand = evalExpr(expr.operand, env);
      if (expr.op === "-") return -(operand as number);
      if (expr.op === "not") return !isTruthy(operand);
      throw new Error(`Unknown unary op: ${expr.op}`);
    }

    case "CallExpr": {
      const callee = evalExpr(expr.callee, env);
      let args = expr.args.map(a => evalExpr(a, env));

      let result: Value;
      if (typeof callee === "function") {
        result = (callee as any)(...args);
      } else if (callee && typeof callee === "object" && "__fn" in callee) {
        let fn = callee as FnValue;
        // Tail call optimization loop: if the function body resolves to
        // a tail call back to itself, reuse the frame instead of recursing
        try {
          tailLoop: while (true) {
            const fnEnv = new Env(fn.closure);
            bindParams(fn, args, fnEnv, evalExpr);
            const bodyResult = evalExprTCO(fn.body, fnEnv, fn.name);
            if (bodyResult && typeof bodyResult === "object" && "__tco" in bodyResult) {
              const tco = bodyResult as TCOSignal;
              args = tco.args;
              // fn stays the same — it's a self-recursive tail call
              continue tailLoop;
            }
            result = bodyResult;
            break;
          }
        } catch (e) {
          if (e instanceof ReturnSignal) {
            result = e.value;
          } else {
            throw e;
          }
        }
      } else {
        throw new Error(`Not callable: ${toStr(callee)} at line ${expr.loc.line}`);
      }
      // Auto-await async function results
      return resolveAsync(result);
    }

    case "MemberExpr": {
      const obj = evalExpr(expr.object, env);
      if (obj === null) return null;
      if (obj && typeof obj === "object" && "__map" in obj) {
        return (obj as MapValue).entries.get(expr.property) ?? null;
      }
      throw new Error(`Cannot access property '${expr.property}' on ${toStr(obj)}`);
    }

    case "OptionalMemberExpr": {
      const obj = evalExpr(expr.object, env);
      if (obj === null) return null;
      if (obj && typeof obj === "object" && "__map" in obj) {
        return (obj as MapValue).entries.get(expr.property) ?? null;
      }
      throw new Error(`Cannot access property '${expr.property}' on ${toStr(obj)}`);
    }

    case "TryExpr": {
      const val = evalExpr(expr.expr, env);
      // If val is a Result with ok: false, return early with the Err
      if (val && typeof val === "object" && "__map" in val) {
        const m = val as MapValue;
        if (m.entries.get("ok") === false) {
          throw new ReturnSignal(val);
        }
        if (m.entries.get("ok") === true) {
          return m.entries.get("value") ?? null;
        }
      }
      // Not a Result type — just return the value
      return val;
    }

    case "IndexExpr": {
      const obj = evalExpr(expr.object, env);
      const idx = evalExpr(expr.index, env);
      if (Array.isArray(obj) && typeof idx === "number") return obj[idx] ?? null;
      if (obj && typeof obj === "object" && "__map" in obj) {
        const key = typeof idx === "string" ? idx : toStr(idx);
        return (obj as MapValue).entries.get(key) ?? null;
      }
      return null;
    }

    case "PipelineExpr": {
      const left = evalExpr(expr.left, env);
      // The right side should be a function or call expression
      // If it's an identifier, call it with left as first arg
      // If it's a call, prepend left to args
      if (expr.right.kind === "Identifier") {
        const fn = env.get(expr.right.name);
        if (typeof fn === "function") return (fn as any)(left);
        if (fn && typeof fn === "object" && "__fn" in fn) {
          const f = fn as FnValue;
          const fnEnv = new Env(f.closure);
          bindParams(f, [left], fnEnv, evalExpr);
          try { return evalExpr(f.body, fnEnv); } catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
        }
      }
      if (expr.right.kind === "CallExpr") {
        const callee = evalExpr(expr.right.callee, env);
        const args = [left, ...expr.right.args.map(a => evalExpr(a, env))];
        if (typeof callee === "function") return (callee as any)(...args);
        if (callee && typeof callee === "object" && "__fn" in callee) {
          const fn = callee as FnValue;
          const fnEnv = new Env(fn.closure);
          bindParams(fn, args, fnEnv, evalExpr);
          try { return evalExpr(fn.body, fnEnv); } catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
        }
      }
      throw new Error(`Pipeline target must be a function at line ${expr.loc.line}`);
    }

    case "IfExpr": {
      const cond = evalExpr(expr.condition, env);
      if (isTruthy(cond)) return evalExpr(expr.then, env);
      if (expr.else_) return evalExpr(expr.else_, env);
      return null;
    }

    case "MatchExpr": {
      const subject = evalExpr(expr.subject, env);
      for (const arm of expr.arms) {
        const matchEnv = new Env(env);
        if (matchPattern(arm.pattern, subject, matchEnv)) {
          if (arm.guard && !isTruthy(evalExpr(arm.guard, matchEnv))) continue;
          return evalExpr(arm.body, matchEnv);
        }
      }
      return null;
    }

    case "LambdaExpr": {
      return { __fn: true, name: "<lambda>", params: expr.params, body: expr.body, closure: env } as FnValue;
    }

    case "SpreadExpr": {
      // SpreadExpr should only appear inside list/map literals; standalone is an error
      throw new Error(`Spread operator can only be used inside list or map literals`);
    }

    case "ListLiteral": {
      const result: Value[] = [];
      for (const e of expr.elements) {
        if (e.kind === "SpreadExpr") {
          const val = evalExpr(e.expr, env);
          if (Array.isArray(val)) {
            result.push(...val);
          } else {
            throw new Error(`Spread expects a list, got ${toStr(val)}`);
          }
        } else {
          result.push(evalExpr(e, env));
        }
      }
      return result;
    }

    case "MapLiteral": {
      const m = new Map<string, Value>();
      for (const entry of expr.entries) {
        if (entry.spread) {
          const val = evalExpr(entry.spread, env);
          if (val && typeof val === "object" && "__map" in val) {
            for (const [k, v] of (val as MapValue).entries) {
              m.set(k, v);
            }
          } else {
            throw new Error(`Spread in map expects a map, got ${toStr(val)}`);
          }
        } else {
          const key = typeof entry.key === "string" ? entry.key : toStr(evalExpr(entry.key as AST.Expr, env));
          m.set(key, evalExpr(entry.value!, env));
        }
      }
      return { __map: true, entries: m } as MapValue;
    }

    case "ListComprehension": {
      const iterable = evalExpr(expr.iterable, env);
      if (!Array.isArray(iterable)) throw new Error(`Comprehension requires iterable at line ${expr.loc.line}`);
      const result: Value[] = [];
      for (const item of iterable) {
        const iterEnv = new Env(env);
        iterEnv.set(expr.variable, item);
        if (expr.filter && !isTruthy(evalExpr(expr.filter, iterEnv))) continue;
        result.push(evalExpr(expr.expr, iterEnv));
      }
      return result;
    }

    case "RangeExpr": {
      const start = evalExpr(expr.start, env) as number;
      const end = evalExpr(expr.end, env) as number;
      const result: number[] = [];
      for (let i = start; i < end; i++) result.push(i);
      return result;
    }

    case "ToolCallExpr": {
      const method = expr.method.toUpperCase();
      const arg = evalExpr(expr.arg, env);
      const url = toStr(arg);
      // Real HTTP tool calls via synchronous fetch
      if (["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)) {
        let bodyArg: Value = null;
        if (expr.body) {
          bodyArg = evalExpr(expr.body, env);
        }
        return syncFetch(method, url, bodyArg);
      }
      // Custom tool call
      console.log(`[tool @${expr.method}(${url})]`);
      return `result-from-${expr.method}`;
    }

    case "AsyncExpr": {
      const capturedEnv = env;
      const body = expr.body;
      return { __async: true, thunk: () => evalExpr(body, new Env(capturedEnv)) } as AsyncValue;
    }

    case "AwaitExpr": {
      const val = evalExpr(expr.expr, env);
      return resolveAsync(val);
    }

    case "FetchExpr": {
      return expr.targets.map(t => {
        const val = evalExpr(t, env);
        return resolveAsync(val);
      });
    }

    case "BlockExpr": {
      const blockEnv = new Env(env);
      let result: Value = null;
      for (const stmt of expr.stmts) {
        result = evalStmt(stmt, blockEnv);
      }
      return result;
    }

    default:
      throw new Error(`Unknown expression kind: ${(expr as any).kind}`);
  }
}

function matchPattern(pattern: AST.Pattern, value: Value, env: Env): boolean {
  switch (pattern.kind) {
    case "WildcardPattern": return true;
    case "LiteralPattern": return pattern.value === value;
    case "BindingPattern":
      env.set(pattern.name, value);
      return true;
    case "ArrayPattern": {
      if (!Array.isArray(value)) return false;
      if (pattern.elements.length !== value.length) return false;
      return pattern.elements.every((p, i) => matchPattern(p, value[i], env));
    }
    case "OrPattern":
      return pattern.patterns.some(p => matchPattern(p, value, env));
    case "ConstructorPattern": {
      if (!value || typeof value !== "object" || !("__map" in value)) return false;
      const m = (value as MapValue).entries;
      if (pattern.name === "Ok") {
        if (m.get("ok") !== true) return false;
        if (pattern.args.length > 0) {
          return matchPattern(pattern.args[0], m.get("value") ?? null, env);
        }
        return true;
      }
      if (pattern.name === "Err") {
        if (m.get("ok") !== false) return false;
        if (pattern.args.length > 0) {
          return matchPattern(pattern.args[0], m.get("error") ?? null, env);
        }
        return true;
      }
      return false;
    }
    default: return false;
  }
}

function evalStmt(stmt: AST.Stmt, env: Env): Value {
  switch (stmt.kind) {
    case "LetStmt": {
      const value = evalExpr(stmt.value, env);
      if (typeof stmt.name === "string") {
        env.set(stmt.name, value, stmt.mutable);
      } else {
        // Destructuring
        const target = stmt.name;
        if (target.type === "object" && value && typeof value === "object" && "__map" in value) {
          const m = (value as MapValue).entries;
          for (const n of target.names) env.set(n, m.get(n) ?? null, stmt.mutable);
        } else if (target.type === "array" && Array.isArray(value)) {
          target.names.forEach((n, i) => env.set(n, value[i] ?? null, stmt.mutable));
          if (target.rest) {
            env.set(target.rest, value.slice(target.names.length), stmt.mutable);
          }
        }
      }
      return value;
    }

    case "FnStmt": {
      const fn: FnValue = { __fn: true, name: stmt.name, params: stmt.params, richParams: stmt.richParams, body: stmt.body, closure: env };
      env.set(stmt.name, fn);
      return fn;
    }

    case "ForStmt": {
      const iterable = evalExpr(stmt.iterable, env);
      if (!Array.isArray(iterable)) throw new Error(`For loop requires iterable at line ${stmt.loc.line}`);
      let result: Value = null;
      for (const item of iterable) {
        const loopEnv = new Env(env);
        if (typeof stmt.variable === "string") {
          loopEnv.set(stmt.variable, item);
        } else {
          const target = stmt.variable;
          if (target.type === "array" && Array.isArray(item)) {
            target.names.forEach((n, i) => loopEnv.set(n, (item as Value[])[i] ?? null));
          } else if (target.type === "object" && item && typeof item === "object" && "__map" in item) {
            const m = (item as MapValue).entries;
            for (const n of target.names) loopEnv.set(n, m.get(n) ?? null);
          }
        }
        result = evalExpr(stmt.body, loopEnv);
      }
      return result;
    }

    case "DoStmt": {
      let result: Value = null;
      do {
        result = evalExpr(stmt.body, env);
        const cond = evalExpr(stmt.condition, env);
        if (stmt.isWhile && !isTruthy(cond)) break;
        if (!stmt.isWhile && isTruthy(cond)) break;
      } while (true);
      return result;
    }

    case "AssignStmt": {
      const value = evalExpr(stmt.value, env);
      env.assign(stmt.target, value);
      return value;
    }

    case "MemberAssignStmt": {
      const obj = evalExpr(stmt.object, env);
      const value = evalExpr(stmt.value, env);
      if (obj && typeof obj === "object" && "__map" in obj) {
        (obj as MapValue).entries.set(stmt.property, value);
        return value;
      }
      throw new Error(`Cannot assign property '${stmt.property}' on ${toStr(obj)}`);
    }

    case "IndexAssignStmt": {
      const obj = evalExpr(stmt.object, env);
      const index = evalExpr(stmt.index, env);
      const value = evalExpr(stmt.value, env);
      if (Array.isArray(obj) && typeof index === "number") {
        obj[index] = value;
        return value;
      }
      if (obj && typeof obj === "object" && "__map" in obj) {
        const key = typeof index === "string" ? index : toStr(index);
        (obj as MapValue).entries.set(key, value);
        return value;
      }
      throw new Error(`Cannot assign index on ${toStr(obj)}`);
    }

    case "RetStmt": {
      const value = stmt.value ? evalExpr(stmt.value, env) : null;
      throw new ReturnSignal(value);
    }
    case "ExprStmt": return evalExpr(stmt.expr, env);
    case "UseStmt": {
      // Module imports handled by interpretWithFile; no-op if no file context
      return null;
    }
    case "TypeStmt": {
      // Store type definitions in the environment for runtime validation
      const typeDef = stmt as AST.TypeStmt;
      env.set(`__type__${typeDef.name}`, typeDef.def as any);
      return null;
    }

    default:
      throw new Error(`Unknown statement kind: ${(stmt as any).kind}`);
  }
}

export function createEnv(): Env {
  const env = new Env();
  makePrelude(env);
  return env;
}

export function runStmt(stmt: AST.Stmt, env: Env): Value {
  return evalStmt(stmt, env);
}

export function runExpr(expr: AST.Expr, env: Env): Value {
  return evalExpr(expr, env);
}

export type UseHandler = (stmt: AST.UseStmt, env: Env) => void;

export function interpret(program: AST.Program, onUse?: UseHandler): void {
  const env = createEnv();
  for (const stmt of program.stmts) {
    if (stmt.kind === "UseStmt" && onUse) {
      onUse(stmt as AST.UseStmt, env);
    } else {
      evalStmt(stmt, env);
    }
  }
}

export function interpretWithEnv(program: AST.Program, env: Env, onUse?: UseHandler): Value {
  let result: Value = null;
  for (const stmt of program.stmts) {
    if (stmt.kind === "UseStmt" && onUse) {
      onUse(stmt as AST.UseStmt, env);
      result = null;
    } else {
      result = evalStmt(stmt, env);
    }
  }
  return result;
}

export { Env, Value, toStr };
