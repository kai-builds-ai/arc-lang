---
title: crypto
---

# crypto

Cryptographic operations with native implementation.

```arc
use crypto
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `md5` | `(str) -> String` | MD5 hash |
| `sha1` | `(str) -> String` | SHA-1 hash |
| `sha256` | `(str) -> String` | SHA-256 hash |
| `sha512` | `(str) -> String` | SHA-512 hash |
| `hmac_sha256` | `(key, data) -> String` | HMAC-SHA256 |
| `hmac_sha512` | `(key, data) -> String` | HMAC-SHA512 |
| `random_bytes` | `(n) -> String` | Random bytes (hex) |
| `random_int` | `(min, max) -> Int` | Random integer in range |
| `uuid` | `() -> String` | Generate UUID v4 |
| `base64_encode` | `(str) -> String` | Base64 encode |
| `base64_decode` | `(str) -> String` | Base64 decode |
| `hash_password` | `(password) -> String` | Hash a password |
| `verify_password` | `(password, hash) -> Bool` | Verify password against hash |
| `constant_time_eq` | `(a, b) -> Bool` | Constant-time string comparison |
