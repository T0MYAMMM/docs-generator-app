/**
 * Pattern Detector - Detect framework-specific patterns
 *
 * Identifies React components, Next.js pages/API routes, hooks, and other patterns.
 * This helps categorize symbols for better documentation organization.
 */

import * as ts from 'typescript';
import { ParsedAST } from './ast-parser.js';
import { Symbol as DocSymbol, DetectedPattern } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Pattern detection result
 */
export interface PatternResult {
  /** Detected patterns */
  patterns: DetectedPattern[];

  /** Updated symbols with pattern information */
  symbols: DocSymbol[];
}

/**
 * PatternDetector class for detecting code patterns
 */
export class PatternDetector {
  /**
   * Detect patterns in a parsed file
   */
  detect(parsed: ParsedAST, symbols: DocSymbol[]): PatternResult {
    logger.debug(`Detecting patterns in ${parsed.filePath}`);

    const patterns: DetectedPattern[] = [];
    const updatedSymbols = [...symbols];

    // Detect React components
    const componentPatterns = this.detectReactComponents(parsed, updatedSymbols);
    patterns.push(...componentPatterns);

    // Detect React hooks
    const hookPatterns = this.detectReactHooks(parsed, updatedSymbols);
    patterns.push(...hookPatterns);

    // Detect Next.js patterns
    const nextPatterns = this.detectNextJsPatterns(parsed, updatedSymbols);
    patterns.push(...nextPatterns);

    // Detect utility functions
    const utilPatterns = this.detectUtilityFunctions(parsed, updatedSymbols);
    patterns.push(...utilPatterns);

    logger.debug(`Detected ${patterns.length} patterns`);

    return {
      patterns,
      symbols: updatedSymbols,
    };
  }

  /**
   * Detect patterns in multiple files
   */
  detectBatch(
    parsedFiles: ParsedAST[],
    symbolsByFile: Map<string, DocSymbol[]>
  ): PatternResult {
    logger.info('Detecting patterns...');

    const allPatterns: DetectedPattern[] = [];
    const allSymbols: DocSymbol[] = [];

    for (const parsed of parsedFiles) {
      const symbols = symbolsByFile.get(parsed.filePath) || [];
      const result = this.detect(parsed, symbols);

      allPatterns.push(...result.patterns);
      allSymbols.push(...result.symbols);
    }

    logger.success(`Detected ${allPatterns.length} patterns`);

    return {
      patterns: allPatterns,
      symbols: allSymbols,
    };
  }

  /**
   * Detect React components
   */
  private detectReactComponents(
    parsed: ParsedAST,
    symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const { sourceFile, filePath, sourceCode } = parsed;

    // Check if file uses React
    if (!this.usesReact(sourceCode)) {
      return patterns;
    }

    for (const symbol of symbols) {
      // Check if symbol is a component (function or variable starting with capital letter)
      if (this.isComponentName(symbol.name)) {
        // Mark symbol as component
        symbol.type = 'component';

        // Try to extract props
        const propsType = this.extractPropsType(sourceFile, symbol);
        if (propsType) {
          symbol.props = propsType;
        }

        patterns.push({
          name: `${symbol.name} (React Component)`,
          type: 'react-component',
          filePath,
          symbols: [symbol.id],
          metadata: {
            componentType: this.guessComponentType(sourceCode, symbol.name),
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Detect React hooks
   */
  private detectReactHooks(
    parsed: ParsedAST,
    symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const { filePath, sourceCode } = parsed;

    // Check if file uses React
    if (!this.usesReact(sourceCode)) {
      return patterns;
    }

    for (const symbol of symbols) {
      // Check if it's a hook (function starting with "use")
      if (symbol.name.startsWith('use') && symbol.type === 'function') {
        symbol.type = 'hook';

        patterns.push({
          name: `${symbol.name} (React Hook)`,
          type: 'hook',
          filePath,
          symbols: [symbol.id],
        });
      }
    }

    return patterns;
  }

  /**
   * Detect Next.js patterns
   */
  private detectNextJsPatterns(
    parsed: ParsedAST,
    symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const { filePath } = parsed;

    // Check if it's a Next.js page
    if (filePath.includes('/pages/') || filePath.includes('/app/')) {
      const isPage = filePath.includes('/pages/') || filePath.match(/\/app\/[^/]+\/page\.[jt]sx?$/);

      if (isPage) {
        patterns.push({
          name: 'Next.js Page',
          type: 'nextjs-page',
          filePath,
          symbols: symbols.map((s) => s.id),
        });
      }
    }

    // Check if it's a Next.js API route
    if (filePath.includes('/api/') && filePath.match(/\/api\/.*\/route\.[jt]s$/)) {
      patterns.push({
        name: 'Next.js API Route',
        type: 'api-route',
        filePath,
        symbols: symbols.map((s) => s.id),
        metadata: {
          methods: this.detectHTTPMethods(symbols),
        },
      });
    }

    return patterns;
  }

  /**
   * Detect utility functions
   */
  private detectUtilityFunctions(
    parsed: ParsedAST,
    symbols: DocSymbol[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const { filePath } = parsed;

    // Check if it's a utility file
    if (
      filePath.includes('/utils/') ||
      filePath.includes('/helpers/') ||
      filePath.includes('/lib/')
    ) {
      patterns.push({
        name: 'Utility Functions',
        type: 'util',
        filePath,
        symbols: symbols.filter((s) => s.type === 'function').map((s) => s.id),
      });
    }

    return patterns;
  }

  /**
   * Check if source code uses React
   */
  private usesReact(sourceCode: string): boolean {
    return (
      sourceCode.includes('from "react"') ||
      sourceCode.includes("from 'react'") ||
      sourceCode.includes('require("react")') ||
      sourceCode.includes("require('react')")
    );
  }

  /**
   * Check if a name looks like a component (starts with capital letter)
   */
  private isComponentName(name: string): boolean {
    return /^[A-Z]/.test(name);
  }

  /**
   * Extract props type from a component
   */
  private extractPropsType(
    sourceFile: ts.SourceFile,
    symbol: DocSymbol
  ): Record<string, any> | undefined {
    // Find the node for this symbol
    const node = this.findNodeByName(sourceFile, symbol.name);
    if (!node) return undefined;

    // Try to find props interface/type
    let propsType: ts.TypeNode | undefined;

    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      // Get first parameter (props)
      const firstParam = node.parameters[0];
      if (firstParam?.type) {
        propsType = firstParam.type;
      }
    }

    if (!propsType) return undefined;

    // Extract properties from type
    const props: Record<string, any> = {};

    if (ts.isTypeLiteralNode(propsType)) {
      for (const member of propsType.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const propName = member.name.getText(sourceFile);
          const propType = member.type?.getText(sourceFile) || 'any';
          const optional = !!member.questionToken;

          props[propName] = {
            type: propType,
            optional,
          };
        }
      }
    }

    return Object.keys(props).length > 0 ? props : undefined;
  }

  /**
   * Guess the component type (functional, class, etc.)
   */
  private guessComponentType(sourceCode: string, componentName: string): string {
    if (sourceCode.includes(`class ${componentName}`)) {
      return 'class';
    }

    if (sourceCode.includes(`function ${componentName}`)) {
      return 'functional';
    }

    if (sourceCode.includes(`const ${componentName} = (`)) {
      return 'arrow-function';
    }

    return 'unknown';
  }

  /**
   * Detect HTTP methods in API route symbols
   */
  private detectHTTPMethods(symbols: DocSymbol[]): string[] {
    const methods: Set<string> = new Set();

    for (const symbol of symbols) {
      const name = symbol.name.toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name)) {
        methods.add(name);
      }
    }

    return Array.from(methods);
  }

  /**
   * Find a node by name in the AST
   */
  private findNodeByName(
    sourceFile: ts.SourceFile,
    name: string
  ): ts.Node | undefined {
    let found: ts.Node | undefined;

    const visit = (node: ts.Node) => {
      if (found) return;

      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isVariableDeclaration(node)) &&
        node.name?.getText(sourceFile) === name
      ) {
        found = node;
        return;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return found;
  }
}

/**
 * Detect patterns in parsed files
 *
 * Convenience function for simple use cases.
 */
export function detectPatterns(
  parsedFiles: ParsedAST[],
  symbolsByFile: Map<string, DocSymbol[]>
): PatternResult {
  const detector = new PatternDetector();
  return detector.detectBatch(parsedFiles, symbolsByFile);
}
