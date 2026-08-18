/**
 * Analyzer - Main orchestrator for code analysis
 *
 * Combines AST parsing, symbol extraction, comment parsing, and pattern detection
 * to provide a complete analysis of a codebase.
 */

import { FileNode, ProjectAnalysis, AnalysisResult, ProjectMetadata, DetectedPattern } from '../../types/index.js';
import { ASTParser } from './ast-parser.js';
import { SymbolExtractor } from './symbol-extractor.js';
import { CommentParser } from './comment-parser.js';
import { PatternDetector } from './pattern-detector.js';
import { DocEnhancer } from '../../llm/doc-enhancer.js';
import { PythonASTParser } from './python-ast-parser.js';
import { PythonSymbolExtractor } from './python-symbol-extractor.js';
import { PythonDocstringParser } from './python-docstring-parser.js';
import { AirflowPatternDetector } from './airflow-pattern-detector.js';
import { PythonFrameworkDetector } from './python-framework-detector.js';
import { logger } from '../../utils/logger.js';

/**
 * Analyzer options
 */
export interface AnalyzerOptions {
  /** Whether to use type checker (slower but more accurate) */
  useTypeChecker?: boolean;

  /** Whether to extract comments */
  extractComments?: boolean;

  /** Whether to detect patterns */
  detectPatterns?: boolean;

  /** Whether to enhance with LLM (requires Ollama) */
  enhanceWithLLM?: boolean;

  /** LLM model to use (default: codellama:latest) */
  llmModel?: string;

  /** Only enhance exported symbols */
  llmExportedOnly?: boolean;
}

/**
 * Analyzer class for analyzing source code
 */
export class Analyzer {
  private parser: ASTParser;
  private extractor: SymbolExtractor;
  private commentParser: CommentParser;
  private patternDetector: PatternDetector;
  private pythonParser: PythonASTParser;
  private pythonExtractor: PythonSymbolExtractor;
  private pythonDocstringParser: PythonDocstringParser;
  private airflowPatternDetector: AirflowPatternDetector;
  private pythonFrameworkDetector: PythonFrameworkDetector;
  private options: Required<AnalyzerOptions>;

  constructor(options: AnalyzerOptions = {}) {
    this.parser = new ASTParser();
    this.extractor = new SymbolExtractor();
    this.commentParser = new CommentParser();
    this.patternDetector = new PatternDetector();
    this.pythonParser = new PythonASTParser();
    this.pythonExtractor = new PythonSymbolExtractor();
    this.pythonDocstringParser = new PythonDocstringParser();
    this.airflowPatternDetector = new AirflowPatternDetector();
    this.pythonFrameworkDetector = new PythonFrameworkDetector();

    this.options = {
      useTypeChecker: false, // Disabled for Phase 2 simplicity
      extractComments: true,
      detectPatterns: true,
      enhanceWithLLM: false,
      llmModel: 'codellama:latest',
      llmExportedOnly: true,
      ...options,
    };
  }

  /**
   * Analyze source files
   */
  async analyze(
    files: FileNode[],
    projectMetadata: Partial<ProjectMetadata>
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    logger.info(`Analyzing ${files.length} files...`);

    try {
      // Separate Python files from TS/JS files
      const pythonFiles = files.filter((f) => f.language === 'python');
      const tsJsFiles = files.filter(
        (f) => f.language === 'typescript' || f.language === 'javascript'
      );

      logger.info(
        `Processing ${tsJsFiles.length} TS/JS files and ${pythonFiles.length} Python files...`
      );

      // Step 1: Parse files into ASTs
      logger.info('Step 1/4: Parsing files...');

      // Parse TypeScript/JavaScript files
      const parsedFiles = tsJsFiles.length > 0
        ? await this.parser.parseFiles(tsJsFiles)
        : [];

      // Parse Python files
      const parsedPythonFiles = pythonFiles.length > 0
        ? await this.pythonParser.parseFiles(pythonFiles)
        : [];

      const totalParsed = parsedFiles.length + parsedPythonFiles.length;

      if (totalParsed === 0) {
        throw new Error('No files were successfully parsed');
      }

      logger.success(
        `Parsed ${parsedFiles.length} TS/JS files and ${parsedPythonFiles.length} Python files`
      );

      // Step 2: Extract symbols
      logger.info('Step 2/4: Extracting symbols...');

      // Extract symbols from TypeScript/JavaScript
      const tsJsExtraction = parsedFiles.length > 0
        ? this.extractor.extractBatch(parsedFiles)
        : { symbols: [], types: [], count: 0 };

      // Extract symbols from Python
      const pythonExtraction = parsedPythonFiles.length > 0
        ? this.pythonExtractor.extractBatch(parsedPythonFiles)
        : { symbols: [], types: [], count: 0 };

      // Attach docstrings to Python symbols
      const pythonSymbolsWithDocs = pythonExtraction.symbols.length > 0
        ? this.pythonDocstringParser.attachDocstrings(pythonExtraction.symbols)
        : [];

      // Merge symbols from both languages
      const allSymbols = [...tsJsExtraction.symbols, ...pythonSymbolsWithDocs];
      const allTypes = [...tsJsExtraction.types, ...pythonExtraction.types];

      logger.success(
        `Extracted ${allSymbols.length} symbols (${tsJsExtraction.symbols.length} TS/JS, ${pythonSymbolsWithDocs.length} Python) and ${allTypes.length} types`
      );

      // Create combined extraction result for downstream use
      const extractionResult = {
        symbols: allSymbols,
        types: allTypes,
        count: allSymbols.length + allTypes.length,
      };

      // Step 3: Attach comments to symbols
      let symbolsWithComments = extractionResult.symbols;

      if (this.options.extractComments && parsedFiles.length > 0) {
        logger.info('Step 3/4: Extracting comments for TS/JS files...');

        // Group TS/JS symbols by file
        const tsJsSymbols = tsJsExtraction.symbols;
        const symbolsByFile = new Map<string, typeof tsJsSymbols>();
        for (const symbol of tsJsSymbols) {
          const existing = symbolsByFile.get(symbol.filePath) || [];
          existing.push(symbol);
          symbolsByFile.set(symbol.filePath, existing);
        }

        // Attach comments to TS/JS symbols
        const tsJsSymbolsWithComments = [];
        for (const parsed of parsedFiles) {
          const fileSymbols = symbolsByFile.get(parsed.filePath) || [];
          const withComments = this.commentParser.attachComments(parsed, fileSymbols);
          tsJsSymbolsWithComments.push(...withComments);
        }

        // Merge TS/JS symbols with comments and Python symbols with docstrings
        symbolsWithComments = [...tsJsSymbolsWithComments, ...pythonSymbolsWithDocs];

        const commentsCount = symbolsWithComments.filter((s) => s.comment).length;
        logger.success(`Attached comments/docstrings to ${commentsCount} symbols`);
      } else {
        logger.info('Step 3/4: Skipping comment extraction');
      }

      // Step 4: Detect patterns
      let patterns: DetectedPattern[] = [];

      if (this.options.detectPatterns) {
        logger.info('Step 4/4: Detecting patterns...');

        // Group symbols by file
        const symbolsByFile = new Map<string, typeof symbolsWithComments>();
        for (const symbol of symbolsWithComments) {
          const existing = symbolsByFile.get(symbol.filePath) || [];
          existing.push(symbol);
          symbolsByFile.set(symbol.filePath, existing);
        }

        // Run pattern detection on TS/JS files
        const patternResult = parsedFiles.length > 0
          ? this.patternDetector.detectBatch(parsedFiles, symbolsByFile)
          : { patterns: [], symbols: symbolsWithComments };

        patterns = patternResult.patterns;
        symbolsWithComments = patternResult.symbols;

        // Run Python framework pattern detection
        if (parsedPythonFiles.length > 0) {
          const pythonPatterns = this.pythonFrameworkDetector.detectBatch(
            parsedPythonFiles,
            symbolsByFile
          );
          patterns.push(...pythonPatterns);

          // Run Airflow-specific pattern detection
          const airflowResult = this.airflowPatternDetector.detectBatch(
            parsedPythonFiles,
            symbolsByFile
          );
          patterns.push(...airflowResult.patterns);

          // Log DAG metadata if detected
          if (airflowResult.dagMetadata.size > 0) {
            logger.info(`Detected ${airflowResult.dagMetadata.size} Airflow DAGs`);
          }
        }

        logger.success(`Detected ${patterns.length} patterns`);
      } else {
        logger.info('Step 4/4: Skipping pattern detection');
      }

      // Step 5: Enhance with LLM (optional)
      let enhancedSymbols = symbolsWithComments;
      let enhancedTypes = extractionResult.types;

      if (this.options.enhanceWithLLM) {
        logger.info('Step 5/5: Enhancing with LLM...');

        try {
          const enhancer = new DocEnhancer(
            {
              model: this.options.llmModel,
            },
            {
              exportedOnly: this.options.llmExportedOnly,
              skipExisting: true,
              model: this.options.llmModel,
            }
          );

          // Check if LLM is ready
          const isReady = await enhancer.isReady();

          if (!isReady) {
            logger.warn('LLM is not ready. Skipping enhancement.');
            logger.info(
              `Make sure Ollama is running and model ${this.options.llmModel} is available`
            );
          } else {
            // Enhance symbols and types
            const { symbols: llmSymbols } = await enhancer.enhanceSymbols(
              symbolsWithComments
            );
            const llmTypes = await enhancer.enhanceTypes(extractionResult.types);

            enhancedSymbols = llmSymbols;
            enhancedTypes = llmTypes;

            const llmEnhanced = llmSymbols.filter(
              (s) => s.tags?.['ai-generated'] === 'true'
            ).length;

            logger.success(`Enhanced ${llmEnhanced} symbols with LLM`);
          }
        } catch (error) {
          logger.error('LLM enhancement failed');
          logger.debug(error instanceof Error ? error.message : String(error));
          logger.warn('Continuing without LLM enhancement');
        }
      }

      // Build final analysis result
      const analysis: ProjectAnalysis = {
        symbols: enhancedSymbols,
        types: enhancedTypes,
        dependencies: [], // TODO: Implement dependency extraction in future
        patterns,
        project: {
          name: projectMetadata.name || 'unknown-project',
          path: projectMetadata.path || '',
          type: projectMetadata.type || 'none',
          dependencies: projectMetadata.dependencies || {},
          tsConfig: projectMetadata.tsConfig,
          fileCount: files.length,
          symbolCount: symbolsWithComments.length,
        },
      };

      const duration = Date.now() - startTime;

      logger.success(`Analysis complete in ${duration}ms`);

      return {
        analysis,
        duration,
        errors: [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Analysis failed');
      logger.errorWithStack('Error:', error as Error);

      return {
        analysis: {
          symbols: [],
          types: [],
          dependencies: [],
          patterns: [],
          project: {
            name: projectMetadata.name || 'unknown-project',
            path: projectMetadata.path || '',
            type: projectMetadata.type || 'none',
            dependencies: {},
            fileCount: 0,
            symbolCount: 0,
          },
        },
        duration,
        errors: [error as Error],
      };
    }
  }

  /**
   * Get statistics from analysis result
   */
  getStatistics(result: AnalysisResult): {
    totalSymbols: number;
    byType: Record<string, number>;
    withComments: number;
    exported: number;
  } {
    const { symbols } = result.analysis;

    const byType: Record<string, number> = {};
    let withComments = 0;
    let exported = 0;

    for (const symbol of symbols) {
      // Count by type
      byType[symbol.type] = (byType[symbol.type] || 0) + 1;

      // Count with comments
      if (symbol.comment) {
        withComments++;
      }

      // Count exported
      if (symbol.exported) {
        exported++;
      }
    }

    return {
      totalSymbols: symbols.length,
      byType,
      withComments,
      exported,
    };
  }
}

/**
 * Analyze source files
 *
 * Convenience function for simple use cases.
 */
export async function analyzeFiles(
  files: FileNode[],
  projectMetadata: Partial<ProjectMetadata>
): Promise<AnalysisResult> {
  const analyzer = new Analyzer();
  return analyzer.analyze(files, projectMetadata);
}

// Export sub-modules
export { ASTParser, ParsedAST } from './ast-parser.js';
export { SymbolExtractor } from './symbol-extractor.js';
export { CommentParser } from './comment-parser.js';
export { PatternDetector } from './pattern-detector.js';
export { PythonASTParser } from './python-ast-parser.js';
export { PythonSymbolExtractor } from './python-symbol-extractor.js';
export { PythonDocstringParser } from './python-docstring-parser.js';
export { AirflowPatternDetector } from './airflow-pattern-detector.js';
export { PythonFrameworkDetector } from './python-framework-detector.js';
