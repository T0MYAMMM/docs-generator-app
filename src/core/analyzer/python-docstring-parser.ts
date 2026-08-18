/**
 * Python Docstring Parser
 *
 * Parses Python docstrings in multiple formats (Google, NumPy, Sphinx/reST)
 * and extracts structured documentation information.
 */

import { Symbol as DocSymbol } from '../../types/index.js';

/**
 * Supported docstring styles
 */
export type DocstringStyle = 'google' | 'numpy' | 'sphinx' | 'unknown';

/**
 * Parsed docstring structure
 */
export interface ParsedDocstring {
  style: DocstringStyle;
  description: string;
  params: Record<string, string>;
  returns?: string;
  raises?: Record<string, string>;
  yields?: string;
  examples: string[];
  tags: Record<string, string>;
}

/**
 * Python Docstring Parser
 *
 * Auto-detects and parses docstrings in Google, NumPy, or Sphinx formats.
 */
export class PythonDocstringParser {
  /**
   * Parse a docstring and return structured information
   */
  parse(docstring: string | null | undefined): ParsedDocstring | null {
    if (!docstring || docstring.trim().length === 0) return null;

    const style = this.detectStyle(docstring);

    switch (style) {
      case 'google':
        return this.parseGoogleStyle(docstring);
      case 'numpy':
        return this.parseNumpyStyle(docstring);
      case 'sphinx':
        return this.parseSphinxStyle(docstring);
      default:
        return this.parseGeneric(docstring);
    }
  }

  /**
   * Detect docstring style from content
   */
  private detectStyle(docstring: string): DocstringStyle {
    // Google style: Args:, Returns:, Raises:
    if (/\n\s*(Args|Returns|Raises|Yields|Examples?):/i.test(docstring)) {
      return 'google';
    }

    // NumPy style: Parameters\n----------
    if (/\n\s*(Parameters?|Returns?|Raises?|Yields?|Examples?)\n\s*-{3,}/i.test(docstring)) {
      return 'numpy';
    }

    // Sphinx style: :param, :returns:, :raises:
    if (/:\s*(param|returns?|raises?|yields?|rtype|type)(\s+\w+)?:/i.test(docstring)) {
      return 'sphinx';
    }

    return 'unknown';
  }

  /**
   * Parse Google-style docstring
   *
   * Example:
   *   """
   *   Function description.
   *
   *   Args:
   *       param1 (str): Description of param1.
   *       param2 (int, optional): Description of param2. Defaults to 0.
   *
   *   Returns:
   *       bool: Description of return value.
   *
   *   Raises:
   *       ValueError: Description of error.
   *
   *   Examples:
   *       >>> func(param1="test")
   *       True
   *   """
   */
  private parseGoogleStyle(docstring: string): ParsedDocstring {
    const lines = docstring.split('\n');
    const result: ParsedDocstring = {
      style: 'google',
      description: '',
      params: {},
      raises: {},
      examples: [],
      tags: {},
    };

    let currentSection: string | null = null;
    const descriptionLines: string[] = [];
    const returnsLines: string[] = [];
    const yieldsLines: string[] = [];
    const exampleLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect section headers
      if (/^(Args?|Arguments?):/i.test(trimmed)) {
        currentSection = 'args';
        continue;
      } else if (/^Returns?:/i.test(trimmed)) {
        currentSection = 'returns';
        continue;
      } else if (/^Raises?:/i.test(trimmed)) {
        currentSection = 'raises';
        continue;
      } else if (/^Yields?:/i.test(trimmed)) {
        currentSection = 'yields';
        continue;
      } else if (/^Examples?:/i.test(trimmed)) {
        currentSection = 'examples';
        continue;
      } else if (/^(Note|Warning|See Also):/i.test(trimmed)) {
        currentSection = 'other';
        continue;
      }

      // Process based on current section
      if (currentSection === null) {
        if (trimmed) descriptionLines.push(trimmed);
      } else if (currentSection === 'args') {
        // Match: param_name (type): description
        // Also match: param_name: description (without type)
        const paramMatch = trimmed.match(/^(\w+)\s*(?:\(([^)]+)\))?:\s*(.+)/);
        if (paramMatch) {
          const paramName = paramMatch[1];
          const paramDesc = paramMatch[3];
          if (paramName && paramDesc) {
            result.params[paramName] = paramDesc.trim();
          }
        } else if (trimmed && Object.keys(result.params).length > 0) {
          // Continuation of previous parameter description
          const lastParam = Object.keys(result.params).pop();
          if (lastParam) {
            result.params[lastParam] += ' ' + trimmed;
          }
        }
      } else if (currentSection === 'returns') {
        if (trimmed) returnsLines.push(trimmed);
      } else if (currentSection === 'raises') {
        // Match: ErrorType: description
        const raiseMatch = trimmed.match(/^(\w+):\s*(.+)/);
        if (raiseMatch) {
          const errorType = raiseMatch[1];
          const errorDesc = raiseMatch[2];
          if (errorType && errorDesc && result.raises) {
            result.raises[errorType] = errorDesc.trim();
          }
        }
      } else if (currentSection === 'yields') {
        if (trimmed) yieldsLines.push(trimmed);
      } else if (currentSection === 'examples') {
        if (trimmed) exampleLines.push(trimmed);
      }
    }

    result.description = descriptionLines.join('\n').trim();
    if (returnsLines.length > 0) {
      result.returns = returnsLines.join(' ').trim();
    }
    if (yieldsLines.length > 0) {
      result.yields = yieldsLines.join(' ').trim();
    }
    if (exampleLines.length > 0) {
      result.examples.push(exampleLines.join('\n'));
    }

    return result;
  }

  /**
   * Parse NumPy-style docstring
   *
   * Example:
   *   """
   *   Function description.
   *
   *   Parameters
   *   ----------
   *   param1 : str
   *       Description of param1.
   *   param2 : int, optional
   *       Description of param2. Default is 0.
   *
   *   Returns
   *   -------
   *   bool
   *       Description of return value.
   *   """
   */
  private parseNumpyStyle(docstring: string): ParsedDocstring {
    const lines = docstring.split('\n');
    const result: ParsedDocstring = {
      style: 'numpy',
      description: '',
      params: {},
      raises: {},
      examples: [],
      tags: {},
    };

    let currentSection: string | null = null;
    const descriptionLines: string[] = [];
    const returnsLines: string[] = [];
    let currentParamName: string | null = null;
    const currentParamLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect section headers
      if (/^Parameters?\s*$/i.test(trimmed)) {
        currentSection = 'params-header';
        continue;
      } else if (/^Returns?\s*$/i.test(trimmed)) {
        currentSection = 'returns-header';
        continue;
      } else if (/^Raises?\s*$/i.test(trimmed)) {
        currentSection = 'raises-header';
        continue;
      } else if (/^Yields?\s*$/i.test(trimmed)) {
        currentSection = 'yields-header';
        continue;
      } else if (/^Examples?\s*$/i.test(trimmed)) {
        currentSection = 'examples-header';
        continue;
      } else if (/^-{3,}$/.test(trimmed)) {
        // Underline - activate the section
        if (currentSection === 'params-header') {
          // Save previous param if exists
          if (currentParamName && currentParamLines.length > 0) {
            result.params[currentParamName] = currentParamLines.join(' ').trim();
            currentParamLines.length = 0;
          }
          currentSection = 'params';
        } else if (currentSection === 'returns-header') {
          currentSection = 'returns';
        } else if (currentSection === 'raises-header') {
          currentSection = 'raises';
        } else if (currentSection === 'yields-header') {
          currentSection = 'yields';
        } else if (currentSection === 'examples-header') {
          currentSection = 'examples';
        }
        continue;
      }

      // Process content
      if (currentSection === null || currentSection.endsWith('-header')) {
        if (trimmed) descriptionLines.push(trimmed);
      } else if (currentSection === 'params') {
        // Match: param_name : type
        const paramMatch = trimmed.match(/^(\w+)\s*:\s*(.+)/);
        if (paramMatch && paramMatch[1]) {
          // Save previous param
          if (currentParamName && currentParamLines.length > 0) {
            result.params[currentParamName] = currentParamLines.join(' ').trim();
          }
          currentParamName = paramMatch[1] || null;
          currentParamLines.length = 0;
        } else if (currentParamName && trimmed) {
          // Continuation of parameter description
          currentParamLines.push(trimmed);
        }
      } else if (currentSection === 'returns') {
        if (trimmed) returnsLines.push(trimmed);
      } else if (currentSection === 'examples') {
        if (trimmed) result.examples.push(trimmed);
      }
    }

    // Save last param
    if (currentParamName && currentParamLines.length > 0) {
      result.params[currentParamName] = currentParamLines.join(' ').trim();
    }

    result.description = descriptionLines.join('\n').trim();
    if (returnsLines.length > 0) {
      result.returns = returnsLines.join(' ').trim();
    }

    return result;
  }

  /**
   * Parse Sphinx/reST-style docstring
   *
   * Example:
   *   """
   *   Function description.
   *
   *   :param param1: Description of param1
   *   :type param1: str
   *   :param param2: Description of param2
   *   :type param2: int
   *   :returns: Description of return value
   *   :rtype: bool
   *   :raises ValueError: Description of error
   *   """
   */
  private parseSphinxStyle(docstring: string): ParsedDocstring {
    const lines = docstring.split('\n');
    const result: ParsedDocstring = {
      style: 'sphinx',
      description: '',
      params: {},
      raises: {},
      examples: [],
      tags: {},
    };

    const descriptionLines: string[] = [];
    let inDescription = true;

    for (const line of lines) {
      const trimmed = line.trim();

      // Match :param name: description
      const paramMatch = trimmed.match(/^:param\s+(\w+):\s*(.+)/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        const paramDesc = paramMatch[2];
        if (paramName && paramDesc) {
          result.params[paramName] = paramDesc.trim();
        }
        inDescription = false;
        continue;
      }

      // Match :returns: description
      const returnsMatch = trimmed.match(/^:returns?:\s*(.+)/);
      if (returnsMatch && returnsMatch[1]) {
        result.returns = returnsMatch[1].trim();
        inDescription = false;
        continue;
      }

      // Match :raises ErrorType: description
      const raisesMatch = trimmed.match(/^:raises?\s+(\w+):\s*(.+)/);
      if (raisesMatch) {
        const errorType = raisesMatch[1];
        const errorDesc = raisesMatch[2];
        if (errorType && errorDesc && result.raises) {
          result.raises[errorType] = errorDesc.trim();
        }
        inDescription = false;
        continue;
      }

      // Skip :type and :rtype tags (we get types from annotations)
      if (/^:(type|rtype)/.test(trimmed)) {
        inDescription = false;
        continue;
      }

      // Add to description if not a tag
      if (inDescription && trimmed && !trimmed.startsWith(':')) {
        descriptionLines.push(trimmed);
      }
    }

    result.description = descriptionLines.join('\n').trim();
    return result;
  }

  /**
   * Parse generic/unknown style docstring
   */
  private parseGeneric(docstring: string): ParsedDocstring {
    return {
      style: 'unknown',
      description: docstring.trim(),
      params: {},
      examples: [],
      tags: {},
    };
  }

  /**
   * Attach parsed docstrings to symbols
   */
  attachDocstrings(symbols: DocSymbol[]): DocSymbol[] {
    for (const symbol of symbols) {
      if (symbol.comment) {
        const parsed = this.parse(symbol.comment);
        if (parsed) {
          // Update symbol with parsed docstring info
          symbol.comment = parsed.description;

          // Merge tags
          symbol.tags = {
            ...symbol.tags,
            ...parsed.tags,
            docstring_style: parsed.style,
          };

          // Attach param descriptions
          if (symbol.parameters && parsed.params) {
            for (const param of symbol.parameters) {
              if (parsed.params[param.name]) {
                param.description = parsed.params[param.name];
              }
            }
          }

          // Attach return description
          if (symbol.returnType && parsed.returns) {
            symbol.returnType.description = parsed.returns;
          }

          // Store examples if present
          if (parsed.examples.length > 0) {
            symbol.tags!.examples = parsed.examples.join('\n---\n');
          }
        }
      }
    }

    return symbols;
  }

  /**
   * Get statistics about parsed docstrings
   */
  getStatistics(symbols: DocSymbol[]): {
    total: number;
    withDocstrings: number;
    byStyle: Record<DocstringStyle, number>;
  } {
    const byStyle: Record<DocstringStyle, number> = {
      google: 0,
      numpy: 0,
      sphinx: 0,
      unknown: 0,
    };

    let withDocstrings = 0;

    for (const symbol of symbols) {
      if (symbol.comment) {
        withDocstrings++;
        const style = (symbol.tags?.docstring_style as DocstringStyle) || 'unknown';
        byStyle[style]++;
      }
    }

    return {
      total: symbols.length,
      withDocstrings,
      byStyle,
    };
  }
}
