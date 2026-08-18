# DocGen Architecture

## System Architecture

### Overview

DocGen uses a hybrid approach combining static code analysis with local LLM inference to generate high-quality documentation automatically.

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CLI Entry                              │
│                         (Commander.js)                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Configuration                               │
│                  (Load docgen.config.yml)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────┐   ┌──────────────────────────┐
│   Scanner Module      │   │   Cache Manager          │
│                       │   │                          │
│ - Walk directories    │   │ - Load cached ASTs       │
│ - Filter files        │   │ - Check timestamps       │
│ - Load configs        │   │ - Invalidate stale       │
└──────────┬────────────┘   └────────────┬─────────────┘
           │                             │
           └─────────────┬───────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Analyzer Module                              │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  AST Parser     │  │ Symbol Extractor │  │ Type Resolver    │  │
│  │                 │  │                  │  │                  │  │
│  │ - TS Compiler   │─▶│ - Functions      │─▶│ - Infer types    │  │
│  │ - Babel Parser  │  │ - Classes        │  │ - Resolve refs   │  │
│  └─────────────────┘  │ - Components     │  │ - Build graph    │  │
│                       │ - Interfaces     │  └──────────────────┘  │
│                       │ - Types          │                         │
│                       └──────────────────┘                         │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐                        │
│  │ Comment Parser  │  │ Pattern Detector │                        │
│  │                 │  │                  │                        │
│  │ - JSDoc/TSDoc   │  │ - React comps    │                        │
│  │ - Inline docs   │  │ - API routes     │                        │
│  │ - Link to code  │  │ - Utils          │                        │
│  └─────────────────┘  │ - Configs        │                        │
│                       └──────────────────┘                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Context Builder                                │
│                                                                     │
│  - Group related symbols                                           │
│  - Build LLM prompts                                               │
│  - Optimize for tokens                                             │
│  - Identify static vs AI tasks                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────┐   ┌──────────────────────────┐
│  Static Generator     │   │   LLM Module             │
│                       │   │                          │
│ - No AI needed        │   │ ┌──────────────────────┐ │
│ - Type definitions    │   │ │  Ollama Client       │ │
│ - Function sigs       │   │ │                      │ │
│ - File structure      │   │ │ - Connect to local   │ │
│                       │   │ │ - Send prompts       │ │
└──────────┬────────────┘   │ │ - Parse responses    │ │
           │                │ └──────────────────────┘ │
           │                │                          │
           │                │ ┌──────────────────────┐ │
           │                │ │  Batch Processor     │ │
           │                │ │                      │ │
           │                │ │ - Queue tasks        │ │
           │                │ │ - Parallel execution │ │
           │                │ │ - Rate limiting      │ │
           │                │ │ - Progress tracking  │ │
           │                │ └──────────────────────┘ │
           │                └────────────┬─────────────┘
           │                             │
           └─────────────┬───────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Generator Module                               │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Template Engine │  │ Frontmatter Gen  │  │ Markdown Builder │  │
│  │                 │  │                  │  │                  │  │
│  │ - Load templates│─▶│ - Generate title │─▶│ - Format content │  │
│  │ - Fill data     │  │ - Extract desc   │  │ - Add code blocks│  │
│  │ - Handlebars    │  │ - Auto-tag       │  │ - Add links      │  │
│  └─────────────────┘  │ - Set date       │  │ - Add examples   │  │
│                       └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐                        │
│  │ File Organizer  │  │ Cross-Referencer │                        │
│  │                 │  │                  │                        │
│  │ - Create dirs   │  │ - Link docs      │                        │
│  │ - Name files    │  │ - Generate TOC   │                        │
│  │ - Write to disk │  │ - Create index   │                        │
│  └─────────────────┘  └──────────────────┘                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Output: Markdown Files                          │
│              (My Bookshelf-compatible format)                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. Scanner Module

**Purpose:** Discover and classify source files

**Components:**
- **FileWalker**: Recursively traverse directories
- **FileClassifier**: Identify file types (TS/JS/TSX/JSX)
- **ConfigLoader**: Load package.json, tsconfig.json, etc.
- **GitignoreParser**: Respect .gitignore rules

**Input:** Project path, configuration
**Output:** List of FileNode objects

```typescript
interface FileNode {
  path: string;
  relativePath: string;
  type: FileType;
  size: number;
  lastModified: Date;
  language: 'typescript' | 'javascript';
  framework?: 'react' | 'nextjs' | 'vue';
}
```

### 2. Analyzer Module

**Purpose:** Extract semantic information from code

**Components:**

#### AST Parser
- Uses TypeScript Compiler API for TS/TSX
- Falls back to Babel for complex JS
- Generates Abstract Syntax Tree
- Handles syntax errors gracefully

#### Symbol Extractor
- Finds all exports (functions, classes, types)
- Extracts function signatures
- Identifies React components
- Extracts interfaces and types

#### Type Resolver
- Resolves TypeScript types
- Infers types when not explicit
- Builds type dependency graph
- Handles generic types

#### Comment Parser
- Parses JSDoc/TSDoc comments
- Extracts inline documentation
- Links comments to code elements
- Preserves formatting

#### Pattern Detector
- Identifies React components (hooks, props)
- Detects Next.js patterns (pages, API routes)
- Finds utility functions
- Recognizes configuration files

**Input:** FileNode[]
**Output:** ProjectAnalysis

```typescript
interface ProjectAnalysis {
  symbols: Symbol[];
  types: TypeDefinition[];
  comments: CommentNode[];
  dependencies: DependencyGraph;
  patterns: DetectedPattern[];
}
```

### 3. Context Builder

**Purpose:** Prepare data for LLM and template engine

**Responsibilities:**
- Group related symbols (e.g., component + its types)
- Build optimized prompts for LLM
- Determine what needs AI vs static generation
- Calculate token usage estimates

**Input:** ProjectAnalysis
**Output:** DocumentContext[]

```typescript
interface DocumentContext {
  id: string;
  type: 'function' | 'component' | 'class' | 'type' | 'overview';
  staticData: StaticInfo;
  needsAI: boolean;
  aiPrompt?: string;
  relatedSymbols: string[];
}
```

### 4. LLM Module

**Purpose:** Generate human-readable explanations

**Components:**

#### Ollama Client
- Connects to local Ollama instance (http://localhost:11434)
- Sends prompts
- Streams or batches responses
- Handles connection errors

#### Prompt Builder
- Template-based prompt generation
- Context injection
- Token optimization
- Model-specific formatting

#### Response Parser
- Extracts structured data from LLM output
- Validates response format
- Handles incomplete responses
- Error recovery

#### Batch Processor
- Queues AI tasks
- Parallel execution (multi-core)
- Progress tracking
- Caching to avoid re-generation

**Input:** DocumentContext[]
**Output:** AIGeneratedContent[]

```typescript
interface AIGeneratedContent {
  contextId: string;
  summary: string;
  description: string;
  examples?: CodeExample[];
  notes?: string[];
}
```

### 5. Generator Module

**Purpose:** Create final markdown documentation

**Components:**

#### Template Engine
- Handlebars-based templates
- Custom helpers for code formatting
- Template inheritance
- Partial support

#### Frontmatter Generator
- Auto-generate title from symbol name
- Extract description from AI output
- Auto-tag based on file type/pattern
- Set date to generation time
- Validate My Bookshelf schema

#### Markdown Builder
- Combine static + AI content
- Format code blocks with syntax highlighting
- Generate tables (for props, params)
- Create links between docs
- Add usage examples

#### File Organizer
- Mirror source structure or custom organization
- Create directory hierarchy
- Generate filenames
- Handle naming conflicts
- Write to disk atomically

#### Cross-Referencer
- Link related documents
- Generate table of contents
- Create index pages
- Build navigation structure

**Input:** DocumentContext[] + AIGeneratedContent[]
**Output:** Markdown files written to disk

## Data Flow

### Scanning Phase
```
Project Directory
    ↓
[Scan files matching pattern]
    ↓
FileNode[] {path, type, language}
    ↓
[Load into cache if not changed]
```

### Analysis Phase
```
FileNode[]
    ↓
[Parse with TS Compiler API]
    ↓
AST (Abstract Syntax Tree)
    ↓
[Extract symbols, types, comments]
    ↓
ProjectAnalysis {symbols, types, dependencies}
    ↓
[Build context for generation]
    ↓
DocumentContext[] {static data, AI prompts}
```

### Generation Phase
```
DocumentContext[]
    ↓
┌─────────────────┴─────────────────┐
│                                   │
[Static Generator]              [LLM Module]
    ↓                               ↓
Static Content              AI Generated Content
    │                               │
    └───────────┬───────────────────┘
                ↓
    [Combine in template engine]
                ↓
         Markdown Content
                ↓
    [Generate frontmatter]
                ↓
    Complete Document (.md)
                ↓
    [Write to file system]
                ↓
    docs/output/file.md
```

## Caching Strategy

### AST Cache
- Cache parsed ASTs to avoid re-parsing
- Keyed by file path + last modified time
- Stored in `.docgen-cache/ast/`
- Invalidated when file changes

### LLM Response Cache
- Cache AI-generated explanations
- Keyed by source code hash
- Stored in `.docgen-cache/llm/`
- Never invalidated (deterministic based on code)

### Incremental Updates
- Compare previous analysis with current
- Identify changed/new/deleted symbols
- Only regenerate affected docs
- Update cross-references

## Parallelization

### Scanner
- Single-threaded (I/O bound, not CPU intensive)

### Analyzer
- Can parallelize per-file
- Use worker threads for large projects
- Shared type resolution cache

### LLM
- Batch multiple prompts
- Parallel execution up to CPU cores
- Queue management to avoid overwhelming local model
- Progress tracking for UX

### Generator
- Parallelize markdown generation
- Single-threaded file writing (avoid conflicts)

## Error Handling

### Parse Errors
- Log error with file path and line number
- Continue with other files
- Generate partial docs with warnings

### LLM Errors
- Retry 3 times with exponential backoff
- Fall back to static-only generation
- Log failed prompts for debugging

### File System Errors
- Check permissions before writing
- Atomic writes (temp file + rename)
- Rollback on partial failure

## Performance Optimizations

### 1. Incremental Analysis
Only re-analyze changed files:
```typescript
const changedFiles = await detectChanges(previousCache, currentFiles);
const analysis = await analyzeFiles(changedFiles);
mergeWithPreviousAnalysis(analysis, previousCache);
```

### 2. Lazy Type Resolution
Resolve types only when needed for documentation:
```typescript
if (symbol.needsTypeDoc) {
  const type = await resolveType(symbol);
}
```

### 3. LLM Batching
Combine multiple small prompts:
```typescript
const batch = prompts.slice(0, 10);
const responses = await llm.batch(batch);
```

### 4. Smart Caching
Cache at multiple levels:
- File system reads
- AST parsing
- Type resolution
- LLM responses

### 5. Parallel Processing
Utilize all CPU cores:
```typescript
const workers = new WorkerPool(os.cpus().length);
const results = await workers.map(files, analyzeFile);
```

## Scalability

### Small Projects (< 100 files)
- Single-threaded analysis
- No caching needed
- Direct LLM calls
- ~5-10 minutes total

### Medium Projects (100-1000 files)
- Parallel analysis
- AST caching
- Batched LLM calls
- ~20-40 minutes total

### Large Projects (1000+ files)
- Worker threads
- Full caching strategy
- Incremental updates
- Selective generation
- ~1-2 hours for initial, minutes for updates

## Extension Points

### Custom Analyzers
```typescript
interface Analyzer {
  canAnalyze(file: FileNode): boolean;
  analyze(file: FileNode): Promise<Analysis>;
}

// Register custom analyzer
docgen.registerAnalyzer(new VueComponentAnalyzer());
```

### Custom Templates
```typescript
// Override default template
docgen.setTemplate('component', './my-component-template.hbs');

// Add custom template type
docgen.addTemplateType('api-endpoint', './api-template.hbs');
```

### Custom Patterns
```typescript
interface Pattern {
  name: string;
  detect(symbol: Symbol): boolean;
  generateDoc(symbol: Symbol, ai: AIClient): Promise<string>;
}

docgen.registerPattern(new GraphQLResolverPattern());
```

### Post-processors
```typescript
interface PostProcessor {
  process(markdown: string, context: DocumentContext): string;
}

// Add custom post-processing
docgen.addPostProcessor(new CodeSnippetEnhancer());
```

## Security Considerations

### Code Execution
- ❌ Never use `eval()` or `Function()` on source code
- ✅ Use proper AST parsers
- ✅ Sandbox any dynamic code (if needed)

### File System Access
- ✅ Validate all paths
- ✅ Prevent directory traversal
- ✅ Respect .gitignore
- ✅ Don't read sensitive files (.env, keys)

### LLM Prompts
- ✅ Don't include secrets in prompts
- ✅ Sanitize file paths
- ✅ Limit prompt size
- ✅ Validate responses

## Testing Architecture

### Unit Tests
- Test each module independently
- Mock dependencies
- Test edge cases
- Fast execution

### Integration Tests
- Test module interactions
- Use real parsers
- Mock LLM (use fixtures)
- Verify output format

### End-to-End Tests
- Test complete workflow
- Use sample projects
- Verify generated docs
- Check My Bookshelf compatibility

### Performance Tests
- Benchmark each phase
- Test with projects of varying sizes
- Monitor memory usage
- Identify bottlenecks

## Monitoring & Debugging

### Logging Levels
```typescript
logger.debug('Parsing file:', filePath);  // Verbose
logger.info('Generated 50 docs');         // Progress
logger.warn('Missing JSDoc comment');     // Issues
logger.error('Failed to parse:', error);  // Errors
```

### Metrics
- Files scanned
- Symbols extracted
- LLM calls made
- Cache hit rate
- Generation time
- Error count

### Debug Mode
```bash
docgen scan --debug
# Outputs:
# - Detailed logs
# - Intermediate files
# - Prompt/response pairs
# - Performance timing
```

---

This architecture provides a solid foundation that balances quality, performance, and extensibility while keeping the implementation complexity manageable.
