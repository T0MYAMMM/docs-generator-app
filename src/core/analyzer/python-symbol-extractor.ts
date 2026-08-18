/**
 * Python Symbol Extractor
 *
 * Transforms Python AST data into the common Symbol format used throughout
 * the documentation generator. Handles Python-specific features like decorators,
 * type hints, and naming conventions.
 */

import {
  PythonParsedAST,
  PythonFunctionNode,
  PythonClassNode,
  PythonVariableNode,
} from './python-ast-parser.js';
import {
  Symbol as DocSymbol,
  TypeDefinition,
  Parameter,
  ReturnType,
  Visibility,
} from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Result of symbol extraction
 */
export interface ExtractionResult {
  symbols: DocSymbol[];
  types: TypeDefinition[];
  count: number;
}

/**
 * Python Symbol Extractor
 *
 * Extracts symbols from parsed Python AST and converts them to
 * the common Symbol format.
 */
export class PythonSymbolExtractor {
  private symbolCounter = 0;

  /**
   * Extract symbols from a single parsed Python file
   */
  extract(parsed: PythonParsedAST): ExtractionResult {
    logger.debug(`Extracting symbols from ${parsed.filePath}`);

    const symbols: DocSymbol[] = [];
    const types: TypeDefinition[] = [];

    if (!parsed.success || !parsed.ast) {
      logger.debug(`Skipping extraction for ${parsed.filePath} - parse failed`);
      return { symbols, types, count: 0 };
    }

    const { ast, filePath } = parsed;

    // Extract module-level functions
    for (const func of ast.functions) {
      const symbol = this.extractFunction(func, filePath);
      if (symbol) symbols.push(symbol);
    }

    // Extract classes and their methods
    for (const cls of ast.classes) {
      // Extract the class itself
      const classSymbol = this.extractClass(cls, filePath);
      if (classSymbol) symbols.push(classSymbol);

      // Extract methods as separate symbols
      for (const method of cls.methods) {
        const methodSymbol = this.extractMethod(method, cls.name, filePath);
        if (methodSymbol) symbols.push(methodSymbol);
      }

      // Extract properties as separate symbols
      for (const prop of cls.properties) {
        const propSymbol = this.extractProperty(prop, cls.name, filePath);
        if (propSymbol) symbols.push(propSymbol);
      }
    }

    // Extract module-level variables
    for (const variable of ast.variables) {
      const symbol = this.extractVariable(variable, filePath);
      if (symbol) symbols.push(symbol);
    }

    logger.debug(`Extracted ${symbols.length} symbols from ${filePath}`);

    return {
      symbols,
      types,
      count: symbols.length + types.length,
    };
  }

  /**
   * Extract symbols from multiple parsed files
   */
  extractBatch(parsedFiles: PythonParsedAST[]): ExtractionResult {
    logger.info(`Extracting symbols from ${parsedFiles.length} Python files...`);

    const allSymbols: DocSymbol[] = [];
    const allTypes: TypeDefinition[] = [];

    for (const parsed of parsedFiles) {
      const result = this.extract(parsed);
      allSymbols.push(...result.symbols);
      allTypes.push(...result.types);
    }

    logger.success(`Extracted ${allSymbols.length} symbols and ${allTypes.length} types`);

    return {
      symbols: allSymbols,
      types: allTypes,
      count: allSymbols.length + allTypes.length,
    };
  }

  /**
   * Extract a function symbol
   */
  private extractFunction(
    node: PythonFunctionNode,
    filePath: string
  ): DocSymbol | null {
    const id = this.generateId(filePath, node.name);

    // Convert Python parameters to DocGen Parameter format
    const parameters: Parameter[] = node.parameters.map((p) => ({
      name: p.name,
      type: p.type || undefined,
      optional: p.optional,
      defaultValue: p.default || undefined,
      description: undefined, // Will be filled by docstring parser
      isVarArgs: p.is_var_args,
      isKwArgs: p.is_kw_args,
    }));

    // Return type
    const returnType: ReturnType | undefined = node.returns
      ? { type: node.returns }
      : undefined;

    // Build tags
    const tags: Record<string, string> = {};
    if (node.is_async) tags.async = 'true';
    if (node.decorators.length > 0) tags.decorators = node.decorators.join(', ');

    return {
      id,
      name: node.name,
      type: 'function',
      filePath,
      line: node.lineno,
      endLine: node.end_lineno,
      visibility: this.getVisibility(node.name),
      exported: this.isExported(node.name),
      parameters,
      returnType,
      comment: node.docstring || undefined,
      tags,
    };
  }

  /**
   * Extract a class symbol
   */
  private extractClass(
    node: PythonClassNode,
    filePath: string
  ): DocSymbol | null {
    const id = this.generateId(filePath, node.name);

    // Build tags
    const tags: Record<string, string> = {};
    if (node.decorators.length > 0) tags.decorators = node.decorators.join(', ');
    if (node.bases.length > 0) tags.bases = node.bases.join(', ');

    // Count methods and properties
    tags.methods = node.methods.length.toString();
    tags.properties = node.properties.length.toString();

    return {
      id,
      name: node.name,
      type: 'class',
      filePath,
      line: node.lineno,
      endLine: node.end_lineno,
      visibility: this.getVisibility(node.name),
      exported: this.isExported(node.name),
      extends: node.bases.length > 0 ? node.bases[0] : undefined,
      implements: node.bases.length > 1 ? node.bases.slice(1) : undefined,
      comment: node.docstring || undefined,
      tags,
    };
  }

  /**
   * Extract a method symbol (function within a class)
   */
  private extractMethod(
    node: PythonFunctionNode,
    className: string,
    filePath: string
  ): DocSymbol | null {
    const id = this.generateId(filePath, `${className}.${node.name}`);

    // Convert Python parameters to DocGen Parameter format
    // Skip 'self' or 'cls' first parameter for instance/class methods
    const pythonParams = node.parameters;
    const filteredParams =
      pythonParams.length > 0 &&
      (pythonParams[0]?.name === 'self' || pythonParams[0]?.name === 'cls')
        ? pythonParams.slice(1)
        : pythonParams;

    const parameters: Parameter[] = filteredParams.map((p) => ({
      name: p.name,
      type: p.type || undefined,
      optional: p.optional,
      defaultValue: p.default || undefined,
      description: undefined,
      isVarArgs: p.is_var_args,
      isKwArgs: p.is_kw_args,
    }));

    // Return type
    const returnType: ReturnType | undefined = node.returns
      ? { type: node.returns }
      : undefined;

    // Build tags
    const tags: Record<string, string> = {
      class: className,
    };
    if (node.is_async) tags.async = 'true';
    if (node.is_static) tags.static = 'true';
    if (node.is_class_method) tags.classmethod = 'true';
    if (node.decorators.length > 0) tags.decorators = node.decorators.join(', ');

    return {
      id,
      name: `${className}.${node.name}`,
      type: 'method',
      filePath,
      line: node.lineno,
      endLine: node.end_lineno,
      visibility: this.getVisibility(node.name),
      exported: this.isExported(node.name),
      parameters,
      returnType,
      comment: node.docstring || undefined,
      tags,
    };
  }

  /**
   * Extract a property symbol
   */
  private extractProperty(
    node: PythonFunctionNode,
    className: string,
    filePath: string
  ): DocSymbol | null {
    const id = this.generateId(filePath, `${className}.${node.name}`);

    // Return type
    const returnType: ReturnType | undefined = node.returns
      ? { type: node.returns }
      : undefined;

    // Build tags
    const tags: Record<string, string> = {
      class: className,
      property: 'true',
    };
    if (node.decorators.length > 0) tags.decorators = node.decorators.join(', ');

    return {
      id,
      name: `${className}.${node.name}`,
      type: 'property',
      filePath,
      line: node.lineno,
      endLine: node.end_lineno,
      visibility: this.getVisibility(node.name),
      exported: this.isExported(node.name),
      returnType,
      comment: node.docstring || undefined,
      tags,
    };
  }

  /**
   * Extract a variable symbol
   */
  private extractVariable(
    node: PythonVariableNode,
    filePath: string
  ): DocSymbol | null {
    const id = this.generateId(filePath, node.name);

    // Determine if it's a constant (all caps) or variable
    const isConstant = node.name === node.name.toUpperCase() && node.name.length > 1;

    // Build tags
    const tags: Record<string, string> = {};
    if (node.type_annotation) tags.type_annotation = node.type_annotation;
    if (node.value) tags.value = node.value;

    return {
      id,
      name: node.name,
      type: isConstant ? 'constant' : 'variable',
      filePath,
      line: node.lineno,
      endLine: node.lineno,
      visibility: this.getVisibility(node.name),
      exported: this.isExported(node.name),
      comment: undefined,
      tags,
    };
  }

  /**
   * Get visibility from Python naming conventions
   */
  private getVisibility(name: string): Visibility {
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
  private isExported(name: string): boolean {
    // In Python, anything not starting with _ is considered public/exported
    // Special methods like __init__ are not considered exported
    if (name.startsWith('__') && name.endsWith('__')) {
      return false; // Magic methods are not exported
    }
    return !name.startsWith('_');
  }

  /**
   * Generate a unique symbol ID
   */
  private generateId(filePath: string, name: string): string {
    const counter = this.symbolCounter++;
    const fileHash = filePath.split('/').pop()?.replace(/\.py$/, '') || 'unknown';
    return `py-${fileHash}-${name}-${counter}`;
  }

  /**
   * Get statistics about extracted symbols
   */
  getStatistics(result: ExtractionResult): {
    totalSymbols: number;
    byType: Record<string, number>;
    exported: number;
    withComments: number;
  } {
    const byType: Record<string, number> = {};

    for (const symbol of result.symbols) {
      byType[symbol.type] = (byType[symbol.type] || 0) + 1;
    }

    const exported = result.symbols.filter((s) => s.exported).length;
    const withComments = result.symbols.filter((s) => s.comment).length;

    return {
      totalSymbols: result.symbols.length,
      byType,
      exported,
      withComments,
    };
  }
}
