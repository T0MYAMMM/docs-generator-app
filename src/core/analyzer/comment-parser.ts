/**
 * Comment Parser - Extract JSDoc/TSDoc comments
 *
 * Parses JSDoc and TSDoc comments from TypeScript/JavaScript code.
 * Links comments to their associated symbols and extracts tags.
 */

import * as ts from 'typescript';
import { ParsedAST } from './ast-parser.js';
import { Symbol as DocSymbol } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Parsed comment information
 */
export interface ParsedComment {
  /** Raw comment text */
  raw: string;

  /** Cleaned comment text (without comment markers) */
  text: string;

  /** Description (main text before tags) */
  description: string;

  /** Extracted tags */
  tags: Record<string, string>;

  /** Parameter descriptions */
  params: Record<string, string>;

  /** Return description */
  returns?: string;

  /** Example code blocks */
  examples: string[];
}

/**
 * CommentParser class for parsing JSDoc/TSDoc comments
 */
export class CommentParser {
  /**
   * Extract comments from a parsed file and attach to symbols
   */
  attachComments(parsed: ParsedAST, symbols: DocSymbol[]): DocSymbol[] {
    logger.debug(`Attaching comments to ${symbols.length} symbols`);

    const { sourceFile } = parsed;

    // Create a map of symbols by their position
    const symbolMap = new Map<number, DocSymbol>();

    for (const symbol of symbols) {
      // Find the corresponding node in the AST
      const node = this.findNodeAtLine(sourceFile, symbol.line);
      if (node) {
        symbolMap.set(node.pos, symbol);
      }
    }

    // Attach comments to symbols
    let attachedCount = 0;

    for (const symbol of symbols) {
      const node = this.findNodeAtLine(sourceFile, symbol.line);
      if (!node) continue;

      const comment = this.extractComment(node, sourceFile);
      if (comment) {
        symbol.comment = comment.description;
        symbol.tags = comment.tags;

        // Attach param descriptions
        if (symbol.parameters && comment.params) {
          for (const param of symbol.parameters) {
            if (comment.params[param.name]) {
              param.description = comment.params[param.name];
            }
          }
        }

        // Attach return description
        if (symbol.returnType && comment.returns) {
          symbol.returnType.description = comment.returns;
        }

        attachedCount++;
      }
    }

    logger.debug(`Attached comments to ${attachedCount} symbols`);

    return symbols;
  }

  /**
   * Extract comment from a node
   */
  private extractComment(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): ParsedComment | null {
    // Get leading comments
    const fullText = sourceFile.getFullText();
    const comments = ts.getLeadingCommentRanges(fullText, node.getFullStart());

    if (!comments || comments.length === 0) {
      return null;
    }

    // Get the last comment (closest to the node)
    const comment = comments[comments.length - 1];
    if (!comment) {
      return null;
    }

    // Only process block comments (JSDoc style)
    if (comment.kind !== ts.SyntaxKind.MultiLineCommentTrivia) {
      return null;
    }

    const commentText = fullText.substring(comment.pos, comment.end);

    // Parse the comment
    return this.parseComment(commentText);
  }

  /**
   * Parse a JSDoc comment string
   */
  private parseComment(commentText: string): ParsedComment {
    // Remove comment markers (/** and */)
    const cleaned = commentText
      .replace(/^\/\*\*/, '')
      .replace(/\*\/$/, '')
      .split('\n')
      .map((line) => line.trim().replace(/^\*\s?/, ''))
      .join('\n')
      .trim();

    // Split into description and tags
    const lines = cleaned.split('\n');
    const description: string[] = [];
    const tagLines: string[] = [];

    let inTags = false;

    for (const line of lines) {
      if (line.startsWith('@')) {
        inTags = true;
        tagLines.push(line);
      } else if (inTags) {
        // Continuation of previous tag
        if (tagLines.length > 0) {
          tagLines[tagLines.length - 1] += ' ' + line;
        }
      } else {
        description.push(line);
      }
    }

    // Parse tags
    const tags: Record<string, string> = {};
    const params: Record<string, string> = {};
    const examples: string[] = [];
    let returns: string | undefined;

    for (const tagLine of tagLines) {
      const match = tagLine.match(/^@(\w+)\s+(.+)/);
      if (!match) continue;

      const tagName = match[1];
      const tagValue = match[2];

      if (!tagName) continue;

      if (tagName === 'param') {
        // Parse @param {type} name - description
        if (!tagValue) continue;
        const paramMatch = tagValue.match(/^(?:\{[^}]+\}\s+)?(\w+)\s*-?\s*(.+)/);
        if (paramMatch) {
          const paramName = paramMatch[1];
          const paramDesc = paramMatch[2];
          if (paramName && paramDesc) {
            params[paramName] = paramDesc.trim();
          }
        }
      } else if (tagName === 'returns' || tagName === 'return') {
        // Parse @returns {type} description
        if (!tagValue) continue;
        const returnsMatch = tagValue.match(/^(?:\{[^}]+\}\s+)?(.+)/);
        if (returnsMatch && returnsMatch[1]) {
          returns = returnsMatch[1].trim();
        }
      } else if (tagName === 'example') {
        if (tagValue) {
          examples.push(tagValue.trim());
        }
      } else {
        if (tagValue) {
          tags[tagName] = tagValue.trim();
        }
      }
    }

    return {
      raw: commentText,
      text: cleaned,
      description: description.join('\n').trim(),
      tags,
      params,
      returns,
      examples,
    };
  }

  /**
   * Find a node at a specific line number
   */
  private findNodeAtLine(
    sourceFile: ts.SourceFile,
    line: number
  ): ts.Node | null {
    let targetNode: ts.Node | null = null;

    const visit = (node: ts.Node) => {
      const { line: nodeLine } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart()
      );

      if (nodeLine + 1 === line) {
        targetNode = node;
        return;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return targetNode;
  }

  /**
   * Extract inline comments from source code
   */
  extractInlineComments(sourceCode: string): string[] {
    const comments: string[] = [];

    // Match single-line comments
    const singleLineRegex = /\/\/\s*(.+)/g;
    let match;

    while ((match = singleLineRegex.exec(sourceCode)) !== null) {
      if (match[1]) {
        comments.push(match[1].trim());
      }
    }

    // Match block comments
    const blockCommentRegex = /\/\*\*?([\s\S]*?)\*\//g;

    while ((match = blockCommentRegex.exec(sourceCode)) !== null) {
      if (match[1]) {
        const cleaned = match[1]
          .split('\n')
          .map((line) => line.trim().replace(/^\*\s?/, ''))
          .join('\n')
          .trim();

        comments.push(cleaned);
      }
    }

    return comments;
  }

  /**
   * Check if a comment is a JSDoc comment
   */
  isJSDocComment(comment: string): boolean {
    return comment.trim().startsWith('/**');
  }

  /**
   * Extract description from a symbol's comment
   */
  getDescription(symbol: DocSymbol): string {
    if (!symbol.comment) {
      return '';
    }

    // If already a clean description, return it
    if (!symbol.comment.startsWith('/**')) {
      return symbol.comment;
    }

    // Parse and extract description
    const parsed = this.parseComment(symbol.comment);
    return parsed.description;
  }
}

/**
 * Attach comments to symbols
 *
 * Convenience function for simple use cases.
 */
export function attachComments(
  parsed: ParsedAST,
  symbols: DocSymbol[]
): DocSymbol[] {
  const parser = new CommentParser();
  return parser.attachComments(parsed, symbols);
}
