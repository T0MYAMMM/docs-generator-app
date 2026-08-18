# Contributing to DocGen

Thank you for your interest in contributing to DocGen! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- Ollama (for testing LLM features)

### Setup Development Environment

1. **Fork and Clone**

```bash
git clone https://github.com/yourusername/docgen.git
cd docgen
```

2. **Install Dependencies**

```bash
npm install
```

3. **Build the Project**

```bash
npm run build
```

4. **Run Tests**

```bash
npm test
```

5. **Link for Local Testing**

```bash
npm link
# Now you can use `docgen` command globally for testing
```

## Development Workflow

### Project Structure

```
src/
├── cli/              # CLI commands and interface
├── core/
│   ├── scanner/      # File scanning logic
│   ├── analyzer/     # Code analysis
│   ├── config/       # Configuration management
│   └── generator/    # Documentation generation
├── llm/              # LLM integration (Ollama)
├── templates/        # Handlebars templates
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Branch Strategy

- `main` - Stable release branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Urgent fixes for production

### Making Changes

1. **Create a Feature Branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update types as needed

3. **Test Your Changes**

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Lint code
npm run lint

# Test manually
npm run build
docgen generate ./test-project
```

4. **Commit Your Changes**

```bash
git add .
git commit -m "feat: add new feature"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or tooling changes

5. **Push and Create PR**

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define types for all function parameters and return values
- Avoid `any` type - use `unknown` if needed
- Use interfaces for objects, types for unions/primitives
- Export types alongside implementations

Example:

```typescript
// Good
export interface ScanOptions {
  includeTests: boolean;
  respectGitignore: boolean;
}

export async function scan(
  path: string,
  options: ScanOptions
): Promise<ScanResult> {
  // implementation
}

// Bad
export async function scan(path: any, options: any): Promise<any> {
  // implementation
}
```

### Naming Conventions

- **Files**: kebab-case (`file-walker.ts`)
- **Classes**: PascalCase (`FileWalker`)
- **Functions**: camelCase (`scanProject`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase (`FileNode`)
- **Types**: PascalCase (`FileType`)

### Code Organization

- One main export per file
- Group related functionality
- Keep files under 300 lines
- Extract complex logic into helper functions

### Comments

- Use JSDoc for public APIs
- Explain "why", not "what"
- Keep comments up-to-date
- Remove commented-out code

Example:

```typescript
/**
 * Scans a project directory and discovers source files.
 *
 * @param projectPath - Absolute path to project root
 * @param options - Scanner configuration options
 * @returns Scan result with discovered files
 * @throws {Error} If project path doesn't exist
 */
export async function scanProject(
  projectPath: string,
  options: ScannerOptions
): Promise<ScanResult> {
  // Implementation
}
```

## Testing Guidelines

### Writing Tests

- Write tests for all new features
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies (file system, LLM)

Example:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Scanner } from '../scanner';

describe('Scanner', () => {
  let scanner: Scanner;

  beforeEach(() => {
    scanner = new Scanner('./test-project');
  });

  it('should discover all TypeScript files', async () => {
    const result = await scanner.scan();
    expect(result.files).toHaveLength(5);
    expect(result.files.every(f => f.language === 'typescript')).toBe(true);
  });

  it('should respect .gitignore', async () => {
    const result = await scanner.scan();
    const nodeModules = result.files.filter(f =>
      f.path.includes('node_modules')
    );
    expect(nodeModules).toHaveLength(0);
  });

  it('should throw error for non-existent path', async () => {
    scanner = new Scanner('./non-existent');
    await expect(scanner.scan()).rejects.toThrow('Path not found');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage

# Specific test file
npm test scanner
```

## Documentation

### Update Documentation

When making changes, update relevant documentation:

- `README.md` - For user-facing changes
- `API.md` - For API changes
- `ARCHITECTURE.md` - For architectural changes
- Code comments - For implementation details

### Documentation Style

- Use clear, concise language
- Provide code examples
- Keep examples realistic and practical
- Update examples when APIs change

## Pull Request Process

### Before Submitting

- [ ] All tests pass
- [ ] Code is linted and formatted
- [ ] Types are correct (no TypeScript errors)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] PR description explains the changes

### PR Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Follows code style guidelines
```

### Review Process

1. Submit PR
2. Automated checks run (tests, linting)
3. Maintainer reviews code
4. Address feedback if needed
5. PR is merged

## Areas for Contribution

### High Priority

- **Watch mode** - Auto-regenerate docs on file changes
- **Serve command** - Local preview server
- **Enhanced caching** - Improve performance
- **Better error messages** - More helpful error output
- **Progress indicators** - Better UX during generation

### Medium Priority

- **Additional LLM models** - Support more models
- **Custom plugins** - Plugin system for extensibility
- **Diagram generation** - Mermaid diagrams
- **VSCode extension** - IDE integration
- **GitHub Action** - CI/CD integration

### Language Support

- **Python** - Docstring parsing
- **Go** - Godoc parsing
- **Rust** - Rustdoc parsing
- **Java** - JavaDoc parsing

### Testing

- More test coverage
- Integration tests
- E2E tests with real projects
- Performance benchmarks

## Community

### Getting Help

- Open an issue for bugs
- Discussions for questions
- Discord/Slack for real-time chat (if available)

### Reporting Bugs

Use the bug report template:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 13.0]
- Node.js: [e.g., 20.10.0]
- DocGen: [e.g., 0.1.0]
- Ollama: [e.g., 0.5.0]

## Additional Context
Any other relevant information
```

### Feature Requests

Use the feature request template:

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any other relevant information
```

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open an issue
- Email: [maintainer email]
- Discord: [server invite]

---

Thank you for contributing to DocGen! 🎉
