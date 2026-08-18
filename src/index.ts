/**
 * DocGen - Documentation Generator
 *
 * Main entry point for programmatic API
 */

// Export types
export * from './types/index.js';

// Export scanner
export { Scanner, scanProject, FileWalker, FileClassifier, ConfigLoader } from './core/scanner/index.js';
export type { ScannerOptions, ScanResultWithConfig, ProjectConfig } from './core/scanner/index.js';

// Export analyzer
export { Analyzer, analyzeFiles, ASTParser, SymbolExtractor, CommentParser, PatternDetector } from './core/analyzer/index.js';
export type { AnalyzerOptions } from './core/analyzer/index.js';
export type { ParsedAST } from './core/analyzer/ast-parser.js';

// Export LLM module
export { OllamaClient, LLMService, DocEnhancer, createOllamaClient, createLLMService, createDocEnhancer } from './llm/index.js';
export type { GenerationOptions, GenerationResult, LLMServiceOptions, EnhancementOptions, EnhancementResult } from './llm/index.js';

// Export utilities
export { logger, Logger, LogLevel, createLogger } from './utils/logger.js';
export * from './utils/helpers.js';

// Main API (to be implemented in later phases)
// export { DocGen } from './docgen.js';
