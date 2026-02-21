---
title: llm
---

# llm

Multi-provider LLM API integration for AI agent workflows.

```arc
use llm
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `chat` | `(provider, model, messages, options?) -> Result` | Send chat completion request |
| `complete` | `(provider, model, prompt, options?) -> Result` | Simple text completion |
| `stream` | `(provider, model, messages, callback) -> Result` | Streaming chat (calls callback with response) |
| `models` | `(provider) -> [String]` | List available models |
| `estimate_cost` | `(model, input_tokens, output_tokens) -> Cost` | Estimate API cost in USD |
| `providers` | `() -> [Provider]` | List supported providers |

**Supported providers:** `"openai"`, `"anthropic"`

### Example

```arc
use llm

let result = llm.chat("openai", "gpt-4o", [
  {role: "system", content: "You are a helpful assistant."},
  {role: "user", content: "What is Arc?"}
], {temperature: 0.7})

if result.ok {
  print(result.content)
}

# Estimate costs
let cost = llm.estimate_cost("gpt-4o", 1000, 500)
print("Cost: ${cost.total}")
```
