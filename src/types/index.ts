/**
 * Core type definitions for DocGen
 *
 * This file contains all the shared type definitions used throughout
 * the documentation generator. Types are organized by concern:
 * - File system types
 * - Code analysis types
 * - Configuration types
 * - Output types
 */

// ============================================================================
// FILE SYSTEM TYPES
// ============================================================================

/**
 * Supported programming languages
 */
export type Language = 'typescript' | 'javascript' | 'python' | 'unknown';

/**
 * Detected framework or library
 */
export type Framework = 'nextjs' | 'react' | 'vue' | 'node' | 'django' | 'flask' | 'fastapi' | 'airflow' | 'none';

/**
 * File type classification
 */
export type FileType =
  | 'typescript'      // .ts
  | 'typescript-jsx'  // .tsx
  | 'javascript'      // .js
  | 'javascript-jsx'  // .jsx
  | 'python'          // .py
  | 'json'            // .json
  | 'markdown'        // .md
  | 'yaml'            // .yml, .yaml
  | 'config'          // Config files
  | 'unknown';        // Unknown file type

/**
 * Represents a file in the project
 */
export interface FileNode {
  /** Absolute path to the file */
  path: string;

  /** Path relative to project root */
  relativePath: string;

  /** File type classification */
  type: FileType;

  /** Primary language of the file */
  language: Language;

  /** Detected framework (if any) */
  framework?: Framework;

  /** File size in bytes */
  size: number;

  /** Last modified timestamp */
  lastModified: Date;

  /** Whether this is a test file */
  isTest: boolean;

  /** Whether this is a configuration file */
  isConfig: boolean;
}

// ============================================================================
// CODE ANALYSIS TYPES
// ============================================================================

/**
 * Symbol types that can be extracted from code
 */
export type SymbolType =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'component'
  | 'hook'
  | 'enum'
  | 'method'      // Python/general method
  | 'property'    // Python property
  | 'decorator'   // Python decorator
  | 'module';     // Python module

/**
 * Visibility/access level of a symbol
 */
export type Visibility = 'public' | 'private' | 'protected' | 'internal';

/**
 * Parameter definition for a function
 */
export interface Parameter {
  /** Parameter name */
  name: string;

  /** Type (if available) */
  type?: string;

  /** Whether this parameter is optional */
  optional: boolean;

  /** Default value (if any) */
  defaultValue?: string;

  /** Description from JSDoc/TSDoc */
  description?: string;

  /** Python: Variable arguments (*args) */
  isVarArgs?: boolean;

  /** Python: Keyword arguments (**kwargs) */
  isKwArgs?: boolean;
}

/**
 * Return type information
 */
export interface ReturnType {
  /** Return type */
  type: string;

  /** Description from JSDoc/TSDoc */
  description?: string;
}

/**
 * Represents a code symbol (function, class, etc.)
 */
export interface Symbol {
  /** Unique identifier */
  id: string;

  /** Symbol name */
  name: string;

  /** Symbol type */
  type: SymbolType;

  /** File where this symbol is defined */
  filePath: string;

  /** Line number where symbol starts */
  line: number;

  /** Line number where symbol ends */
  endLine: number;

  /** Visibility */
  visibility: Visibility;

  /** Whether this symbol is exported */
  exported: boolean;

  /** Function parameters (if applicable) */
  parameters?: Parameter[];

  /** Return type (if applicable) */
  returnType?: ReturnType;

  /** Props (for React components) */
  props?: Record<string, TypeDefinition>;

  /** Base class (for classes) */
  extends?: string;

  /** Implemented interfaces */
  implements?: string[];

  /** Generic type parameters */
  typeParameters?: string[];

  /** JSDoc/TSDoc comment */
  comment?: string;

  /** Extracted tags from JSDoc */
  tags?: Record<string, string>;

  /** Source code of the symbol */
  source?: string;
}

/**
 * Type definition (for TypeScript types/interfaces)
 */
export interface TypeDefinition {
  /** Type name */
  name: string;

  /** Type kind */
  kind: 'interface' | 'type' | 'enum' | 'class';

  /** Type value/definition */
  value: string;

  /** Properties (for interfaces/classes) */
  properties?: Record<string, {
    type: string;
    optional: boolean;
    description?: string;
  }>;

  /** Description */
  description?: string;
}

/**
 * Dependency relationship between modules
 */
export interface Dependency {
  /** Source file */
  from: string;

  /** Target file/module */
  to: string;

  /** Import type */
  type: 'import' | 'require' | 'dynamic';

  /** Imported symbols */
  symbols: string[];
}

/**
 * Detected code pattern
 */
export interface DetectedPattern {
  /** Pattern name */
  name: string;

  /** Pattern type */
  type: 'react-component' | 'nextjs-page' | 'api-route' | 'hook' | 'util' | 'config'
    | 'airflow-dag' | 'airflow-operator' | 'airflow-sensor' | 'airflow-custom-operator'
    | 'airflow-custom-sensor' | 'airflow-custom-hook'
    | 'django-model' | 'django-view' | 'django-serializer' | 'django-admin'
    | 'flask-app' | 'flask-blueprint' | 'flask-route'
    | 'fastapi-app' | 'fastapi-route' | 'fastapi-model';

  /** File where pattern was detected */
  filePath: string;

  /** Line number where pattern starts */
  line?: number;

  /** Pattern description */
  description?: string;

  /** Associated symbols */
  symbols?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete project analysis result
 */
export interface ProjectAnalysis {
  /** All extracted symbols */
  symbols: Symbol[];

  /** All type definitions */
  types: TypeDefinition[];

  /** Dependency graph */
  dependencies: Dependency[];

  /** Detected patterns */
  patterns: DetectedPattern[];

  /** Project metadata */
  project: ProjectMetadata;
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  /** Project name */
  name: string;

  /** Project root path */
  path: string;

  /** Detected project type */
  type: Framework;

  /** Package.json dependencies */
  dependencies: Record<string, string>;

  /** TypeScript config (if available) */
  tsConfig?: Record<string, unknown>;

  /** Total files analyzed */
  fileCount: number;

  /** Total symbols extracted */
  symbolCount: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * File selection configuration
 */
export interface FileConfig {
  /** Glob patterns to include */
  include: string[];

  /** Glob patterns to exclude */
  exclude: string[];
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  /** LLM provider */
  provider: 'ollama';

  /** Model name */
  model: string;

  /** API base URL */
  baseURL: string;

  /** Temperature (0-1) */
  temperature: number;

  /** Max tokens per response */
  maxTokens: number;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Output directory path */
  path: string;

  /** Organization structure */
  structure: 'mirror' | 'flat' | 'custom';

  /** Clean output before generation */
  clean: boolean;
}

/**
 * Documentation types to generate
 */
export interface GenerateConfig {
  overview: boolean;
  api: boolean;
  components: boolean;
  setup: boolean;
  architecture: boolean;
  guides: boolean;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Number of parallel LLM calls */
  parallel: number;

  /** Enable caching */
  cache: boolean;

  /** Cache directory */
  cacheDir: string;
}

/**
 * Behavior configuration
 */
export interface BehaviorConfig {
  /** Skip existing files */
  skipExisting: boolean;

  /** Update mode */
  updateMode: 'smart' | 'force' | 'never';

  /** Dry run (no writes) */
  dryRun: boolean;

  /** Verbose logging */
  verbose: boolean;
}

/**
 * Complete DocGen configuration
 */
export interface DocGenConfig {
  /** Project configuration */
  project: {
    path: string;
    name?: string;
    type?: Framework;
  };

  /** File selection */
  files: FileConfig;

  /** LLM settings */
  llm: LLMConfig;

  /** Output settings */
  output: OutputConfig;

  /** What to generate */
  generate: GenerateConfig;

  /** Custom templates */
  templates?: Record<string, string>;

  /** Frontmatter defaults */
  frontmatter?: {
    author?: string;
    defaultTags?: string[];
    [key: string]: unknown;
  };

  /** Performance settings */
  performance: PerformanceConfig;

  /** Behavior settings */
  behavior: BehaviorConfig;
}

// ============================================================================
// CONTEXT & GENERATION TYPES
// ============================================================================

/**
 * Context for documentation generation
 */
export interface DocumentContext {
  /** Unique identifier */
  id: string;

  /** Document type */
  type: 'function' | 'component' | 'class' | 'type' | 'overview' | 'guide';

  /** Symbol being documented */
  symbol?: Symbol;

  /** Related symbols */
  relatedSymbols: Symbol[];

  /** Static information (extracted from code) */
  staticData: Record<string, unknown>;

  /** Whether this needs AI generation */
  needsAI: boolean;

  /** Prompt for AI (if needed) */
  aiPrompt?: string;

  /** Target file path */
  outputPath: string;
}

/**
 * AI-generated content
 */
export interface AIGeneratedContent {
  /** Context ID this belongs to */
  contextId: string;

  /** Summary/description */
  summary: string;

  /** Detailed description */
  description: string;

  /** Code examples */
  examples?: CodeExample[];

  /** Additional notes */
  notes?: string[];
}

/**
 * Code example
 */
export interface CodeExample {
  /** Example title */
  title?: string;

  /** Programming language */
  language: string;

  /** Code content */
  code: string;

  /** Description */
  description?: string;
}

/**
 * Generated documentation file
 */
export interface GeneratedDoc {
  /** File path */
  path: string;

  /** Frontmatter metadata */
  frontmatter: {
    title: string;
    description: string;
    tags: string[];
    date: string;
    author?: string;
    [key: string]: unknown;
  };

  /** Markdown content */
  content: string;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Scan result
 */
export interface ScanResult {
  /** Files found */
  files: FileNode[];

  /** Total files scanned */
  totalFiles: number;

  /** Files by type */
  filesByType: Record<FileType, number>;

  /** Errors encountered */
  errors: Error[];
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  /** Project analysis */
  analysis: ProjectAnalysis;

  /** Time taken (ms) */
  duration: number;

  /** Errors encountered */
  errors: Error[];
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Files generated */
  filesGenerated: number;

  /** Files skipped */
  filesSkipped: number;

  /** Errors encountered */
  errors: Error[];

  /** Generated documents */
  documents: GeneratedDoc[];

  /** Time taken (ms) */
  duration: number;
}
