---
title: http
---

# http

HTTP client with native fetch implementation via sync bridge.

```arc
use http
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `get` | `(url, headers?) -> Result<Response>` | HTTP GET |
| `post` | `(url, body, headers?) -> Result<Response>` | HTTP POST |
| `put` | `(url, body, headers?) -> Result<Response>` | HTTP PUT |
| `delete` | `(url, headers?) -> Result<Response>` | HTTP DELETE |
| `fetch_all` | `(requests) -> [Result<Response>]` | Execute multiple HTTP requests |
| `parse_url` | `(url) -> Map` | Parse URL into components |

> Arc also supports the `@GET`, `@POST` syntax for inline HTTP calls — see the [Language Tour](/language-tour).
