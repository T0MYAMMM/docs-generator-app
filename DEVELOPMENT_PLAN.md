# Documentation Generator - Development Plan

## Project Overview

**Name:** DocGen (Documentation Generator)
**Purpose:** Automatically scan code projects and generate comprehensive, My Bookshelf-compatible documentation using static analysis and local AI models.
**Approach:** Hybrid (Static Analysis + Pre-trained LLM)
**Target Users:** Individual developers (you) for personal projects

## Core Vision

```
Source Code → Static Analyzer → Context Builder → Local LLM → Markdown Generator → My Bookshelf
```

**Key Principles:**
- 🏠 **100% Local** - No external API calls, complete privacy
- 💰 **Zero Cost** - No API fees, use free open-source models
- ⚡ **Fast** - Static analysis handles bulk work, AI only for insights
- 🎯 **Quality** - Generate docs that match My Bookshelf standards
- 🔄 **Incremental** - Update docs as code changes

## Technology Stack

### Core Technologies

**Language & Runtime:**
- **Node.js 20+** / TypeScript
- Why: Great ecosystem for code parsing, same stack as My Bookshelf

**Code Analysis:**
- **TypeScript Compiler API** - Parse TS/JS files, extract types
- **@babel/parser** - Fallback parser for complex JS
- **jsdoc-api** - Extract JSDoc comments
- **glob** - File system traversal
- **acorn** / **esprima** - AST parsing alternatives

**Local LLM Integration:**
- **Ollama** - Local model runtime (easiest setup)
  - Models: CodeLlama-7B-Instruct, DeepSeek-Coder, Qwen2.5-Coder
- **Ollama JS Client** - Node.js integration
- **Alternative:** llama.cpp with node bindings

**Markdown Generation:**
- **gray-matter** - Frontmatter generation
- **remark** / **mdast** - Markdown AST manipulation
- **prettier** - Format generated markdown

**Utilities:**
- **commander** - CLI framework
- **ora** - Terminal spinners
- **chalk** - Colored terminal output
- **enquirer** - Interactive prompts

### Why This Stack?

✅ **TypeScript Compiler API** - Already understands TypeScript perfectly
✅ **Ollama** - Simplest local LLM setup, works on CPU
✅ **Node.js** - Same ecosystem as My Bookshelf for easy integration
✅ **Zero External Dependencies** - All processing happens locally

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         DocGen CLI                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Scanner    │──▶│   Analyzer   │──▶│   Generator  │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ File System  │   │ AST Parser   │   │   Ollama     │    │
│  │   Walker     │   │ Type Extract │   │   Client     │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                 │            │
│                                                 ▼            │
│                                         ┌──────────────┐    │
│                                         │ CodeLlama-7B │    │
│                                         │   (Local)    │    │
│                                         └──────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  Markdown Files  │
                │  (My Bookshelf)  │
                └──────────────────┘
```

### Component Design

#### 1. **Scanner Module**
```typescript
// Responsibilities:
- Traverse project directory
- Identify file types (TS, JS, JSX, TSX)
- Find configuration files (package.json, tsconfig.json)
- Build file dependency graph
- Filter ignored files (.gitignore, node_modules)

// Output:
{
  files: FileNode[],
  dependencies: DependencyGraph,
  config: ProjectConfig
}
```

#### 2. **Analyzer Module**
```typescript
// Responsibilities:
- Parse files into AST
- Extract exports (functions, classes, components, types)
- Extract JSDoc/TSDoc comments
- Infer types from TypeScript
- Build symbol table
- Detect patterns (React components, API routes, etc.)

// Output:
{
  symbols: Symbol[],
  types: TypeDefinition[],
  comments: DocComment[],
  patterns: DetectedPattern[]
}
```

#### 3. **Context Builder**
```typescript
// Responsibilities:
- Group related symbols
- Build context for LLM prompts
- Identify what needs AI explanation vs static info
- Optimize for token efficiency

// Output:
{
  contexts: DocumentContext[],
  staticDocs: StaticDocumentation[],
  aiTasks: AITask[]
}
```

#### 4. **LLM Integration Module**
```typescript
// Responsibilities:
- Connect to Ollama API
- Build optimized prompts
- Handle rate limiting (local, but still limited by CPU)
- Parse LLM responses
- Retry logic for failures

// Output:
{
  explanations: Map<symbol, string>,
  examples: Map<symbol, CodeExample[]>,
  summaries: Map<file, string>
}
```

#### 5. **Generator Module**
```typescript
// Responsibilities:
- Combine static analysis + AI output
- Apply documentation templates
- Generate My Bookshelf frontmatter
- Format markdown
- Organize into folder structure
- Generate index/overview pages

// Output:
- Markdown files in docs/ folder
- Proper frontmatter (title, description, tags, date)
- Cross-references between docs
```

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Build core scanning and parsing infrastructure

**Tasks:**
1. ✅ Project setup
   - Initialize Node.js/TypeScript project
   - Set up build system (tsup/esbuild)
   - Configure linting/formatting
   - Create CLI scaffold

2. ✅ File Scanner
   - Implement directory traversal
   - File type detection
   - .gitignore support
   - Find package.json, tsconfig.json

3. ✅ Basic Parser
   - Integrate TypeScript compiler API
   - Parse single file into AST
   - Extract basic info (imports, exports)

4. ✅ Testing
   - Test on My Bookshelf codebase
   - Verify file detection works
   - Ensure parsing handles all TS/JS variants

**Deliverable:** CLI that scans a project and lists all code files with basic metadata

### Phase 2: Static Analysis (Week 2)

**Goal:** Extract maximum information without AI

**Tasks:**
1. ✅ Symbol Extraction
   - Extract functions with signatures
   - Extract classes with methods
   - Extract React components with props
   - Extract TypeScript interfaces/types

2. ✅ Comment Parsing
   - Parse JSDoc comments
   - Parse TSDoc comments
   - Extract inline comments
   - Link comments to symbols

3. ✅ Type Inference
   - Extract TypeScript types
   - Infer parameter types
   - Infer return types
   - Build type dependency graph

4. ✅ Pattern Detection
   - Detect Next.js API routes
   - Detect React components
   - Detect utility functions
   - Detect configuration files

5. ✅ Dependency Analysis
   - Build import/export graph
   - Identify external dependencies
   - Find internal dependencies

**Deliverable:** JSON output with complete project structure and extracted metadata

**Example Output:**
```json
{
  "project": {
    "name": "my-bookshelf",
    "type": "nextjs",
    "dependencies": {...}
  },
  "files": [
    {
      "path": "components/docs/DocViewer.tsx",
      "type": "react-component",
      "exports": [
        {
          "name": "DocViewer",
          "type": "function-component",
          "props": {
            "doc": "Doc"
          },
          "description": "Renders markdown documentation...",
          "lines": [15, 45]
        }
      ]
    }
  ]
}
```

### Phase 3: LLM Integration (Week 3)

**Goal:** Integrate Ollama for AI-powered explanations

**Tasks:**
1. ✅ Ollama Setup
   - Install Ollama
   - Download CodeLlama-7B-Instruct
   - Test basic API calls
   - Benchmark performance

2. ✅ Prompt Engineering
   - Design prompts for function explanations
   - Design prompts for component descriptions
   - Design prompts for architecture overview
   - Test and iterate on quality

3. ✅ Integration Layer
   - Build Ollama client wrapper
   - Implement prompt templates
   - Handle streaming responses
   - Error handling and retries

4. ✅ Batch Processing
   - Queue system for AI tasks
   - Parallel processing (multi-core)
   - Progress tracking
   - Caching to avoid re-generation

**Deliverable:** System that can take code snippets and generate human-readable explanations

**Example Prompt:**
```
You are a technical documentation writer. Generate a concise description for this TypeScript function.

Function signature:
export function getAllDocs(): Doc[]

Source code:
[code snippet]

Generate:
1. One-sentence summary
2. Parameter descriptions (if any)
3. Return value description
4. Usage example (if applicable)

Keep it concise and developer-friendly.
```

### Phase 4: Markdown Generation (Week 4)

**Goal:** Generate My Bookshelf-compatible documentation

**Tasks:**
1. ✅ Template System
   - Create doc templates (API, Component, Guide, etc.)
   - Frontmatter generator
   - Table of contents generator
   - Cross-reference linker

2. ✅ Document Types
   - **Overview**: Project architecture and tech stack
   - **API Reference**: Functions, classes, types
   - **Component Docs**: React components with props
   - **Setup Guide**: Installation and configuration
   - **Architecture**: Design patterns and structure

3. ✅ Frontmatter Generation
   - Auto-generate title from file/symbol name
   - Generate description from AI summary
   - Auto-tag based on file type/location
   - Set date to generation time

4. ✅ Markdown Formatting
   - Syntax highlighted code blocks
   - Proper heading hierarchy
   - Links between documents
   - Examples and usage

5. ✅ Organization
   - Mirror source code structure
   - Group related docs
   - Generate index pages

**Deliverable:** Complete markdown documentation for a test project

**Example Output Structure:**
```
docs/
├── overview.md                    # Project overview
├── getting-started.md             # Setup guide
├── architecture.md                # Architecture overview
├── api/
│   ├── overview.md
│   ├── docs-api.md
│   └── import-api.md
├── components/
│   ├── overview.md
│   ├── doc-viewer.md
│   ├── sidebar.md
│   └── table-of-contents.md
├── lib/
│   ├── docs.md
│   ├── markdown.md
│   └── search.md
└── guides/
    ├── adding-features.md
    ├── testing.md
    └── deployment.md
```

### Phase 5: CLI & UX (Week 5)

**Goal:** Polish CLI tool and user experience

**Tasks:**
1. ✅ CLI Commands
   ```bash
   docgen init              # Initialize config
   docgen scan <project>    # Scan and generate docs
   docgen update            # Update existing docs
   docgen serve             # Preview docs
   ```

2. ✅ Configuration File
   ```yaml
   # docgen.config.yml
   project: ./
   output: ./docs
   model: codellama:latest
   include:
     - "src/**/*.{ts,tsx,js,jsx}"
   exclude:
     - "**/*.test.ts"
     - "**/*.spec.ts"
   templates:
     api: custom-api-template.md
   ```

3. ✅ Interactive Mode
   - Select which docs to generate
   - Choose model (if multiple available)
   - Preview before saving
   - Incremental updates

4. ✅ Progress Feedback
   - Scanning progress
   - Analysis progress
   - AI generation progress (X/Y complete)
   - Success/error summary

5. ✅ Error Handling
   - Graceful failures
   - Helpful error messages
   - Partial generation (continue on error)
   - Debug mode

**Deliverable:** Production-ready CLI tool

### Phase 6: Integration & Testing (Week 6)

**Goal:** Test thoroughly and integrate with My Bookshelf

**Tasks:**
1. ✅ Testing
   - Test on My Bookshelf project
   - Test on other Next.js projects
   - Test on plain TypeScript/JavaScript
   - Test on React apps

2. ✅ Quality Validation
   - Verify all docs have proper frontmatter
   - Check markdown formatting
   - Validate cross-references
   - Test in My Bookshelf viewer

3. ✅ Performance Optimization
   - Benchmark generation time
   - Optimize LLM calls
   - Cache parsed ASTs
   - Parallel processing

4. ✅ Integration
   - Add "Generate Docs" to My Bookshelf UI
   - API endpoint for generation
   - Real-time progress updates
   - Error reporting in UI

**Deliverable:** Fully tested, integrated documentation generator

## Project Structure

```
docs-generator-app/
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── scan.ts
│   │   │   ├── update.ts
│   │   │   └── serve.ts
│   │   ├── index.ts
│   │   └── ui.ts              # Prompts, spinners, output
│   ├── core/
│   │   ├── scanner/
│   │   │   ├── file-walker.ts
│   │   │   ├── file-classifier.ts
│   │   │   └── config-loader.ts
│   │   ├── analyzer/
│   │   │   ├── ast-parser.ts
│   │   │   ├── symbol-extractor.ts
│   │   │   ├── type-resolver.ts
│   │   │   ├── comment-parser.ts
│   │   │   └── pattern-detector.ts
│   │   ├── llm/
│   │   │   ├── ollama-client.ts
│   │   │   ├── prompt-builder.ts
│   │   │   ├── response-parser.ts
│   │   │   └── batch-processor.ts
│   │   └── generator/
│   │       ├── markdown-generator.ts
│   │       ├── frontmatter-generator.ts
│   │       ├── template-engine.ts
│   │       └── file-organizer.ts
│   ├── templates/
│   │   ├── overview.hbs
│   │   ├── api-reference.hbs
│   │   ├── component.hbs
│   │   ├── setup-guide.hbs
│   │   └── architecture.hbs
│   ├── types/
│   │   ├── ast.ts
│   │   ├── config.ts
│   │   ├── context.ts
│   │   └── output.ts
│   └── utils/
│       ├── logger.ts
│       ├── cache.ts
│       └── helpers.ts
├── tests/
│   ├── fixtures/            # Test projects
│   ├── scanner.test.ts
│   ├── analyzer.test.ts
│   ├── generator.test.ts
│   └── integration.test.ts
├── examples/
│   ├── sample-project/
│   └── generated-docs/
├── docs/
│   ├── DEVELOPMENT_PLAN.md  # This file
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── USAGE.md
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## API Design

### Core API

```typescript
// Main API
import { DocGen } from 'docgen';

const generator = new DocGen({
  projectPath: './my-project',
  outputPath: './docs',
  model: 'codellama:latest',
  config: {...}
});

// Scan project
const analysis = await generator.scan();

// Generate docs
const result = await generator.generate();

// Update specific files
await generator.update(['src/utils/helpers.ts']);
```

### Scanner API

```typescript
import { Scanner } from 'docgen/scanner';

const scanner = new Scanner('./project');
const files = await scanner.scan({
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['**/*.test.ts']
});
```

### Analyzer API

```typescript
import { Analyzer } from 'docgen/analyzer';

const analyzer = new Analyzer();
const analysis = await analyzer.analyze(files);

// Access results
analysis.functions;    // All functions
analysis.components;   // React components
analysis.types;        // TypeScript types
analysis.dependencies; // Dependency graph
```

### LLM API

```typescript
import { LLMClient } from 'docgen/llm';

const llm = new LLMClient({
  model: 'codellama:latest',
  baseURL: 'http://localhost:11434'
});

const explanation = await llm.explain({
  type: 'function',
  signature: 'function getAllDocs(): Doc[]',
  source: '...',
  context: {...}
});
```

### Generator API

```typescript
import { Generator } from 'docgen/generator';

const generator = new Generator({
  templates: './templates',
  outputPath: './docs'
});

await generator.generate({
  analysis: analysis,
  llmOutputs: explanations,
  config: config
});
```

## Configuration Schema

### docgen.config.yml

```yaml
# Project configuration
project:
  path: ./
  name: My Bookshelf
  type: nextjs  # nextjs, react, typescript, javascript

# Output configuration
output:
  path: ./docs
  structure: mirror  # mirror, flat, custom
  clean: false  # Clean output before generation

# LLM configuration
llm:
  provider: ollama
  model: codellama:latest
  baseURL: http://localhost:11434
  temperature: 0.3
  maxTokens: 2048

# File selection
files:
  include:
    - "src/**/*.{ts,tsx,js,jsx}"
    - "app/**/*.{ts,tsx,js,jsx}"
    - "lib/**/*.ts"
  exclude:
    - "**/*.test.{ts,tsx}"
    - "**/*.spec.{ts,tsx}"
    - "**/node_modules/**"
    - "**/.next/**"

# Documentation types to generate
generate:
  overview: true
  api: true
  components: true
  setup: true
  architecture: true
  guides: false

# Template overrides
templates:
  api: ./custom-templates/api.hbs
  component: ./custom-templates/component.hbs

# Frontmatter defaults
frontmatter:
  author: "DocGen"
  defaultTags:
    - "auto-generated"
    - "documentation"

# Performance
performance:
  parallel: 4  # Number of parallel LLM calls
  cache: true
  cacheDir: ./.docgen-cache

# Behavior
behavior:
  skipExisting: false  # Skip files that already exist
  updateMode: smart    # smart, force, never
  dryRun: false
```

## Prompt Templates

### Function Documentation Prompt

```
You are a technical documentation writer. Generate clear, concise documentation for this function.

**Context:**
Project: {projectName}
File: {filePath}
Function: {functionName}

**Function Signature:**
{signature}

**Source Code:**
{sourceCode}

**Existing Comments:**
{existingComments}

**Generate the following in this exact format:**

## Summary
[One clear sentence describing what this function does]

## Parameters
{for each parameter}
- `{paramName}` ({type}): {description}

## Returns
{returnType}: {description}

## Example
\`\`\`typescript
{realistic usage example}
\`\`\`

## Notes
{any important caveats or considerations}

Keep it concise, accurate, and developer-friendly. Use technical language appropriately.
```

### Component Documentation Prompt

```
You are a technical documentation writer specializing in React. Generate documentation for this component.

**Component:**
{componentName}

**Props Interface:**
{propsInterface}

**Source Code:**
{sourceCode}

**Generate:**

## Description
[What this component does and when to use it]

## Props
{for each prop}
- `{propName}` ({type}, {required/optional}): {description}

## Usage
\`\`\`tsx
<{componentName}
  {realistic prop example}
/>
\`\`\`

## Behavior
{how it behaves, side effects, etc.}

## Styling
{any styling considerations}
```

### Architecture Overview Prompt

```
Analyze this project structure and generate an architecture overview.

**Project Type:** {projectType}
**Main Technologies:** {techStack}

**Directory Structure:**
{directoryTree}

**Key Files:**
{keyFiles}

**Dependencies:**
{majorDependencies}

**Generate an architecture overview covering:**

1. **Project Purpose**: What this project does
2. **Tech Stack**: Main technologies and why
3. **Architecture Pattern**: (e.g., MVC, component-based, etc.)
4. **Key Directories**: What each main directory contains
5. **Data Flow**: How data moves through the application
6. **External Dependencies**: Important libraries and their role

Be concise but comprehensive. Use markdown formatting.
```

## Testing Strategy

### Unit Tests

```typescript
// Test scanner
describe('Scanner', () => {
  it('should find all TypeScript files', async () => {
    const scanner = new Scanner('./test-project');
    const files = await scanner.scan();
    expect(files.filter(f => f.extension === '.ts')).toHaveLength(5);
  });
});

// Test analyzer
describe('Analyzer', () => {
  it('should extract function signature', async () => {
    const code = 'export function test(a: string): number { return 1; }';
    const result = analyzer.extractFunction(code);
    expect(result.name).toBe('test');
    expect(result.params).toEqual([{ name: 'a', type: 'string' }]);
    expect(result.returnType).toBe('number');
  });
});
```

### Integration Tests

```typescript
describe('End-to-End', () => {
  it('should generate docs for sample project', async () => {
    const generator = new DocGen({
      projectPath: './fixtures/sample-project',
      outputPath: './fixtures/output'
    });

    await generator.scan();
    const result = await generator.generate();

    expect(result.filesGenerated).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);

    // Verify frontmatter
    const doc = await readFile('./fixtures/output/api/overview.md');
    expect(doc).toContain('---\ntitle:');
    expect(doc).toContain('tags:');
  });
});
```

### Fixtures

Create test projects with known structure:
- Simple TypeScript project
- React component library
- Next.js app
- Plain JavaScript

## Performance Targets

### Speed
- **Scanning**: < 1s for 1000 files
- **Static Analysis**: < 5s for 1000 files
- **LLM Generation**: ~2-5s per function (depends on model/hardware)
- **Total**: ~10-30 min for medium project (500 symbols)

### Quality
- **Accuracy**: 95%+ correct type extraction
- **Completeness**: All exports documented
- **Frontmatter**: 100% valid My Bookshelf format
- **Markdown**: Valid, well-formatted

### Resource Usage
- **Memory**: < 2GB for large projects
- **Disk**: Minimal temp files
- **CPU**: Utilize multiple cores for LLM calls

## Integration with My Bookshelf

### Option 1: Standalone CLI

```bash
# User workflow
cd ~/projects/my-app
docgen scan .
# Generates docs/
cp -r docs/* ~/my-bookshelf/docs/my-app/
```

### Option 2: My Bookshelf UI Integration

Add to My Bookshelf:

```typescript
// New page: /generate
export default function GeneratePage() {
  return (
    <div>
      <h1>Generate Documentation</h1>
      <ProjectSelector />
      <ConfigForm />
      <GenerateButton onClick={handleGenerate} />
      <ProgressDisplay />
    </div>
  );
}

// API route: /api/generate
export async function POST(request) {
  const { projectPath, config } = await request.json();

  const generator = new DocGen(config);
  const result = await generator.generate();

  return Response.json(result);
}
```

### Option 3: Watch Mode

```bash
# Auto-regenerate when code changes
docgen watch --project ./my-app --output ../my-bookshelf/docs/my-app
```

## Success Criteria

### Phase 1-2 (Static Analysis)
✅ Can scan and parse My Bookshelf codebase
✅ Extracts all functions, components, types
✅ Builds accurate dependency graph
✅ Generates JSON with complete metadata

### Phase 3-4 (LLM + Generation)
✅ Ollama integration works smoothly
✅ Generated explanations are clear and accurate
✅ Markdown output is valid
✅ Frontmatter matches My Bookshelf format

### Phase 5-6 (Polish + Integration)
✅ CLI is user-friendly
✅ Errors are handled gracefully
✅ Docs import cleanly into My Bookshelf
✅ Generated docs are high quality

## Future Enhancements (Post-MVP)

### Advanced Features
- **Multi-language support** (Python, Go, Rust, Java)
- **Diagram generation** (Mermaid architecture diagrams)
- **API endpoint detection** (auto-doc REST/GraphQL APIs)
- **Change detection** (only regenerate modified files)
- **Custom plugins** (extend for specific frameworks)

### Quality Improvements
- **Fine-tuned model** (if needed after testing)
- **Better prompts** (iterative improvement)
- **Example generation** (automatic code examples)
- **Screenshot integration** (for UI components)

### Integration
- **VSCode extension** (generate docs in editor)
- **GitHub Action** (auto-update docs on push)
- **Web UI** (full-featured web interface)
- **API server** (run as microservice)

## Risk Mitigation

### Risk: LLM quality insufficient
**Mitigation:** Test with multiple models, fall back to static-only docs, allow manual editing

### Risk: Performance too slow
**Mitigation:** Aggressive caching, parallel processing, incremental updates

### Risk: TypeScript parsing fails
**Mitigation:** Fallback parsers (Babel), graceful degradation, error reporting

### Risk: Generated docs don't match style
**Mitigation:** Template customization, post-processing rules, human review

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | Week 1 | Scanner + Basic Parser |
| Phase 2 | Week 2 | Complete Static Analysis |
| Phase 3 | Week 3 | LLM Integration |
| Phase 4 | Week 4 | Markdown Generation |
| Phase 5 | Week 5 | CLI Polish |
| Phase 6 | Week 6 | Testing + Integration |
| **Total** | **6 weeks** | **Production-Ready Tool** |

## Getting Started

### Prerequisites
- Node.js 20+
- Ollama installed
- CodeLlama-7B model downloaded

### Initial Setup
```bash
# Create project
mkdir docs-generator-app
cd docs-generator-app
npm init -y

# Install dependencies
npm install typescript @types/node
npm install commander ora chalk enquirer
npm install glob gray-matter
npm install ollama

# Setup TypeScript
npx tsc --init

# Start development
npm run dev
```

### First Task
Build the file scanner that can:
1. Traverse a directory
2. Identify .ts/.tsx/.js/.jsx files
3. Read file contents
4. Output list of files with metadata

---

**Status:** Ready to begin Phase 1
**Next Step:** Initialize project structure and start building scanner module
**Questions?** Review this plan, propose changes, then we start coding!
