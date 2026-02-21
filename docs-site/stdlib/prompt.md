---
title: prompt
---

# prompt

Template management, token counting, and context windowing for AI agents.

```arc
use prompt
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `template` | `(tmpl, vars) -> String` | Fill `<<var>>` placeholders from a map |
| `token_count` | `(text) -> Int` | Estimate token count (~4 chars/token) |
| `token_truncate` | `(text, max_tokens) -> String` | Truncate text to fit token limit |
| `context_window` | `(messages, max_tokens) -> [Message]` | Fit messages within token budget (keeps newest) |
| `chunk` | `(text, max_tokens) -> [String]` | Split text into token-sized chunks |
| `system_prompt` | `(role, instructions) -> Message` | Format a system message |
| `user_message` | `(text) -> Message` | Format a user message |
| `assistant_message` | `(text) -> Message` | Format an assistant message |
| `format_chat` | `(messages) -> String` | Format message list into chat string |

### Example

```arc
use prompt

let tmpl = "Hello <<name>>, you have <<count>> messages."
let filled = prompt.template(tmpl, {name: "Alice", count: "3"})
# => "Hello Alice, you have 3 messages."

let tokens = prompt.token_count(filled)
# => ~11
```
