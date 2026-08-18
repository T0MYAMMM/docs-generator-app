/**
 * AST Parser - Abstract Syntax Tree parser
 *
 * Parses TypeScript and JavaScript files into ASTs using the TypeScript Compiler API.
 * This is the foundation for all code analysis.
 */

import * as ts from 'typescript';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger.js';
import { FileNode } from '../../types/index.js';

/**
 * Parsed AST result
 */
export interface ParsedAST {
  /** File path */
  filePath: string;

  /** Source file object from TypeScript */
  sourceFile: ts.SourceFile;

  /** Raw source code */
  sourceCode: string;

  /** Type checker (if available) */
  typeChecker?: ts.TypeChecker;

  /** Diagnostics/errors */
  diagnostics: ts.Diagnostic[];
}

/**
 * Parser options
 */
export interface ParserOptions {
  /** Whether to create a type checker */
  includeTypeChecker?: boolean;

  /** TypeScript compiler options */
  compilerOptions?: ts.CompilerOptions;
}

/**
 * ASTParser class for parsing source files
 */
export class ASTParser {
  private compilerOptions: ts.CompilerOptions;

  constructor(options: ParserOptions = {}) {
    // Default compiler options
    this.compilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      strict: false, // Don't enforce strict checking for parsing
      noEmit: true,
      skipLibCheck: true,
      ...options.compilerOptions,
    };
  }

  /**
   * Parse a single file
   */
  async parseFile(file: FileNode): Promise<ParsedAST | null> {
    try {
      logger.debug(`Parsing file: ${file.relativePath}`);

      // Read source code
      const sourceCode = await fs.readFile(file.path, 'utf-8');

      // Create source file
      const sourceFile = ts.createSourceFile(
        file.path,
        sourceCode,
        ts.ScriptTarget.Latest,
        true, // setParentNodes - needed for navigation
        this.getScriptKind(file.type)
      );

      // Get diagnostics (syntax errors)
      const diagnostics = this.getDiagnostics(sourceFile);

      if (diagnostics.length > 0) {
        logger.debug(
          `Found ${diagnostics.length} diagnostic(s) in ${file.relativePath}`
        );
      }

      return {
        filePath: file.path,
        sourceFile,
        sourceCode,
        diagnostics,
      };
    } catch (error) {
      logger.error(`Failed to parse ${file.relativePath}:`);
      logger.debug(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Parse multiple files
   */
  async parseFiles(files: FileNode[]): Promise<ParsedAST[]> {
    logger.info(`Parsing ${files.length} files...`);

    const results: ParsedAST[] = [];

    // Parse files in batches to avoid overwhelming memory
    const batchSize = 20;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((file) => this.parseFile(file))
      );

      // Filter out nulls and add to results
      results.push(
        ...batchResults.filter((result): result is ParsedAST => result !== null)
      );

      logger.debug(`Parsed ${results.length}/${files.length} files`);
    }

    logger.success(`Parsed ${results.length} files successfully`);

    return results;
  }

  /**
   * Create a program with type checker for multiple files
   */
  createProgram(files: FileNode[]): {
    program: ts.Program;
    typeChecker: ts.TypeChecker;
  } {
    logger.debug('Creating TypeScript program with type checker...');

    // Create program
    const program = ts.createProgram({
      rootNames: files.map((f) => f.path),
      options: this.compilerOptions,
    });

    // Get type checker
    const typeChecker = program.getTypeChecker();

    logger.debug('TypeScript program created');

    return { program, typeChecker };
  }

  /**
   * Parse files with type checker
   */
  async parseWithTypeChecker(files: FileNode[]): Promise<{
    parsedFiles: ParsedAST[];
    typeChecker: ts.TypeChecker;
  }> {
    logger.info('Parsing with type checker...');

    // Create program
    const { program, typeChecker } = this.createProgram(files);

    // Get all source files
    const parsedFiles: ParsedAST[] = [];

    for (const file of files) {
      const sourceFile = program.getSourceFile(file.path);

      if (!sourceFile) {
        logger.warn(`Could not get source file for ${file.relativePath}`);
        continue;
      }

      // Read source code
      const sourceCode = await fs.readFile(file.path, 'utf-8');

      // Get diagnostics
      const diagnostics = [
        ...program.getSyntacticDiagnostics(sourceFile),
        ...program.getSemanticDiagnostics(sourceFile),
      ];

      parsedFiles.push({
        filePath: file.path,
        sourceFile,
        sourceCode,
        typeChecker,
        diagnostics,
      });
    }

    logger.success(`Parsed ${parsedFiles.length} files with type checker`);

    return { parsedFiles, typeChecker };
  }

  /**
   * Get script kind based on file type
   */
  private getScriptKind(fileType: string): ts.ScriptKind {
    switch (fileType) {
      case 'typescript':
        return ts.ScriptKind.TS;
      case 'typescript-jsx':
        return ts.ScriptKind.TSX;
      case 'javascript':
        return ts.ScriptKind.JS;
      case 'javascript-jsx':
        return ts.ScriptKind.JSX;
      default:
        return ts.ScriptKind.TS;
    }
  }

  /**
   * Get syntax diagnostics for a source file
   */
  private getDiagnostics(_sourceFile: ts.SourceFile): ts.Diagnostic[] {
    // For single file parsing without a program, we can't easily get diagnostics
    // Diagnostics are better obtained through a Program (see parseWithTypeChecker)
    // Return empty array for now - syntax errors will still be caught during parsing
    return [];
  }

  /**
   * Visit all nodes in an AST
   */
  visitNodes(
    node: ts.Node,
    visitor: (node: ts.Node) => void | boolean
  ): void {
    // Call visitor on current node
    const shouldContinue = visitor(node);

    // If visitor returns false, stop traversal
    if (shouldContinue === false) {
      return;
    }

    // Recursively visit children
    ts.forEachChild(node, (child) => this.visitNodes(child, visitor));
  }

  /**
   * Find nodes of a specific kind
   */
  findNodesOfKind<T extends ts.Node>(
    sourceFile: ts.SourceFile,
    kind: ts.SyntaxKind
  ): T[] {
    const nodes: T[] = [];

    this.visitNodes(sourceFile, (node) => {
      if (node.kind === kind) {
        nodes.push(node as T);
      }
    });

    return nodes;
  }

  /**
   * Find all function declarations
   */
  findFunctions(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
    return this.findNodesOfKind<ts.FunctionDeclaration>(
      sourceFile,
      ts.SyntaxKind.FunctionDeclaration
    );
  }

  /**
   * Find all class declarations
   */
  findClasses(sourceFile: ts.SourceFile): ts.ClassDeclaration[] {
    return this.findNodesOfKind<ts.ClassDeclaration>(
      sourceFile,
      ts.SyntaxKind.ClassDeclaration
    );
  }

  /**
   * Find all interface declarations
   */
  findInterfaces(sourceFile: ts.SourceFile): ts.InterfaceDeclaration[] {
    return this.findNodesOfKind<ts.InterfaceDeclaration>(
      sourceFile,
      ts.SyntaxKind.InterfaceDeclaration
    );
  }

  /**
   * Find all type alias declarations
   */
  findTypeAliases(sourceFile: ts.SourceFile): ts.TypeAliasDeclaration[] {
    return this.findNodesOfKind<ts.TypeAliasDeclaration>(
      sourceFile,
      ts.SyntaxKind.TypeAliasDeclaration
    );
  }

  /**
   * Find all variable statements
   */
  findVariables(sourceFile: ts.SourceFile): ts.VariableStatement[] {
    return this.findNodesOfKind<ts.VariableStatement>(
      sourceFile,
      ts.SyntaxKind.VariableStatement
    );
  }

  /**
   * Find all export declarations
   */
  findExports(sourceFile: ts.SourceFile): ts.ExportDeclaration[] {
    return this.findNodesOfKind<ts.ExportDeclaration>(
      sourceFile,
      ts.SyntaxKind.ExportDeclaration
    );
  }

  /**
   * Check if a node has an export modifier
   */
  isExported(node: ts.Node): boolean {
    // Use TypeScript utility to safely get modifiers
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (!modifiers) {
        return false;
      }
      return modifiers.some(
        (modifier: ts.Modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      );
    }
    return false;
  }

  /**
   * Check if a node has a default export modifier
   */
  isDefaultExport(node: ts.Node): boolean {
    // Use TypeScript utility to safely get modifiers
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (!modifiers) {
        return false;
      }
      return modifiers.some(
        (modifier: ts.Modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
      );
    }
    return false;
  }

  /**
   * Get the text of a node
   */
  getNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
    return node.getText(sourceFile);
  }

  /**
   * Get the name of a named declaration
   */
  getNodeName(node: ts.NamedDeclaration): string | undefined {
    if (!node.name) {
      return undefined;
    }

    if (ts.isIdentifier(node.name)) {
      return node.name.text;
    }

    return undefined;
  }

  /**
   * Get line and column from position
   */
  getLineAndColumn(
    sourceFile: ts.SourceFile,
    pos: number
  ): { line: number; column: number } {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
    return { line: line + 1, column: character + 1 }; // 1-indexed
  }
}

/**
 * Parse a single file
 *
 * Convenience function for simple use cases.
 */
export async function parseFile(file: FileNode): Promise<ParsedAST | null> {
  const parser = new ASTParser();
  return parser.parseFile(file);
}

/**
 * Parse multiple files
 *
 * Convenience function for batch parsing.
 */
export async function parseFiles(files: FileNode[]): Promise<ParsedAST[]> {
  const parser = new ASTParser();
  return parser.parseFiles(files);
}
