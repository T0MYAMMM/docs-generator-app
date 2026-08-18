/**
 * Symbol Extractor - Extract symbols from AST
 *
 * Extracts functions, classes, interfaces, types, and variables from parsed ASTs.
 * This is the core of code analysis.
 */

import * as ts from 'typescript';
import { ParsedAST } from './ast-parser.js';
import {
  Symbol as DocSymbol,
  Visibility,
  Parameter,
  ReturnType,
  TypeDefinition,
} from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Symbol extraction result
 */
export interface ExtractionResult {
  /** Extracted symbols */
  symbols: DocSymbol[];

  /** Extracted type definitions */
  types: TypeDefinition[];

  /** Total symbols extracted */
  count: number;
}

/**
 * SymbolExtractor class for extracting code symbols
 */
export class SymbolExtractor {
  private symbolCounter = 0;

  /**
   * Extract symbols from a parsed file
   */
  extract(parsed: ParsedAST): ExtractionResult {
    logger.debug(`Extracting symbols from ${parsed.filePath}`);

    const symbols: DocSymbol[] = [];
    const types: TypeDefinition[] = [];

    const { sourceFile, filePath } = parsed;

    // Visit all nodes and extract symbols
    ts.forEachChild(sourceFile, (node) => {
      // Extract functions
      if (ts.isFunctionDeclaration(node)) {
        const symbol = this.extractFunction(node, sourceFile, filePath);
        if (symbol) symbols.push(symbol);
      }

      // Extract classes
      else if (ts.isClassDeclaration(node)) {
        const symbol = this.extractClass(node, sourceFile, filePath);
        if (symbol) symbols.push(symbol);
      }

      // Extract interfaces
      else if (ts.isInterfaceDeclaration(node)) {
        const typeDef = this.extractInterface(node, sourceFile);
        if (typeDef) types.push(typeDef);
      }

      // Extract type aliases
      else if (ts.isTypeAliasDeclaration(node)) {
        const typeDef = this.extractTypeAlias(node, sourceFile);
        if (typeDef) types.push(typeDef);
      }

      // Extract variables (const, let, var)
      else if (ts.isVariableStatement(node)) {
        const extractedSymbols = this.extractVariables(node, sourceFile, filePath);
        symbols.push(...extractedSymbols);
      }

      // Extract arrow functions and function expressions
      else if (ts.isExpressionStatement(node)) {
        const extractedSymbols = this.extractExpressions(node, sourceFile, filePath);
        symbols.push(...extractedSymbols);
      }
    });

    logger.debug(`Extracted ${symbols.length} symbols and ${types.length} types`);

    return {
      symbols,
      types,
      count: symbols.length + types.length,
    };
  }

  /**
   * Extract symbols from multiple parsed files
   */
  extractBatch(parsedFiles: ParsedAST[]): ExtractionResult {
    logger.info(`Extracting symbols from ${parsedFiles.length} files...`);

    const allSymbols: DocSymbol[] = [];
    const allTypes: TypeDefinition[] = [];

    for (const parsed of parsedFiles) {
      const result = this.extract(parsed);
      allSymbols.push(...result.symbols);
      allTypes.push(...result.types);
    }

    logger.success(
      `Extracted ${allSymbols.length} symbols and ${allTypes.length} types`
    );

    return {
      symbols: allSymbols,
      types: allTypes,
      count: allSymbols.length + allTypes.length,
    };
  }

  /**
   * Extract a function declaration
   */
  private extractFunction(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DocSymbol | null {
    const name = node.name?.text;
    if (!name) return null;

    const id = this.generateId(filePath, name);
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

    // Extract parameters
    const parameters = this.extractParameters(node.parameters, sourceFile);

    // Extract return type
    const returnType = this.extractReturnType(node, sourceFile);

    // Check if exported
    const exported = this.isExported(node);

    return {
      id,
      name,
      type: 'function',
      filePath,
      line,
      endLine,
      visibility: this.getVisibility(node),
      exported,
      parameters,
      returnType,
      source: node.getText(sourceFile),
    };
  }

  /**
   * Extract a class declaration
   */
  private extractClass(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DocSymbol | null {
    const name = node.name?.text;
    if (!name) return null;

    const id = this.generateId(filePath, name);
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;

    // Extract heritage (extends/implements)
    const extendsClause = node.heritageClauses?.find(
      (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
    );
    const implementsClause = node.heritageClauses?.find(
      (clause) => clause.token === ts.SyntaxKind.ImplementsKeyword
    );

    const extendsClass = extendsClause?.types[0]?.getText(sourceFile);
    const implementsInterfaces = implementsClause?.types.map((type) =>
      type.getText(sourceFile)
    );

    // Check if exported
    const exported = this.isExported(node);

    return {
      id,
      name,
      type: 'class',
      filePath,
      line,
      endLine,
      visibility: this.getVisibility(node),
      exported,
      extends: extendsClass,
      implements: implementsInterfaces,
      source: node.getText(sourceFile),
    };
  }

  /**
   * Extract an interface declaration
   */
  private extractInterface(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): TypeDefinition {
    const name = node.name.text;
    const value = node.getText(sourceFile);

    // Extract properties
    const properties: Record<string, any> = {};

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = member.name.getText(sourceFile);
        const propType = member.type?.getText(sourceFile) || 'any';
        const optional = !!member.questionToken;

        properties[propName] = {
          type: propType,
          optional,
        };
      }
    }

    return {
      name,
      kind: 'interface',
      value,
      properties,
    };
  }

  /**
   * Extract a type alias declaration
   */
  private extractTypeAlias(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile
  ): TypeDefinition {
    const name = node.name.text;
    const value = node.type.getText(sourceFile);

    return {
      name,
      kind: 'type',
      value,
    };
  }

  /**
   * Extract variable declarations
   */
  private extractVariables(
    node: ts.VariableStatement,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DocSymbol[] {
    const symbols: DocSymbol[] = [];

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const name = declaration.name.text;
      const id = this.generateId(filePath, name);
      const line = sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(declaration.getEnd()).line + 1;

      // Check if it's a const
      const isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;

      // Check if exported
      const exported = this.isExported(node);

      // Check if it's a React component (function starting with capital letter)
      const isComponent = this.isReactComponent(declaration);

      symbols.push({
        id,
        name,
        type: isComponent ? 'component' : isConst ? 'constant' : 'variable',
        filePath,
        line,
        endLine,
        visibility: this.getVisibility(node),
        exported,
        source: declaration.getText(sourceFile),
      });
    }

    return symbols;
  }

  /**
   * Extract expressions (arrow functions, etc.)
   */
  private extractExpressions(
    _node: ts.ExpressionStatement,
    _sourceFile: ts.SourceFile,
    _filePath: string
  ): DocSymbol[] {
    // For now, just return empty - we'll expand this later if needed
    return [];
  }

  /**
   * Extract function parameters
   */
  private extractParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    sourceFile: ts.SourceFile
  ): Parameter[] {
    return parameters.map((param) => {
      const name = param.name.getText(sourceFile);
      const type = param.type?.getText(sourceFile);
      const optional = !!param.questionToken;
      const defaultValue = param.initializer?.getText(sourceFile);

      return {
        name,
        type,
        optional,
        defaultValue,
      };
    });
  }

  /**
   * Extract return type from a function
   */
  private extractReturnType(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): ReturnType | undefined {
    if (!node.type) return undefined;

    return {
      type: node.type.getText(sourceFile),
    };
  }

  /**
   * Check if a node is exported
   */
  private isExported(node: ts.Node): boolean {
    if (!('modifiers' in node) || !node.modifiers) {
      return false;
    }

    return (node.modifiers as readonly ts.Modifier[]).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  /**
   * Get visibility of a node
   */
  private getVisibility(node: ts.Node): Visibility {
    if (!('modifiers' in node) || !node.modifiers) {
      return 'public';
    }

    const modifiers = node.modifiers as readonly ts.Modifier[];

    if (modifiers.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)) {
      return 'private';
    }

    if (modifiers.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword)) {
      return 'protected';
    }

    return 'public';
  }

  /**
   * Check if a variable declaration is a React component
   */
  private isReactComponent(declaration: ts.VariableDeclaration): boolean {
    // Check if name starts with capital letter
    const name = declaration.name.getText();
    if (!/^[A-Z]/.test(name)) {
      return false;
    }

    // Check if initializer is an arrow function or function expression
    if (!declaration.initializer) {
      return false;
    }

    return (
      ts.isArrowFunction(declaration.initializer) ||
      ts.isFunctionExpression(declaration.initializer)
    );
  }

  /**
   * Generate a unique ID for a symbol
   */
  private generateId(filePath: string, name: string): string {
    const counter = this.symbolCounter++;
    const fileHash = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown';
    return `${fileHash}-${name}-${counter}`;
  }
}

/**
 * Extract symbols from parsed files
 *
 * Convenience function for simple use cases.
 */
export function extractSymbols(parsedFiles: ParsedAST[]): ExtractionResult {
  const extractor = new SymbolExtractor();
  return extractor.extractBatch(parsedFiles);
}
