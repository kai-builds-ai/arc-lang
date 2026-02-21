---
title: net
---

# net

Networking utilities with native implementation.

```arc
use net
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `url_parse` | `(url) -> Map` | Parse URL into components |
| `url_encode` | `(str) -> String` | URL encode |
| `url_decode` | `(str) -> String` | URL decode |
| `parse_query` | `(str) -> Map` | Parse query string |
| `build_query` | `(map) -> String` | Build query string from map |
| `ip_is_valid` | `(str) -> Bool` | Validate IP address |
