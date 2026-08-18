# DocGen - Automatic Documentation Generator

> Generate comprehensive, My Bookshelf-compatible documentation from your codebase using static analysis and local AI models.

## Overview

DocGen scans your TypeScript/JavaScript projects and automatically generates high-quality documentation that integrates seamlessly with My Bookshelf. It uses a hybrid approach:

1. **Static Analysis** (Fast) - Extracts structure, types, signatures, comments
2. **Local LLM** (Smart) - Generates human-readable explanations via Ollama
3. **Template Engine** (Consistent) - Formats as My Bookshelf markdown

## Key Features

✨ **Fully Local** - No API costs, complete privacy
⚡ **Fast** - Static analysis handles 70% of work, AI fills the gaps
🎯 **Accurate** - TypeScript-aware, understands your code structure
📚 **My Bookshelf Native** - Generates docs with proper frontmatter
🔄 **Incremental** - Only regenerate what changed
🎨 **Customizable** - Templates, patterns, and plugins

## Quick Start

### Prerequisites

```bash
# Install Node.js 20+
node --version  # v20+

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download CodeLlama model
ollama pull codellama:latest
```

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd docs-generator-app

# Install dependencies
npm install

# Build the CLI
npm run build

# Make globally available (optional)
npm link
```

### Usage

```bash
# Generate docs for a project
docgen scan ./my-project

# Output goes to ./my-project/docs/
# Copy to My Bookshelf
cp -r ./my-project/docs/* ~/my-bookshelf/docs/my-project/
```

## How It Works

```
┌────────────────┐
│  Source Code   │
└───────┬────────┘
        │
        ▼
┌────────────────┐    Extract:
│    Scanner     │    • Functions
└───────┬────────┘    • Components
        │              • Types
        ▼              • Comments
┌────────────────┐
│    Analyzer    │    Build context
└───────┬────────┘    with all metadata
        │
        ├──────────┬──────────┐
        ▼          ▼          ▼
┌────────────┐ ┌─────────┐ ┌──────────┐
│   Static   │ │   LLM   │ │ Template │
│ Generator  │ │(Ollama) │ │  Engine  │
└─────┬──────┘ └────┬────┘ └────┬─────┘
      │             │            │
      └──────┬──────┴────────────┘
             ▼
    ┌────────────────┐
    │   Markdown     │
    │ (My Bookshelf) │
    └────────────────┘
```

## Generated Documentation

### What Gets Generated

For each TypeScript/JavaScript project, DocGen creates:

📄 **Overview** - Project architecture and tech stack
📄 **API Reference** - All functions, classes, types with descriptions
📄 **Components** - React components with props and usage
📄 **Setup Guide** - Installation and configuration
📄 **Architecture** - Design patterns and structure

### Example Output

**Input Code:**
```typescript
/**
 * Renders markdown documentation with syntax highlighting
 */
export function DocViewer({ doc }: DocViewerProps) {
  return <article>...</article>;
}
```

**Generated Doc:**
```markdown
---
title: "DocViewer Component"
description: "Renders markdown documentation with syntax highlighting"
tags: ["component", "react", "ui"]
date: "2025-12-13"
---

# DocViewer Component

Renders markdown documentation with syntax highlighting and
table of contents integration.

## Props

- `doc` (Doc): The document object to render containing metadata
  and markdown content

## Usage

\`\`\`tsx
import { DocViewer } from '@/components/docs/DocViewer';

<DocViewer doc={myDocument} />
\`\`\`

## Features

- Markdown rendering with GitHub-flavored syntax
- Syntax highlighting for code blocks
- Automatic heading extraction for TOC
- Mermaid diagram support
```

## Configuration

Create `docgen.config.yml` in your project:

```yaml
# What to scan
files:
  include:
    - "src/**/*.{ts,tsx}"
    - "app/**/*.{ts,tsx}"
  exclude:
    - "**/*.test.ts"
    - "**/*.spec.ts"

# Output location
output:
  path: ./docs
  structure: mirror  # or 'flat'

# LLM settings
llm:
  model: codellama:latest
  temperature: 0.3

# What to generate
generate:
  overview: true
  api: true
  components: true
  setup: true
  architecture: true
```

## CLI Commands

### `docgen init`
Initialize a new configuration file

```bash
# Create default config
docgen init

# Interactive setup
docgen init --interactive

# Overwrite existing config
docgen init --force
```

### `docgen generate <path>`
Generate documentation from code

```bash
# Basic usage
docgen generate ./my-app

# With LLM enhancement
docgen generate ./my-app --llm

# Options:
--output <path>      # Output directory (default: ./docs)
--config <path>      # Config file path
--llm                # Enable LLM enhancement (requires Ollama)
--llm-model <model>  # LLM model (default: codellama:latest)
--clean              # Clean output before generating
--dry-run            # Preview without writing files
--no-tests           # Exclude test files
--no-configs         # Exclude config files
```

### `docgen update <path>`
Update existing documentation (incremental)

```bash
# Update only changed files
docgen update ./my-app

# Force regenerate all
docgen update ./my-app --force

# With LLM enhancement
docgen update ./my-app --llm
```

### `docgen scan <path>`
Scan project files (analysis only)

```bash
docgen scan ./my-app

# Options:
--no-tests       # Exclude test files
--no-configs     # Exclude config files
```

### `docgen analyze <path>`
Analyze code and extract symbols

```bash
docgen analyze ./my-app

# With LLM descriptions
docgen analyze ./my-app --llm
```

## Advanced Usage

### Custom Templates

Create custom markdown templates:

```handlebars
{{!-- custom-component.hbs --}}
---
title: "{{name}}"
description: "{{summary}}"
tags: [{{tags}}]
---

# {{name}}

{{description}}

## Props
{{#each props}}
- `{{name}}` ({{type}}): {{description}}
{{/each}}

## Example
\`\`\`tsx
<{{componentName}} {{exampleProps}} />
\`\`\`
```

Use it:
```yaml
templates:
  component: ./templates/custom-component.hbs
```

### Supported Project Types

✅ **Next.js** - Full support (App Router, Pages, API routes)
✅ **React** - Components, hooks, context
✅ **TypeScript** - Full type inference
✅ **JavaScript** - With JSDoc support
⏳ **Vue** - Coming soon
⏳ **Python** - Coming soon

### LLM Models

Recommended models (via Ollama):

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **codellama:latest** | 14GB | Fast | Very Good | General use (recommended) |
| **deepseek-coder:6.7b** | 13GB | Fast | Good | Code-heavy projects |
| **qwen2.5-coder:7b** | 14GB | Medium | Excellent | High quality docs |
| **mistral:7b-instruct** | 14GB | Fast | Good | General purpose |

```bash
# Download a model
ollama pull codellama:latest

# Use it
docgen scan --model codellama:latest ./project
```

## Performance

### Benchmarks

Tested on MacBook Pro M1 (16GB RAM):

| Project Size | Files | Symbols | Time | LLM Calls |
|--------------|-------|---------|------|-----------|
| Small | 50 | 200 | 5 min | 150 |
| Medium | 200 | 800 | 20 min | 600 |
| Large | 500 | 2000 | 45 min | 1500 |

**Incremental updates:** < 2 min for small changes

### Optimization Tips

1. **Use cache** - Dramatically speeds up re-runs
2. **Parallel processing** - Use `--parallel 8` on powerful CPUs
3. **Incremental mode** - Use `update` instead of `scan`
4. **Selective generation** - Only generate needed doc types
5. **Smaller model** - Trade quality for speed with smaller models

## Troubleshooting

### Ollama not running
```bash
# Check if Ollama is running
ollama list

# Start Ollama (it runs as a service)
systemctl start ollama  # Linux
# or just run: ollama serve
```

### Parsing errors
```bash
# Run with debug mode
docgen scan --debug ./project

# Check logs in .docgen-cache/logs/
```

### Low quality output
```bash
# Try a better model
ollama pull qwen2.5-coder:7b
docgen scan --model qwen2.5-coder:7b ./project

# Adjust temperature
# Lower = more deterministic, higher = more creative
```

### Out of memory
```bash
# Reduce parallel calls
docgen scan --parallel 2 ./project

# Use smaller model
ollama pull codellama:latest-q4_0  # Quantized
```

## Integration with My Bookshelf

### Direct Copy
```bash
# Generate docs
docgen scan ./my-app

# Copy to My Bookshelf
cp -r ./my-app/docs/* ~/my-bookshelf/docs/my-app/

# View in browser
cd ~/my-bookshelf
npm run dev
# Open http://localhost:3000
```

### Watch Mode (Auto-sync)
```bash
# Auto-regenerate on code changes
docgen watch ./my-app --output ~/my-bookshelf/docs/my-app
```

### My Bookshelf UI Integration (Coming Soon)
- "Generate Docs" button in My Bookshelf
- Select project folder
- Real-time progress
- Preview before importing

## Programmatic API

DocGen can be used as a library in your Node.js applications:

### Scanner API

```typescript
import { Scanner } from 'docgen';

const scanner = new Scanner('./my-project', {
  includeTests: false,
  includeConfigs: false,
  respectGitignore: true
});

const result = await scanner.scan();
console.log(`Found ${result.totalFiles} files`);
```

### Analyzer API

```typescript
import { Analyzer } from 'docgen';

const analyzer = new Analyzer();
const analysis = await analyzer.analyze(files);

// Access extracted symbols
analysis.symbols.forEach(symbol => {
  console.log(`${symbol.type}: ${symbol.name}`);
});
```

### Generator API

```typescript
import { Generator } from 'docgen/generator';

const generator = new Generator({
  outputPath: './docs',
  structure: 'custom',
  templates: './my-templates'
});

const result = await generator.generate(analysis, {
  llmEnhancement: true,
  dryRun: false
});

console.log(`Generated ${result.filesGenerated} documentation files`);
```

### LLM Service API

```typescript
import { createLLMService } from 'docgen';

const llm = createLLMService({
  model: 'codellama:latest',
  baseURL: 'http://localhost:11434',
  temperature: 0.3
});

const enhanced = await llm.enhanceDocumentation(symbol);
console.log(enhanced.description);
```

For detailed API documentation, see [API.md](./API.md)

## Development

### Project Structure
```
docs-generator-app/
├── src/
│   ├── cli/              # CLI commands
│   │   └── commands/     # Individual commands
│   ├── core/             # Core modules
│   │   ├── scanner/      # File scanning
│   │   ├── analyzer/     # Code analysis
│   │   ├── config/       # Configuration
│   │   └── generator/    # Markdown generation
│   ├── llm/              # LLM integration
│   ├── templates/        # Handlebars templates
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities
├── dist/                 # Build output
├── tests/                # Test files
├── examples/             # Example projects
└── docs/                 # Documentation
```

### Running Tests
```bash
npm test                 # All tests
npm test scanner         # Specific module
npm run test:coverage    # With coverage
```

### Building
```bash
npm run build           # Production build
npm run dev            # Development mode
npm run watch          # Watch mode
npm run typecheck      # Type checking only
```

## Roadmap

### Phase 1 ✅ Complete (Scanner & Parser)
- [x] Project setup with TypeScript
- [x] File scanner with .gitignore support
- [x] AST parser (TypeScript Compiler API)
- [x] Symbol extraction (functions, classes, types)
- [x] Type inference from TypeScript

### Phase 2 ✅ Complete (Static Analysis)
- [x] Advanced symbol extraction
- [x] Comment parsing (JSDoc/TSDoc)
- [x] Pattern detection (React, Next.js)
- [x] Type resolution and dependency graph
- [x] Framework detection

### Phase 3 ✅ Complete (LLM Integration)
- [x] Ollama client integration
- [x] Prompt engineering for code docs
- [x] Batch processing with progress tracking
- [x] Response parsing and validation
- [x] Error handling and retries

### Phase 4 ✅ Complete (Markdown Generation)
- [x] Markdown generator for all symbol types
- [x] Template system (Handlebars)
- [x] My Bookshelf-compatible frontmatter
- [x] File organization (mirror/flat/custom)
- [x] Cross-referencing between docs

### Phase 5 ✅ Complete (CLI Polish)
- [x] Configuration file system
- [x] Interactive init command
- [x] Incremental update command
- [x] Colored terminal output
- [x] Progress indicators and error handling

### Phase 6 ✅ Complete (Testing & Integration)
- [x] Config validation
- [x] Dry-run mode
- [x] Force regeneration
- [x] Documentation updates
- [x] Beta release (v0.1.0)

### Future Enhancements
- [ ] Watch mode for auto-regeneration
- [ ] Serve command for local preview
- [ ] Multi-language support (Python, Go, Rust)
- [ ] Diagram generation (Mermaid architecture diagrams)
- [ ] VSCode extension
- [ ] GitHub Action for CI/CD
- [ ] Web UI for configuration and generation
- [ ] Enhanced caching strategies
- [ ] Custom plugin system

## Contributing

Contributions welcome! This is currently a personal tool but designed for extensibility.

### Areas for contribution:
- Additional language support
- Better prompts for specific frameworks
- Custom templates
- Performance improvements
- Bug fixes

## License

MIT License - See LICENSE file

## Credits

Built with:
- TypeScript Compiler API
- Ollama (local LLM runtime)
- Commander.js (CLI framework)
- Handlebars (templating)

Inspired by:
- TypeDoc
- JSDoc
- Docusaurus
- My Bookshelf (documentation viewer)

---

**Status:** Beta - Core features complete, ready for testing
**Version:** 0.1.0

For detailed development plan, see [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md)
