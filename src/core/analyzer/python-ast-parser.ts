/**
 * Python AST Parser - TypeScript Wrapper
 *
 * Manages Python subprocess for AST parsing and provides a TypeScript-friendly interface.
 * Uses Python's built-in ast module via subprocess to parse Python source files.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FileNode } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Python AST parse result
 */
export interface PythonParsedAST {
  filePath: string;
  sourceCode: string;
  ast: PythonASTResult;
  success: boolean;
  error?: {
    type: string;
    message: string;
    lineno?: number;
  };
}

/**
 * Python AST structure returned from Python parser
 */
export interface PythonASTResult {
  success: boolean;
  file_path: string;
  module_docstring?: string | null;
  functions: PythonFunctionNode[];
  classes: PythonClassNode[];
  variables: PythonVariableNode[];
  imports: PythonImportNode[];
  error?: string;
  message?: string;
  lineno?: number;
}

export interface PythonFunctionNode {
  type: 'function' | 'async_function';
  name: string;
  lineno: number;
  end_lineno: number;
  decorators: string[];
  parameters: PythonParameter[];
  returns?: string | null;
  docstring?: string | null;
  is_async: boolean;
  is_static?: boolean;
  is_class_method?: boolean;
}

export interface PythonClassNode {
  type: 'class';
  name: string;
  lineno: number;
  end_lineno: number;
  bases: string[];
  decorators: string[];
  methods: PythonFunctionNode[];
  properties: PythonFunctionNode[];
  class_vars: PythonClassVar[];
  docstring?: string | null;
}

export interface PythonParameter {
  name: string;
  type?: string | null;
  optional: boolean;
  default?: string | null;
  is_var_args?: boolean;
  is_kw_args?: boolean;
}

export interface PythonVariableNode {
  type: 'variable';
  name: string;
  lineno: number;
  type_annotation?: string | null;
  value?: string | null;
}

export interface PythonClassVar {
  name: string;
  type?: string | null;
  value?: string | null;
}

export interface PythonImportNode {
  type: 'import' | 'from';
  module?: string | null;
  alias?: string | null;
  from?: string | null;
  names?: string[];
  level?: number;
}

/**
 * PythonASTParser - Bridge to Python AST parser subprocess
 */
export class PythonASTParser {
  private pythonExecutable: string;
  private parserScriptPath: string;

  constructor(pythonExecutable = 'python3') {
    this.pythonExecutable = pythonExecutable;
    // In production (dist/), the Python script is in dist/python/ast_parser.py
    // In development (src/), use the source location
    // We can find the script by checking if we're running from dist or src
    const isDist = __dirname.includes('/dist/');
    if (isDist) {
      // Running from dist/cli/index.mjs or dist/index.mjs
      // Python script is in dist/python/ast_parser.py
      this.parserScriptPath = join(__dirname, '..', 'python', 'ast_parser.py');
    } else {
      // Running from source (development)
      this.parserScriptPath = join(__dirname, 'python', 'ast_parser.py');
    }
  }

  /**
   * Check if Python is available
   */
  async isPythonAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonExecutable, ['--version']);

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Parse a single Python file
   */
  async parseFile(file: FileNode): Promise<PythonParsedAST | null> {
    try {
      logger.debug(`Parsing Python file: ${file.relativePath}`);

      // Read source code
      const sourceCode = await fs.readFile(file.path, 'utf-8');

      // Call Python parser
      const astResult = await this.callPythonParser(file.path);

      if (!astResult.success) {
        logger.debug(`Python parse error in ${file.relativePath}: ${astResult.message || astResult.error}`);
        return {
          filePath: file.path,
          sourceCode,
          ast: astResult,
          success: false,
          error: {
            type: astResult.error || 'ParseError',
            message: astResult.message || 'Unknown error',
            lineno: astResult.lineno,
          },
        };
      }

      return {
        filePath: file.path,
        sourceCode,
        ast: astResult,
        success: true,
      };
    } catch (error) {
      logger.error(`Failed to parse Python file ${file.relativePath}:`);
      logger.debug(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Parse multiple Python files in batches
   */
  async parseFiles(files: FileNode[]): Promise<PythonParsedAST[]> {
    logger.info(`Parsing ${files.length} Python files...`);

    const results: PythonParsedAST[] = [];

    // Check Python availability first
    const available = await this.isPythonAvailable();
    if (!available) {
      logger.error('Python interpreter not available. Please install Python 3.8+ and ensure it\'s in PATH.');
      return [];
    }

    // Parse files in batches to avoid overwhelming the system
    const batchSize = 20;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((file) => this.parseFile(file))
      );

      // Filter out nulls
      results.push(
        ...batchResults.filter((result): result is PythonParsedAST => result !== null)
      );

      logger.debug(`Parsed ${results.length}/${files.length} Python files`);
    }

    const successCount = results.filter(r => r.success).length;
    logger.success(`Parsed ${successCount}/${files.length} Python files successfully`);

    return results;
  }

  /**
   * Call Python parser subprocess
   */
  private async callPythonParser(filePath: string): Promise<PythonASTResult> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonExecutable, [this.parserScriptPath, filePath]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 && code !== 1) {
          // Code 1 is used for parse errors, which are handled gracefully
          logger.debug(`Python parser exited with code ${code}: ${stderr}`);
          resolve({
            success: false,
            file_path: filePath,
            error: 'ProcessError',
            message: stderr || 'Python parser process failed',
            functions: [],
            classes: [],
            variables: [],
            imports: [],
          });
          return;
        }

        try {
          const result = JSON.parse(stdout) as PythonASTResult;
          resolve(result);
        } catch (error) {
          logger.error(`Failed to parse Python parser output for ${filePath}`);
          logger.debug(`stdout: ${stdout}`);
          logger.debug(`stderr: ${stderr}`);
          reject(new Error(`Failed to parse Python parser output: ${error}`));
        }
      });

      proc.on('error', (error) => {
        logger.error(`Failed to spawn Python process: ${error.message}`);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Python parser timeout for ${filePath}`));
      }, 30000);
    });
  }

  /**
   * Get visibility from Python naming conventions
   */
  getVisibility(name: string): 'public' | 'protected' | 'private' {
    if (name.startsWith('__') && !name.endsWith('__')) {
      return 'private';
    }
    if (name.startsWith('_')) {
      return 'protected';
    }
    return 'public';
  }

  /**
   * Check if a symbol is exported (Python convention)
   */
  isExported(name: string): boolean {
    // In Python, anything not starting with _ is considered public/exported
    return !name.startsWith('_');
  }
}

/**
 * Parse a single Python file (convenience function)
 */
export async function parsePythonFile(
  file: FileNode
): Promise<PythonParsedAST | null> {
  const parser = new PythonASTParser();
  return parser.parseFile(file);
}

/**
 * Parse multiple Python files (convenience function)
 */
export async function parsePythonFiles(files: FileNode[]): Promise<PythonParsedAST[]> {
  const parser = new PythonASTParser();
  return parser.parseFiles(files);
}
