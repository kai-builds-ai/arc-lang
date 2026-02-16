# arc-fetch — HTTP utilities for Arc
# Convenience wrappers around @GET/@POST with retry, timeout, caching, and builders

use std/time: now, sleep
use std/json: encode, decode

# --- Response Cache ---

let mut _cache = {}
let mut _cache_ttl = {}

fn cache_key(method, url) => method ++ ":" ++ url

pub fn clear_cache() {
  _cache = {}
  _cache_ttl = {}
}

fn get_cached(key, ttl_ms) {
  let entry = _cache[key]
  if entry == nil { nil }
  el {
    let age = now() - _cache_ttl[key]
    if age > ttl_ms { nil } el { entry }
  }
}

fn set_cached(key, value) {
  _cache[key] = value
  _cache_ttl[key] = now()
  value
}

# --- Retry Logic ---

pub fn with_retry(f, opts) {
  let max = if opts.retries { opts.retries } el { 3 }
  let delay = if opts.delay_ms { opts.delay_ms } el { 1000 }
  let backoff = if opts.backoff { opts.backoff } el { 2 }

  let mut attempt = 0
  let mut last_err = nil
  let mut result = nil
  let mut done = false

  do {
    attempt = attempt + 1
    let r = f()
    if r.ok {
      result = r
      done = true
    } el {
      last_err = r.error
      if attempt < max {
        sleep(delay * (backoff ** (attempt - 1)))
      }
    }
  } until attempt >= max or done

  if done { result }
  el { {ok: false, error: "Failed after {max} attempts: {last_err}"} }
}

# --- Headers Builder ---

pub fn headers() => {_headers: {}}

pub fn with_header(builder, key, value) {
  let h = builder._headers
  h[key] = value
  {_headers: h}
}

pub fn with_auth(builder, token) =>
  builder |> with_header("Authorization", "Bearer {token}")

pub fn with_content_type(builder, ct) =>
  builder |> with_header("Content-Type", ct)

pub fn with_json(builder) =>
  builder |> with_content_type("application/json")

pub fn with_accept(builder, accept) =>
  builder |> with_header("Accept", accept)

# --- Request Builder ---

pub fn request(method, url) => {
  method: method,
  url: url,
  _headers: {},
  _body: nil,
  _timeout_ms: 30000,
  _retries: 0,
  _cache_ttl: 0
}

pub fn body(req, data) => {
  method: req.method, url: req.url, _headers: req._headers,
  _body: data, _timeout_ms: req._timeout_ms, _retries: req._retries, _cache_ttl: req._cache_ttl
}

pub fn timeout(req, ms) => {
  method: req.method, url: req.url, _headers: req._headers,
  _body: req._body, _timeout_ms: ms, _retries: req._retries, _cache_ttl: req._cache_ttl
}

pub fn retries(req, n) => {
  method: req.method, url: req.url, _headers: req._headers,
  _body: req._body, _timeout_ms: req._timeout_ms, _retries: n, _cache_ttl: req._cache_ttl
}

pub fn cache(req, ttl_ms) => {
  method: req.method, url: req.url, _headers: req._headers,
  _body: req._body, _timeout_ms: req._timeout_ms, _retries: req._retries, _cache_ttl: ttl_ms
}

pub fn header(req, key, value) {
  let h = req._headers
  h[key] = value
  {
    method: req.method, url: req.url, _headers: h,
    _body: req._body, _timeout_ms: req._timeout_ms, _retries: req._retries, _cache_ttl: req._cache_ttl
  }
}

pub fn auth(req, token) => req |> header("Authorization", "Bearer {token}")

pub fn send(req) {
  # Check cache for GET requests
  if req.method == "GET" and req._cache_ttl > 0 {
    let key = cache_key(req.method, req.url)
    let cached = get_cached(key, req._cache_ttl)
    if cached != nil { cached }
    el {
      let result = execute(req)
      set_cached(key, result)
    }
  } el {
    execute(req)
  }
}

fn execute(req) {
  let do_request = () => {
    match req.method {
      "GET" => @GET req.url
      "POST" => @POST(req.url, req._body)
      "PUT" => @PUT(req.url, req._body)
      "DELETE" => @DELETE req.url
      _ => {ok: false, error: "Unknown method: {req.method}"}
    }
  }

  if req._retries > 0 {
    with_retry(do_request, {retries: req._retries})
  } el {
    do_request()
  }
}

# --- Convenience Functions ---

pub fn get_json(url) =>
  request("GET", url) |> with_json |> send

pub fn post_json(url, data) =>
  request("POST", url) |> with_json |> body(data) |> send

pub fn put_json(url, data) =>
  request("PUT", url) |> with_json |> body(data) |> send

pub fn delete_url(url) =>
  request("DELETE", url) |> send

# --- Parallel Fetch ---

pub fn fetch_all(urls) {
  urls |> map(url => @GET url)
}

pub fn fetch_map(url_map) {
  # Takes {key: url} map, returns {key: response}
  let ks = keys(url_map)
  let urls = ks |> map(k => url_map[k])
  let responses = fetch_all(urls)
  let mut result = {}
  for i in 0..len(ks) {
    result[ks[i]] = responses[i]
  }
  result
}

# --- URL Helpers ---

pub fn query_string(params) {
  let ks = keys(params)
  ks |> map(k => "{k}={params[k]}") |> join("&")
}

pub fn with_params(url, params) {
  let qs = query_string(params)
  if qs == "" { url } el { "{url}?{qs}" }
}
