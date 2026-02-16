# Arc Standard Library: net module
# Networking utilities beyond basic HTTP

# --- WebSocket ---

# Create a WebSocket connection to the given URL
pub fn ws_connect(url) => __native("ws_connect", url)

# Send a message over a WebSocket connection
pub fn ws_send(conn, message) => __native("ws_send", conn, message)

# Close a WebSocket connection
pub fn ws_close(conn) => __native("ws_close", conn)

# Register a handler function for incoming WebSocket messages
pub fn ws_on_message(conn, handler) => __native("ws_on_message", conn, handler)

# --- TCP ---

# Create a TCP connection to host:port
pub fn tcp_connect(host, port) => __native("tcp_connect", host, port)

# Send data over a TCP connection
pub fn tcp_send(conn, data) => __native("tcp_send", conn, data)

# Close a TCP connection
pub fn tcp_close(conn) => __native("tcp_close", conn)

# --- UDP ---

# Send a UDP packet to host:port
pub fn udp_send(host, port, data) => __native("udp_send", host, port, data)

# --- DNS & Ping ---

# Resolve a hostname to an IP address
pub fn dns_lookup(hostname) => __native("dns_lookup", hostname)

# Ping a host and return latency in milliseconds
pub fn ping(host) => __native("ping", host)

# --- URL Encoding ---

# URL-encode a string (percent encoding)
pub fn url_encode(text) {
  let reserved = " !#$&'()*+,/:;=?@[]%"
  let hex = "0123456789ABCDEF"
  let mut result = ""
  for ch in text {
    if reserved |> contains(ch) {
      let code = ord(ch)
      let hi = hex[code / 16]
      let lo = hex[code % 16]
      result = result ++ "%" ++ hi ++ lo
    } el {
      result = result ++ ch
    }
  }
  result
}

# Convert a hex character to its numeric value
fn hex_char_val(c) {
  if c >= "0" and c <= "9" { ord(c) - ord("0") }
  el if c >= "A" and c <= "F" { ord(c) - ord("A") + 10 }
  el if c >= "a" and c <= "f" { ord(c) - ord("a") + 10 }
  el { 0 }
}

# URL-decode a percent-encoded string
pub fn url_decode(text) {
  let mut result = ""
  let mut i = 0
  do {
    if text[i] == "%" and i + 2 < len(text) {
      let hi = hex_char_val(text[i + 1])
      let lo = hex_char_val(text[i + 2])
      result = result ++ chr(hi * 16 + lo)
      i = i + 3
    } el if text[i] == "+" {
      result = result ++ " "
      i = i + 1
    } el {
      result = result ++ text[i]
      i = i + 1
    }
  } until i >= len(text)
  result
}

# --- Base64 ---

# Encode a string to base64
pub fn base64_encode(text) {
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let bytes = text |> to_bytes()
  let mut result = ""
  let mut i = 0
  do {
    let b0 = bytes[i]
    let b1 = if i + 1 < len(bytes) { bytes[i + 1] } el { 0 }
    let b2 = if i + 2 < len(bytes) { bytes[i + 2] } el { 0 }
    let remaining = len(bytes) - i

    result = result ++ chars[b0 / 4 % 64]
    result = result ++ chars[(b0 % 4) * 16 + b1 / 16 % 16]
    result = result ++ if remaining > 1 { chars[(b1 % 16) * 4 + b2 / 64 % 4] } el { "=" }
    result = result ++ if remaining > 2 { chars[b2 % 64] } el { "=" }
    i = i + 3
  } until i >= len(bytes)
  result
}

# Decode a base64 string
pub fn base64_decode(text) {
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let mut bytes = []
  let mut i = 0
  do {
    let a = if text[i] == "=" { 0 } el { chars |> index_of(text[i]) }
    let b = if text[i + 1] == "=" { 0 } el { chars |> index_of(text[i + 1]) }
    let c = if text[i + 2] == "=" { 0 } el { chars |> index_of(text[i + 2]) }
    let d = if text[i + 3] == "=" { 0 } el { chars |> index_of(text[i + 3]) }

    bytes = bytes ++ [a * 4 + b / 16]
    if text[i + 2] != "=" {
      bytes = bytes ++ [(b % 16) * 16 + c / 4]
    }
    if text[i + 3] != "=" {
      bytes = bytes ++ [(c % 4) * 64 + d]
    }
    i = i + 4
  } until i >= len(text)
  bytes |> from_bytes()
}

# --- Query String ---

# Parse a URL query string into a map
# e.g. "foo=bar&baz=42" => {foo: "bar", baz: "42"}
pub fn parse_query(query_string) {
  let qs = if query_string[0] == "?" { slice(query_string, 1, len(query_string)) } el { query_string }
  let pairs = qs |> split("&")
  let mut result = {}
  for pair in pairs {
    let parts = pair |> split("=")
    if len(parts) == 2 {
      let key = parts[0] |> url_decode()
      let value = parts[1] |> url_decode()
      result[key] = value
    } el if len(parts) == 1 {
      result[parts[0] |> url_decode()] = ""
    }
  }
  result
}

# Build a query string from a map
# e.g. {foo: "bar", baz: "42"} => "foo=bar&baz=42"
pub fn build_query(params_map) {
  let ks = keys(params_map)
  let mut parts = []
  for k in ks {
    let encoded_key = k |> url_encode()
    let encoded_value = params_map[k] |> to_string() |> url_encode()
    parts = parts ++ [encoded_key ++ "=" ++ encoded_value]
  }
  parts |> join("&")
}

# --- Header Parsing ---

# Parse HTTP headers string into a map
pub fn parse_headers(header_string) {
  let lines = header_string |> split("\r\n")
  let mut result = {}
  for line in lines {
    let idx = line |> index_of(":")
    if idx != nil and idx > 0 {
      let key = slice(line, 0, idx) |> trim()
      let value = slice(line, idx + 1, len(line)) |> trim()
      result[key] = value
    }
  }
  result
}

# --- Local IP ---

# Get the local machine's IP address
pub fn ip_address() => __native("ip_address")
