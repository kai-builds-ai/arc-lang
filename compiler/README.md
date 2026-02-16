# Arc Compiler

The Arc compiler implementation.

## Architecture (Planned)

```
arc-lang compiler pipeline:
Source → Lexer → Parser → AST → Semantic Analysis → IR → Optimization → Codegen
```

### Components

1. **Lexer** (`lexer/`) - Tokenizes source code
2. **Parser** (`parser/`) - Builds Abstract Syntax Tree (AST)
3. **Semantic Analyzer** (`analyzer/`) - Type checking, scope resolution
4. **IR Generator** (`ir/`) - Intermediate representation
5. **Optimizer** (`optimizer/`) - Optimization passes
6. **Code Generator** (`codegen/`) - Target output (bytecode, LLVM, WASM)
7. **Runtime** (`runtime/`) - Runtime environment, GC

## Status

**Phase 0:** Architecture planning  
**Phase 1-2:** Implementation (see [ROADMAP.md](../ROADMAP.md))

Subagent 2 (Opus 4.6) is leading compiler architecture.

## Documentation

All compiler components will be extensively documented with:
- Architecture decisions and rationale
- Implementation notes
- Performance characteristics
- Testing strategies

## Contributing

Compiler contributions welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md).
