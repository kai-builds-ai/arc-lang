# Arc Standard Library: crypto module
# Hashing, encryption, and cryptographic utilities

# --- Hashing ---

# Compute MD5 hash of text, returned as hex string
pub fn md5(text) {
  let bytes = text |> to_bytes()
  bytes |> __native_md5() |> hex_encode()
}

# Compute SHA-1 hash of text, returned as hex string
pub fn sha1(text) {
  let bytes = text |> to_bytes()
  bytes |> __native_sha1() |> hex_encode()
}

# Compute SHA-256 hash of text, returned as hex string
pub fn sha256(text) {
  let bytes = text |> to_bytes()
  bytes |> __native_sha256() |> hex_encode()
}

# Compute SHA-512 hash of text, returned as hex string
pub fn sha512(text) {
  let bytes = text |> to_bytes()
  bytes |> __native_sha512() |> hex_encode()
}

# --- HMAC ---

# Compute HMAC-SHA256 of message with key, returned as hex string
pub fn hmac_sha256(key, message) {
  let k = key |> to_bytes()
  let m = message |> to_bytes()
  __native_hmac(k, m, "sha256") |> hex_encode()
}

# Compute HMAC-SHA512 of message with key, returned as hex string
pub fn hmac_sha512(key, message) {
  let k = key |> to_bytes()
  let m = message |> to_bytes()
  __native_hmac(k, m, "sha512") |> hex_encode()
}

# --- Random ---

# Generate n random bytes, returned as hex string
pub fn random_bytes(n) {
  if n < 0 { panic("random_bytes: n must be non-negative") }
  el { __native_random_bytes(n) |> hex_encode() }
}

# Generate a random integer in [min, max] inclusive
pub fn random_int(min, max) {
  if min > max { panic("random_int: min must be <= max") }
  el {
    let range = max - min + 1
    min + (__native_random_u64() % range)
  }
}

# Generate a random float in [0, 1)
pub fn random_float() => __native_random_float()

# Generate a UUID v4 string
pub fn uuid() {
  let bytes = __native_random_bytes(16)
  # Set version (4) and variant (RFC 4122)
  let versioned = bytes |> set_byte(6, (get_byte(bytes, 6) & 0x0f) | 0x40)
  let final = versioned |> set_byte(8, (get_byte(versioned, 8) & 0x3f) | 0x80)
  final |> format_uuid()
}

# --- Password Hashing ---

# Hash a password with a salt using SHA-256 key stretching
pub fn hash_password(password, salt) {
  let input = salt ++ ":" ++ password
  let mut hash = input |> sha256()
  # Multiple rounds for key stretching
  for i in 0..10000 {
    hash = (hash ++ salt) |> sha256()
  }
  hash
}

# Verify a password against a stored hash and salt
pub fn verify_password(password, salt, hash) {
  let computed = hash_password(password, salt)
  constant_time_eq(computed, hash)
}

# --- Symmetric Encryption ---

# Encrypt text with key using AES-256-CBC-like scheme
# Returns hex-encoded ciphertext with prepended IV
pub fn encrypt(text, key) {
  let iv = __native_random_bytes(16)
  let key_bytes = key |> to_bytes() |> __native_sha256()  # derive 256-bit key
  let plaintext = text |> to_bytes() |> pkcs7_pad(16)
  let ciphertext = __native_aes_encrypt(plaintext, key_bytes, iv)
  (iv ++ ciphertext) |> hex_encode()
}

# Decrypt hex-encoded ciphertext with key
# Expects IV prepended to ciphertext
pub fn decrypt(ciphertext, key) {
  let raw = ciphertext |> hex_decode()
  let iv = raw |> slice(0, 16)
  let ct = raw |> slice(16, len(raw))
  let key_bytes = key |> to_bytes() |> __native_sha256()
  let plaintext = __native_aes_decrypt(ct, key_bytes, iv)
  plaintext |> pkcs7_unpad() |> from_bytes()
}

# --- Utility ---

# Timing-safe string comparison to prevent timing attacks
pub fn constant_time_eq(a, b) {
  if len(a) != len(b) { false }
  el {
    let mut result = 0
    for i in 0..len(a) {
      result = result | (char_at(a, i) ^ char_at(b, i))
    }
    result == 0
  }
}

# --- Internal helpers ---

fn hex_encode(bytes) => __native_hex_encode(bytes)
fn hex_decode(hex_str) => __native_hex_decode(hex_str)
fn to_bytes(s) => __native_to_bytes(s)
fn from_bytes(b) => __native_from_bytes(b)

fn pkcs7_pad(data, block_size) {
  let pad_len = block_size - (len(data) % block_size)
  data ++ repeat_byte(pad_len, pad_len)
}

fn pkcs7_unpad(data) {
  let pad_len = get_byte(data, len(data) - 1)
  data |> slice(0, len(data) - pad_len)
}

fn format_uuid(bytes) {
  let hex = bytes |> hex_encode()
  # Format: 8-4-4-4-12
  slice(hex, 0, 8) ++ "-" ++
  slice(hex, 8, 12) ++ "-" ++
  slice(hex, 12, 16) ++ "-" ++
  slice(hex, 16, 20) ++ "-" ++
  slice(hex, 20, 32)
}
