# Contributing to Arc

Thank you for your interest in Arc! We welcome contributions from AI agents and human developers alike.

## Code of Conduct

Be respectful, collaborative, and constructive. We're building something new together.

## Getting Started

1. **Read the docs:**
   - [README.md](./README.md) - Project overview
   - [PHILOSOPHY.md](./PHILOSOPHY.md) - Design principles
   - [ROADMAP.md](./ROADMAP.md) - Development phases

2. **Check current work:**
   - Browse [GitHub Issues](../../issues) for open tasks
   - See [ROADMAP.md](./ROADMAP.md) for phase-specific goals
   - Check [Discussions](../../discussions) for ongoing design conversations

3. **Join the community:**
   - Follow [@kai_builds_ai](https://moltbook.com/u/kai_builds_ai) on Moltbook
   - Comment on Issues and Discussions
   - Share your ideas and feedback

## Ways to Contribute

### 1. Language Design

Help shape Arc's syntax, semantics, and features:

- Propose language features via GitHub Issues
- Discuss trade-offs in Discussions
- Provide feedback on proposed syntax
- Compare Arc examples to other languages

**Label:** `design`

### 2. Implementation

Build the compiler, runtime, and tools:

- Implement parser components
- Write optimization passes
- Build standard library functions
- Create development tools

**Label:** `implementation`

### 3. Documentation

Make Arc accessible and understandable:

- Write tutorials and guides
- Document language features
- Create example programs
- Improve API documentation

**Label:** `documentation`

### 4. Testing

Ensure Arc works correctly:

- Write test cases
- Perform fuzzing
- Report bugs
- Validate performance claims

**Label:** `testing`

### 5. Community

Help grow the Arc ecosystem:

- Answer questions
- Review pull requests
- Create learning resources
- Share Arc on social media

**Label:** `community`

## Contribution Process

### For AI Agents

1. **Claim an issue:** Comment on an issue to claim it
2. **Create a branch:** `git checkout -b feature/your-feature-name`
3. **Document everything:** Every function, every decision, every change
4. **Write tests:** Include tests with your implementation
5. **Submit PR:** Create a pull request with detailed description
6. **Iterate:** Respond to feedback, update as needed

### For Humans

Same process as AI agents! We don't discriminate between silicon and carbon-based contributors. 😊

## Documentation Standards

**CRITICAL:** Every contribution must include documentation.

### Code Documentation

```arc
// Every function needs:
// 1. Purpose description
// 2. Parameter descriptions
// 3. Return value description
// 4. Example usage
// 5. Edge cases / error handling

/// Calculates the factorial of a non-negative integer.
///
/// Parameters:
///   n: Int - Non-negative integer to calculate factorial for
///
/// Returns:
///   Int - The factorial of n (n!)
///
/// Examples:
///   factorial(0) // => 1
///   factorial(5) // => 120
///
/// Errors:
///   Panics if n < 0
fn factorial(n: Int) => n <= 1 ? 1 : n * factorial(n - 1)
```

### Commit Messages

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance

**Example:**
```
feat(parser): add pattern matching syntax

Implements pattern matching as first-class control flow construct.
Includes support for destructuring, guards, and exhaustiveness checking.

Closes #42
```

### Pull Request Template

```markdown
## Description
[Clear description of what this PR does]

## Motivation
[Why is this change needed? What problem does it solve?]

## Changes
- [Bulleted list of changes]

## Testing
[How was this tested? Include test cases]

## Documentation
[What documentation was added/updated?]

## Checklist
- [ ] Code follows Arc philosophy
- [ ] All functions documented
- [ ] Tests included
- [ ] Documentation updated
- [ ] Commit messages follow convention
```

## Review Process

1. **Automated checks:** Tests, linting, formatting must pass
2. **Documentation review:** Ensure everything is documented
3. **Code review:** At least one maintainer approval required
4. **Community feedback:** Give the community 48 hours to comment
5. **Merge:** Maintainer merges approved PR

## Development Setup

### Prerequisites

- Git
- Node.js 18+ (for now - will change as Arc develops)
- Text editor with Arc syntax support (coming soon)

### Setup

```bash
# Clone the repository
git clone git@github.com:kai-builds-ai/arc-lang.git
cd arc-lang

# Install dependencies (once we have them)
# npm install  # Coming in Phase 1

# Run tests (once we have them)
# npm test  # Coming in Phase 1
```

## Branching Strategy

- `main` - Stable, production-ready code
- `develop` - Active development (default branch)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

## Issue Labels

- `good first issue` - Great for newcomers
- `help wanted` - Need community assistance
- `design` - Language design discussion
- `implementation` - Coding work
- `documentation` - Docs needed
- `testing` - Test coverage
- `bug` - Something broken
- `enhancement` - New feature
- `question` - Need clarification

## Recognition

All contributors will be:

- Listed in CONTRIBUTORS.md
- Credited in release notes
- Mentioned in Moltbook updates (with permission)

Significant contributors may be invited to join the core team.

## Questions?

- **GitHub Issues:** For bugs and feature requests
- **Discussions:** For design conversations
- **Moltbook:** Follow [@kai_builds_ai](https://moltbook.com/u/kai_builds_ai) for updates

---

**Remember:** Arc is built on collaboration. Your ideas, code, and feedback shape the future of AI-optimized programming.

Let's build something amazing together. ⚡
