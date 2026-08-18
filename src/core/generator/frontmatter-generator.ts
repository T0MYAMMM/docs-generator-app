/**
 * Frontmatter Generator
 *
 * Generates My Bookshelf-compatible frontmatter for markdown documents.
 */

import { Symbol, SymbolType, GeneratedDoc } from '../../types/index.js';

/**
 * Options for frontmatter generation
 */
export interface FrontmatterOptions {
  /** Default author name */
  author?: string;

  /** Default tags to include */
  defaultTags?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Generate frontmatter for a symbol
 */
export function generateFrontmatter(
  symbol: Symbol,
  summary: string,
  options: FrontmatterOptions = {}
): GeneratedDoc['frontmatter'] {
  const { author = 'DocGen', defaultTags = ['auto-generated'], metadata = {} } = options;

  // Generate title from symbol name
  const title = generateTitle(symbol);

  // Generate tags based on symbol type and context
  const tags = generateTags(symbol, defaultTags);

  // Generate description
  const description = summary || generateDefaultDescription(symbol);

  return {
    title,
    description,
    tags,
    date: new Date().toISOString().split('T')[0],
    author,
    category: getCategoryFromSymbolType(symbol.type),
    ...metadata,
  };
}

/**
 * Generate frontmatter for an overview document
 */
export function generateOverviewFrontmatter(
  projectName: string,
  summary: string,
  options: FrontmatterOptions = {}
): GeneratedDoc['frontmatter'] {
  const { author = 'DocGen', defaultTags = ['auto-generated'], metadata = {} } = options;

  return {
    title: `${projectName} - Overview`,
    description: summary || `Overview of the ${projectName} project`,
    tags: [...defaultTags, 'overview', 'architecture'],
    date: new Date().toISOString().split('T')[0],
    author,
    category: 'overview',
    ...metadata,
  };
}

/**
 * Generate title from symbol
 */
function generateTitle(symbol: Symbol): string {
  const prefix = getTitlePrefix(symbol.type);

  // Convert camelCase/PascalCase to Title Case
  const formattedName = symbol.name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return prefix ? `${prefix}: ${formattedName}` : formattedName;
}

/**
 * Get title prefix based on symbol type
 */
function getTitlePrefix(type: SymbolType): string {
  const prefixes: Record<SymbolType, string> = {
    function: 'Function',
    class: 'Class',
    interface: 'Interface',
    type: 'Type',
    variable: 'Variable',
    constant: 'Constant',
    component: 'Component',
    hook: 'Hook',
    enum: 'Enum',
  };

  return prefixes[type] || '';
}

/**
 * Generate tags for a symbol
 */
function generateTags(symbol: Symbol, defaultTags: string[]): string[] {
  const tags = new Set(defaultTags);

  // Add type-based tag
  tags.add(symbol.type);

  // Add framework tags
  if (symbol.type === 'component' || symbol.type === 'hook') {
    tags.add('react');
  }

  // Add API route tag if applicable
  if (symbol.filePath.includes('/api/') || symbol.filePath.includes('\\api\\')) {
    tags.add('api-route');
  }

  // Add utility tag for utility functions
  if (symbol.filePath.includes('/utils/') || symbol.filePath.includes('\\utils\\')) {
    tags.add('utility');
  }

  // Add library tag for lib files
  if (symbol.filePath.includes('/lib/') || symbol.filePath.includes('\\lib\\')) {
    tags.add('library');
  }

  return Array.from(tags);
}

/**
 * Get category from symbol type
 */
function getCategoryFromSymbolType(type: SymbolType): string {
  const categories: Record<SymbolType, string> = {
    function: 'api',
    class: 'api',
    interface: 'types',
    type: 'types',
    variable: 'api',
    constant: 'api',
    component: 'components',
    hook: 'hooks',
    enum: 'types',
  };

  return categories[type] || 'documentation';
}

/**
 * Generate default description if none provided
 */
function generateDefaultDescription(symbol: Symbol): string {
  const typeDescriptions: Record<SymbolType, string> = {
    function: `A function that performs ${symbol.name} operation`,
    class: `A class representing ${symbol.name}`,
    interface: `An interface defining the structure of ${symbol.name}`,
    type: `A type definition for ${symbol.name}`,
    variable: `A variable containing ${symbol.name}`,
    constant: `A constant value for ${symbol.name}`,
    component: `A React component for rendering ${symbol.name}`,
    hook: `A React hook for managing ${symbol.name}`,
    enum: `An enumeration of ${symbol.name} values`,
  };

  return typeDescriptions[symbol.type] || `Documentation for ${symbol.name}`;
}

/**
 * Serialize frontmatter to YAML format
 */
export function serializeFrontmatter(frontmatter: GeneratedDoc['frontmatter']): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Array values
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${item}"`);
      }
    } else if (typeof value === 'string') {
      // String values (quoted if contains special chars)
      const needsQuotes = value.includes(':') || value.includes('#') || value.includes('\n');
      lines.push(`${key}: ${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Number/boolean values
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'object') {
      // Object values (simple one-level for now)
      lines.push(`${key}:`);
      for (const [subKey, subValue] of Object.entries(value)) {
        lines.push(`  ${subKey}: ${subValue}`);
      }
    }
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}
