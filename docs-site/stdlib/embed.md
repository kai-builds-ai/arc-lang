---
title: embed
---

# embed

Vector embeddings, similarity search, and distance calculations.

```arc
use embed
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `dot_product` | `(vec_a, vec_b) -> Number` | Dot product of two vectors |
| `magnitude` | `(vec) -> Number` | Vector magnitude (L2 norm) |
| `cosine_similarity` | `(vec_a, vec_b) -> Number` | Cosine similarity (-1 to 1) |
| `normalize` | `(vec) -> [Number]` | Normalize to unit vector |
| `euclidean_distance` | `(vec_a, vec_b) -> Number` | Euclidean distance |
| `centroid` | `(vectors) -> [Number]` | Average vector (centroid) |
| `most_similar` | `(query_vec, candidates, top_k) -> [{id, score}]` | Top-k most similar vectors |
| `chunk_and_embed` | `(text, chunk_size) -> [{chunk, index}]` | Split text into chunks |

### Example

```arc
use embed

let a = [1.0, 0.0, 0.0]
let b = [0.0, 1.0, 0.0]
embed.cosine_similarity(a, b)  # => 0.0 (orthogonal)

let candidates = [
  {id: "doc1", vector: [0.9, 0.1, 0.0]},
  {id: "doc2", vector: [0.0, 0.8, 0.2]}
]
embed.most_similar(a, candidates, 1)  # => [{id: "doc1", score: ~0.99}]
```
