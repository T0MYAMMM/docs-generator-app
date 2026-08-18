# Testing Guide

Complete testing guide for DocGen contributors and users.

## Table of Contents

- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Manual Testing](#manual-testing)
- [Integration Testing](#integration-testing)
- [Performance Testing](#performance-testing)

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch

# With coverage report
npm run test:coverage
```

### Specific Tests

```bash
# Run tests for a specific module
npm test scanner
npm test analyzer
npm test generator

# Run a specific test file
npm test -- src/core/scanner/file-walker.test.ts

# Run tests matching a pattern
npm test -- --grep "should scan files"
```

### Type Checking

```bash
# TypeScript type checking
npm run typecheck

# Watch mode
npm run typecheck -- --watch
```

### Linting

```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Test Structure

### Directory Organization

```
tests/
├── unit/              # Unit tests
│   ├── scanner/
│   ├── analyzer/
│   └── generator/
├── integration/       # Integration tests
│   └── e2e/
├── fixtures/          # Test data and sample projects
│   ├── simple-ts/
│   ├── react-app/
│   └── nextjs-app/
└── helpers/           # Test utilities
    ├── mock-fs.ts
    ├── mock-llm.ts
    └── assertions.ts
```

### Test Files

Each module should have corresponding test files:

```
src/core/scanner/file-walker.ts
tests/unit/scanner/file-walker.test.ts
```

## Writing Tests

### Unit Tests

Test individual functions and classes in isolation.

#### Example: Scanner Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileWalker } from '@/core/scanner/file-walker';
import { mockFs } from '@/tests/helpers/mock-fs';

describe('FileWalker', () => {
  let walker: FileWalker;

  beforeEach(() => {
    // Setup test environment
    mockFs.create({
      'src/index.ts': 'export const foo = 1;',
      'src/utils.ts': 'export function bar() {}',
      'node_modules/lib.js': 'module.exports = {};'
    });

    walker = new FileWalker('./');
  });

  afterEach(() => {
    // Cleanup
    mockFs.restore();
  });

  it('should discover all TypeScript files', async () => {
    const files = await walker.walk();

    expect(files).toHaveLength(2);
    expect(files.every(f => f.endsWith('.ts'))).toBe(true);
  });

  it('should exclude node_modules by default', async () => {
    const files = await walker.walk();

    const nodeModulesFiles = files.filter(f =>
      f.includes('node_modules')
    );
    expect(nodeModulesFiles).toHaveLength(0);
  });

  it('should respect .gitignore', async () => {
    mockFs.create({
      '.gitignore': 'dist/\n*.log',
      'dist/output.js': 'console.log("test");',
      'app.log': 'logs'
    });

    const files = await walker.walk();

    expect(files.some(f => f.includes('dist'))).toBe(false);
    expect(files.some(f => f.endsWith('.log'))).toBe(false);
  });
});
```

#### Example: Analyzer Test

```typescript
import { describe, it, expect } from 'vitest';
import { SymbolExtractor } from '@/core/analyzer/symbol-extractor';

describe('SymbolExtractor', () => {
  it('should extract function signature', () => {
    const code = `
      /**
       * Adds two numbers
       */
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const extractor = new SymbolExtractor();
    const symbols = extractor.extract(code);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toMatchObject({
      name: 'add',
      type: 'function',
      exported: true,
      parameters: [
        { name: 'a', type: 'number', optional: false },
        { name: 'b', type: 'number', optional: false }
      ],
      returnType: { type: 'number' },
      comment: expect.stringContaining('Adds two numbers')
    });
  });

  it('should extract React component props', () => {
    const code = `
      interface ButtonProps {
        label: string;
        onClick: () => void;
        disabled?: boolean;
      }

      export function Button({ label, onClick, disabled }: ButtonProps) {
        return <button onClick={onClick} disabled={disabled}>{label}</button>;
      }
    `;

    const extractor = new SymbolExtractor();
    const symbols = extractor.extract(code);

    const component = symbols.find(s => s.name === 'Button');
    expect(component).toBeDefined();
    expect(component?.type).toBe('component');
    expect(component?.props).toMatchObject({
      label: { type: 'string', optional: false },
      onClick: { type: '() => void', optional: false },
      disabled: { type: 'boolean', optional: true }
    });
  });
});
```

#### Example: Generator Test

```typescript
import { describe, it, expect } from 'vitest';
import { MarkdownBuilder } from '@/core/generator/markdown-builder';

describe('MarkdownBuilder', () => {
  it('should generate function documentation', () => {
    const symbol = {
      name: 'formatDate',
      type: 'function' as const,
      comment: 'Formats a date object',
      parameters: [
        { name: 'date', type: 'Date', optional: false },
        { name: 'format', type: 'string', optional: true }
      ],
      returnType: { type: 'string' }
    };

    const builder = new MarkdownBuilder();
    const markdown = builder.buildFunctionDoc(symbol);

    expect(markdown).toContain('# formatDate');
    expect(markdown).toContain('Formats a date object');
    expect(markdown).toContain('## Parameters');
    expect(markdown).toContain('- `date` (Date)');
    expect(markdown).toContain('- `format` (string, optional)');
    expect(markdown).toContain('## Returns');
    expect(markdown).toContain('string');
  });
});
```

### Integration Tests

Test how multiple modules work together.

```typescript
import { describe, it, expect } from 'vitest';
import { scanProject, Analyzer, Generator } from '@/index';

describe('End-to-End Documentation Generation', () => {
  it('should generate docs for a sample project', async () => {
    // 1. Scan
    const scanResult = await scanProject('./tests/fixtures/simple-ts');
    expect(scanResult.files.length).toBeGreaterThan(0);

    // 2. Analyze
    const analyzer = new Analyzer();
    const analysis = await analyzer.analyze(scanResult.files);
    expect(analysis.symbols.length).toBeGreaterThan(0);

    // 3. Generate
    const generator = new Generator({
      outputPath: './tests/output',
      structure: 'custom'
    });

    const result = await generator.generate(analysis, {
      dryRun: true // Don't write files in test
    });

    expect(result.filesGenerated).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Testing with LLM

Mock LLM responses for consistent testing:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { LLMService } from '@/llm/llm-service';
import { mockOllama } from '@/tests/helpers/mock-llm';

describe('LLM Service', () => {
  it('should enhance documentation with LLM', async () => {
    // Mock Ollama responses
    const ollama = mockOllama({
      responses: {
        'generate': 'This function adds two numbers together and returns the sum.'
      }
    });

    const llm = new LLMService({
      model: 'codellama:latest',
      client: ollama
    });

    const symbol = {
      name: 'add',
      type: 'function' as const,
      source: 'function add(a: number, b: number) { return a + b; }'
    };

    const enhanced = await llm.enhanceDocumentation(symbol);

    expect(enhanced.description).toContain('adds two numbers');
    expect(ollama.generate).toHaveBeenCalledTimes(1);
  });
});
```

## Manual Testing

### Testing the CLI

#### Build and Test

```bash
# Build
npm run build

# Test help
node dist/cli/index.js --help

# Test init
node dist/cli/index.js init --force

# Test generate (dry run)
node dist/cli/index.js generate ./test-project --dry-run

# Test actual generation
node dist/cli/index.js generate ./test-project
```

#### Test with Sample Project

```bash
# Create test project
mkdir test-project
cd test-project
npm init -y

# Create sample files
cat > src/utils.ts << 'EOF'
/**
 * Adds two numbers
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Button component
 */
export function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}
EOF

# Generate docs
docgen init
docgen generate .

# Check output
ls -la docs/
cat docs/functions/add.md
```

### Testing Different Scenarios

#### 1. Test with TypeScript Project

```bash
cd ~/projects/typescript-project
docgen generate . --output ./test-docs
```

#### 2. Test with React Project

```bash
cd ~/projects/react-app
docgen generate . --output ./test-docs
```

#### 3. Test with Next.js Project

```bash
cd ~/projects/nextjs-app
docgen generate . --output ./test-docs
```

#### 4. Test with LLM

```bash
# Ensure Ollama is running
ollama list

# Generate with LLM
docgen generate . --llm --output ./test-docs
```

#### 5. Test Incremental Updates

```bash
# Generate initial docs
docgen generate .

# Modify a file
echo "export const foo = 1;" >> src/utils.ts

# Update docs (should be faster)
time docgen update .
```

### Verification Checklist

After generating docs, verify:

- [ ] All expected files are created
- [ ] Frontmatter is valid YAML
- [ ] Markdown is well-formatted
- [ ] Code blocks have proper syntax highlighting
- [ ] Links between docs work
- [ ] No broken references
- [ ] File organization matches config
- [ ] LLM descriptions are relevant (if used)

## Test Fixtures

### Creating Test Fixtures

Test fixtures are sample projects used for testing:

```
tests/fixtures/
├── simple-ts/           # Basic TypeScript project
│   ├── src/
│   │   ├── index.ts
│   │   └── utils.ts
│   └── package.json
├── react-app/           # React project
│   ├── src/
│   │   ├── components/
│   │   │   └── Button.tsx
│   │   └── App.tsx
│   └── package.json
└── nextjs-app/          # Next.js project
    ├── app/
    │   ├── page.tsx
    │   └── api/
    │       └── hello.ts
    └── package.json
```

### Example Fixture

```typescript
// tests/fixtures/simple-ts/src/utils.ts
/**
 * String utilities
 */

/**
 * Capitalizes first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a date
 */
export function formatDate(date: Date, format: string = 'ISO'): string {
  if (format === 'ISO') {
    return date.toISOString();
  }
  return date.toString();
}
```

## Performance Testing

### Benchmarking

```typescript
import { describe, it } from 'vitest';
import { performance } from 'perf_hooks';

describe('Performance', () => {
  it('should scan 1000 files in under 5 seconds', async () => {
    const start = performance.now();

    const result = await scanProject('./large-project');

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000);
    expect(result.files.length).toBeGreaterThan(1000);
  });

  it('should generate docs for 500 symbols in under 30 minutes', async () => {
    // This assumes ~2-4s per symbol with LLM
    // Adjust based on your hardware

    const start = performance.now();

    const result = await generateDocumentation('./large-project', {
      llmEnhancement: true
    });

    const duration = performance.now() - start;
    const minutes = duration / 1000 / 60;

    expect(minutes).toBeLessThan(30);
    expect(result.filesGenerated).toBeGreaterThan(500);
  });
});
```

### Memory Profiling

```bash
# Run with memory profiling
node --max-old-space-size=4096 --expose-gc dist/cli/index.js generate ./large-project

# Monitor memory usage
node --trace-gc dist/cli/index.js generate ./large-project
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### VS Code Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debug Specific Test

```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/vitest run specific.test.ts

# Then attach debugger (Chrome DevTools or VS Code)
```

## Test Coverage Goals

Target coverage:
- Overall: > 80%
- Core modules: > 90%
- CLI commands: > 70%
- Utilities: > 95%

Check coverage:

```bash
npm run test:coverage

# View HTML report
open coverage/index.html
```

## Best Practices

### Do's
- ✅ Write tests before fixing bugs
- ✅ Test edge cases and error conditions
- ✅ Use descriptive test names
- ✅ Keep tests focused and simple
- ✅ Mock external dependencies
- ✅ Clean up after tests

### Don'ts
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Depend on test execution order
- ❌ Leave commented-out tests
- ❌ Skip tests without good reason
- ❌ Make tests too complex

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)

For questions about testing, open an issue or discussion on GitHub.
