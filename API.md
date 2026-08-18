# DocGen API Documentation

Complete API reference for using DocGen programmatically in your Node.js applications.

## Installation

```bash
npm install docgen
```

## Core Modules

### Scanner

The Scanner module is responsible for discovering and classifying source files in a project.

#### Import

```typescript
import { Scanner, scanProject } from 'docgen';
```

#### Scanner Class

```typescript
class Scanner {
  constructor(
    projectPath: string,
    options?: ScannerOptions
  );

  scan(): Promise<ScanResult>;
}
```

**Options:**

```typescript
interface ScannerOptions {
  includeTests?: boolean;      // Include test files (default: true)
  includeConfigs?: boolean;    // Include config files (default: true)
  respectGitignore?: boolean;  // Respect .gitignore (default: true)
  customPatterns?: {
    include?: string[];        // Custom include patterns
    exclude?: string[];        // Custom exclude patterns
  };
}
```

**Return Type:**

```typescript
interface ScanResult {
  files: FileNode[];                          // All discovered files
  totalFiles: number;                         // Total count
  filesByType: Record<FileType, number>;     // Files grouped by type
  errors: Error[];                            // Any errors encountered
}
```

#### Example Usage

```typescript
import { Scanner } from 'docgen';

// Basic usage
const scanner = new Scanner('./my-project');
const result = await scanner.scan();

console.log(`Found ${result.totalFiles} files`);
console.log(`TypeScript files: ${result.filesByType['typescript']}`);

// With options
const scanner = new Scanner('./my-project', {
  includeTests: false,
  respectGitignore: true,
  customPatterns: {
    include: ['src/**/*.ts'],
    exclude: ['**/*.spec.ts']
  }
});

const result = await scanner.scan();
```

#### Convenience Function

```typescript
async function scanProject(
  projectPath: string,
  options?: ScannerOptions
): Promise<ScanResultWithConfig>;
```

Example:

```typescript
import { scanProject } from 'docgen';

const result = await scanProject('./my-project', {
  includeTests: false
});
```

---

### Analyzer

The Analyzer module extracts semantic information from source code files.

#### Import

```typescript
import { Analyzer, analyzeFiles } from 'docgen';
```

#### Analyzer Class

```typescript
class Analyzer {
  constructor(options?: AnalyzerOptions);

  analyze(files: FileNode[]): Promise<ProjectAnalysis>;
  analyzeFile(file: FileNode): Promise<FileAnalysis>;
}
```

**Options:**

```typescript
interface AnalyzerOptions {
  extractComments?: boolean;    // Extract JSDoc/TSDoc (default: true)
  detectPatterns?: boolean;     // Detect framework patterns (default: true)
  resolveTypes?: boolean;       // Resolve TypeScript types (default: true)
}
```

**Return Type:**

```typescript
interface ProjectAnalysis {
  symbols: Symbol[];              // All extracted symbols
  types: TypeDefinition[];        // Type definitions
  dependencies: Dependency[];     // Dependency graph
  patterns: DetectedPattern[];    // Detected patterns
  project: ProjectMetadata;       // Project metadata
}
```

#### Symbol Types

Extracted symbols can be:
- `function` - Function declarations
- `class` - Class declarations
- `interface` - TypeScript interfaces
- `type` - TypeScript type aliases
- `component` - React components
- `hook` - React hooks
- `variable` - Variables/constants
- `enum` - TypeScript enums

#### Example Usage

```typescript
import { Analyzer } from 'docgen';

// Create analyzer
const analyzer = new Analyzer({
  extractComments: true,
  detectPatterns: true
});

// Analyze files
const analysis = await analyzer.analyze(files);

// Access results
console.log(`Found ${analysis.symbols.length} symbols`);

// Filter by type
const functions = analysis.symbols.filter(s => s.type === 'function');
const components = analysis.symbols.filter(s => s.type === 'component');

// Access symbol details
functions.forEach(fn => {
  console.log(`Function: ${fn.name}`);
  console.log(`  Parameters: ${fn.parameters?.length || 0}`);
  console.log(`  Returns: ${fn.returnType?.type || 'void'}`);
  console.log(`  Comment: ${fn.comment || 'No documentation'}`);
});
```

---

### Generator

The Generator module creates markdown documentation files from analyzed code.

#### Import

```typescript
import { Generator } from 'docgen/generator';
```

#### Generator Class

```typescript
class Generator {
  constructor(options: GeneratorOptions);

  generate(
    analysis: ProjectAnalysis,
    options?: GenerationOptions
  ): Promise<GenerationResult>;
}
```

**Constructor Options:**

```typescript
interface GeneratorOptions {
  outputPath: string;                    // Output directory
  structure: 'mirror' | 'flat' | 'custom';  // Organization structure
  templates?: string;                    // Custom templates directory
  frontmatterDefaults?: {
    author?: string;
    defaultTags?: string[];
    [key: string]: unknown;
  };
}
```

**Generation Options:**

```typescript
interface GenerationOptions {
  llmEnhancement?: boolean;       // Use LLM for descriptions
  dryRun?: boolean;               // Preview without writing
  clean?: boolean;                // Clean output before generating
  skipExisting?: boolean;         // Skip files that exist
}
```

**Return Type:**

```typescript
interface GenerationResult {
  filesGenerated: number;         // Number of files created
  filesSkipped: number;           // Number of files skipped
  errors: Error[];                // Any errors
  documents: GeneratedDoc[];      // All generated documents
  duration: number;               // Time taken (ms)
}
```

#### Example Usage

```typescript
import { Generator } from 'docgen/generator';

// Create generator
const generator = new Generator({
  outputPath: './docs',
  structure: 'custom',
  frontmatterDefaults: {
    author: 'My Team',
    defaultTags: ['api', 'documentation']
  }
});

// Generate docs
const result = await generator.generate(analysis, {
  llmEnhancement: true,
  clean: true
});

console.log(`Generated ${result.filesGenerated} files`);
console.log(`Took ${result.duration}ms`);
```

---

### LLM Service

The LLM Service provides AI-powered documentation enhancement using local models via Ollama.

#### Import

```typescript
import { LLMService, createLLMService } from 'docgen';
```

#### LLMService Class

```typescript
class LLMService {
  constructor(options: LLMServiceOptions);

  enhanceDocumentation(
    symbol: Symbol,
    options?: EnhancementOptions
  ): Promise<EnhancementResult>;

  generateOverview(
    analysis: ProjectAnalysis
  ): Promise<string>;
}
```

**Options:**

```typescript
interface LLMServiceOptions {
  model: string;              // Model name (e.g., 'codellama:latest')
  baseURL?: string;           // Ollama API URL (default: localhost:11434)
  temperature?: number;       // Temperature (0-1, default: 0.3)
  maxTokens?: number;         // Max tokens per response (default: 2048)
}
```

**Enhancement Result:**

```typescript
interface EnhancementResult {
  summary: string;            // One-line summary
  description: string;        // Detailed description
  examples?: CodeExample[];   // Usage examples
  notes?: string[];          // Additional notes
}
```

#### Example Usage

```typescript
import { createLLMService } from 'docgen';

// Create service
const llm = createLLMService({
  model: 'codellama:latest',
  temperature: 0.3,
  maxTokens: 2048
});

// Enhance a symbol
const enhanced = await llm.enhanceDocumentation(symbol);

console.log('Summary:', enhanced.summary);
console.log('Description:', enhanced.description);
console.log('Examples:', enhanced.examples?.length || 0);

// Generate project overview
const overview = await llm.generateOverview(analysis);
console.log(overview);
```

---

### Configuration

Load and validate DocGen configuration files.

#### Import

```typescript
import { loadConfig, validateConfig } from 'docgen/config';
```

#### Functions

```typescript
async function loadConfig(
  configPath?: string
): Promise<DocGenConfig>;

function validateConfig(
  config: Partial<DocGenConfig>
): DocGenConfig;
```

#### Example Usage

```typescript
import { loadConfig } from 'docgen/config';

// Load from default locations
const config = await loadConfig();

// Load from specific path
const config = await loadConfig('./custom-config.yml');

// Manually create config
import { validateConfig } from 'docgen/config';

const config = validateConfig({
  project: { path: '.' },
  files: {
    include: ['src/**/*.ts'],
    exclude: ['**/*.test.ts']
  },
  llm: {
    model: 'codellama:latest'
  }
});
```

---

## Complete Example

Here's a complete example that ties everything together:

```typescript
import { scanProject, Analyzer, Generator, createLLMService } from 'docgen';

async function generateDocumentation(projectPath: string) {
  try {
    // 1. Scan project files
    console.log('Scanning project...');
    const scanResult = await scanProject(projectPath, {
      includeTests: false,
      respectGitignore: true
    });

    console.log(`Found ${scanResult.totalFiles} files`);

    // 2. Analyze code
    console.log('Analyzing code...');
    const analyzer = new Analyzer({
      extractComments: true,
      detectPatterns: true
    });

    const analysis = await analyzer.analyze(scanResult.files);
    console.log(`Extracted ${analysis.symbols.length} symbols`);

    // 3. Setup LLM (optional)
    const llm = createLLMService({
      model: 'codellama:latest',
      temperature: 0.3
    });

    // 4. Generate documentation
    console.log('Generating documentation...');
    const generator = new Generator({
      outputPath: './docs',
      structure: 'custom',
      frontmatterDefaults: {
        author: 'DocGen',
        defaultTags: ['auto-generated']
      }
    });

    const result = await generator.generate(analysis, {
      llmEnhancement: true,
      clean: true
    });

    console.log(`✓ Generated ${result.filesGenerated} documentation files`);
    console.log(`✓ Took ${(result.duration / 1000).toFixed(2)}s`);

    return result;

  } catch (error) {
    console.error('Documentation generation failed:', error);
    throw error;
  }
}

// Run it
generateDocumentation('./my-project');
```

---

## Type Definitions

All TypeScript type definitions are exported from the main module:

```typescript
import type {
  // File types
  FileNode,
  FileType,
  Language,
  Framework,

  // Symbol types
  Symbol,
  SymbolType,
  Parameter,
  ReturnType,
  TypeDefinition,

  // Analysis types
  ProjectAnalysis,
  Dependency,
  DetectedPattern,

  // Config types
  DocGenConfig,
  LLMConfig,
  OutputConfig,

  // Result types
  ScanResult,
  AnalysisResult,
  GenerationResult
} from 'docgen';
```

---

## Error Handling

All async functions can throw errors. Wrap them in try-catch blocks:

```typescript
try {
  const result = await scanProject('./project');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Project directory not found');
  } else if (error.code === 'EACCES') {
    console.error('Permission denied');
  } else {
    console.error('Scan failed:', error.message);
  }
}
```

Common error codes:
- `ENOENT` - File/directory not found
- `EACCES` - Permission denied
- `PARSE_ERROR` - Failed to parse file
- `LLM_ERROR` - LLM service error
- `CONFIG_ERROR` - Invalid configuration

---

## Advanced Usage

### Custom Templates

Create custom Handlebars templates for documentation:

```typescript
const generator = new Generator({
  outputPath: './docs',
  templates: './my-templates'
});
```

Your template directory structure:
```
my-templates/
├── function.hbs
├── component.hbs
├── class.hbs
├── type.hbs
└── overview.hbs
```

### Custom File Organization

Implement custom file organization logic:

```typescript
import { FileOrganizer } from 'docgen/generator';

const organizer = new FileOrganizer({
  structure: 'custom',
  customOrganizer: (symbol: Symbol) => {
    // Custom logic to determine output path
    if (symbol.type === 'component') {
      return `components/${symbol.name}.md`;
    }
    return `api/${symbol.name}.md`;
  }
});
```

### Batch Processing

Process multiple projects:

```typescript
const projects = ['./project-a', './project-b', './project-c'];

const results = await Promise.all(
  projects.map(path => generateDocumentation(path))
);

const totalFiles = results.reduce((sum, r) => sum + r.filesGenerated, 0);
console.log(`Generated ${totalFiles} total files`);
```

---

## Next Steps

- Check out [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details
- See [QUICKSTART.md](./QUICKSTART.md) for CLI usage
- Review [examples/](./examples/) for more code samples
