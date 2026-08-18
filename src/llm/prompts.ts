/**
 * Prompt Templates - Generate prompts for LLM documentation
 *
 * Contains carefully crafted prompts for CodeLlama to generate
 * high-quality documentation from code symbols.
 */

import { Symbol as DocSymbol, TypeDefinition } from '../types/index.js';

/**
 * System prompt for documentation generation
 */
export const SYSTEM_PROMPT = `You are a technical documentation expert. Your task is to generate clear, concise, and accurate documentation for code symbols.

Guidelines:
- Write in clear, professional English
- Focus on WHAT the code does and WHY it exists
- Keep descriptions concise (1-3 sentences)
- Don't repeat information from the code signature
- Don't use phrases like "This function..." or "This class..."
- Be direct and specific
- For React components, describe the UI element and its purpose
- For utility functions, describe the transformation or operation
- For API routes, describe the endpoint's purpose and behavior

Example good descriptions:
- "Formats a date string into human-readable format (MMM DD, YYYY)"
- "Validates user input and returns sanitized data or error messages"
- "Renders a navigation menu with active state highlighting"

Example bad descriptions:
- "This function formats dates" (too vague, starts with "This function")
- "A utility for date handling" (not specific enough)
- "This is a date formatter function that takes a date and formats it" (redundant)`;

/**
 * Generate prompt for function documentation
 */
export function generateFunctionPrompt(symbol: DocSymbol): string {
  const params = symbol.parameters
    ?.map((p) => `${p.name}: ${p.type || 'any'}`)
    .join(', ') || '';

  const returnType = symbol.returnType?.type || 'void';

  const code = symbol.source?.trim() || '';
  const codePreview = code.length > 300 ? code.substring(0, 300) + '...' : code;

  return `Generate a concise description (1-2 sentences) for this function:

Function name: ${symbol.name}
Parameters: ${params || 'none'}
Returns: ${returnType}
Exported: ${symbol.exported ? 'yes' : 'no'}

${codePreview ? `Code:\n\`\`\`typescript\n${codePreview}\n\`\`\`\n` : ''}
Description:`;
}

/**
 * Generate prompt for class documentation
 */
export function generateClassPrompt(symbol: DocSymbol): string {
  const methods = symbol.source?.match(/^\s*(public|private|protected)?\s*(\w+)\s*\(/gm) || [];
  const methodList = methods.slice(0, 5).join(', ');

  const code = symbol.source?.trim() || '';
  const codePreview = code.length > 400 ? code.substring(0, 400) + '...' : code;

  return `Generate a concise description (1-2 sentences) for this class:

Class name: ${symbol.name}
${methodList ? `Key methods: ${methodList}` : ''}
Exported: ${symbol.exported ? 'yes' : 'no'}

${codePreview ? `Code:\n\`\`\`typescript\n${codePreview}\n\`\`\`\n` : ''}
Description:`;
}

/**
 * Generate prompt for React component documentation
 */
export function generateComponentPrompt(symbol: DocSymbol): string {
  const props = symbol.props
    ? Object.entries(symbol.props)
        .slice(0, 5)
        .map(([name, propType]) => `${name}: ${propType.value}`)
        .join(', ')
    : '';

  const code = symbol.source?.trim() || '';
  const codePreview = code.length > 400 ? code.substring(0, 400) + '...' : code;

  return `Generate a concise description (1-2 sentences) for this React component:

Component name: ${symbol.name}
${props ? `Props: ${props}` : 'Props: none'}
Exported: ${symbol.exported ? 'yes' : 'no'}

${codePreview ? `Code:\n\`\`\`typescript\n${codePreview}\n\`\`\`\n` : ''}
Description:`;
}

/**
 * Generate prompt for interface/type documentation
 */
export function generateTypePrompt(type: TypeDefinition): string {
  const properties = type.properties
    ? Object.entries(type.properties)
        .slice(0, 8)
        .map(([name, prop]) => `${name}: ${prop.type}`)
        .join(', ')
    : '';

  return `Generate a concise description (1 sentence) for this TypeScript ${type.kind}:

${type.kind === 'interface' ? 'Interface' : 'Type'} name: ${type.name}
${properties ? `Properties: ${properties}` : ''}

Description:`;
}

/**
 * Generate prompt for constant/variable documentation
 */
export function generateConstantPrompt(symbol: DocSymbol): string {
  const value = symbol.source?.trim() || '';
  const valuePreview = value.length > 200 ? value.substring(0, 200) + '...' : value;

  return `Generate a concise description (1 sentence) for this constant:

Name: ${symbol.name}
Type: ${symbol.returnType?.type || 'unknown'}
Exported: ${symbol.exported ? 'yes' : 'no'}

${valuePreview ? `Value:\n\`\`\`typescript\n${valuePreview}\n\`\`\`\n` : ''}
Description:`;
}

/**
 * Generate prompt for API route documentation
 */
export function generateAPIRoutePrompt(symbol: DocSymbol, routePath: string): string {
  const code = symbol.source?.trim() || '';
  const codePreview = code.length > 500 ? code.substring(0, 500) + '...' : code;

  return `Generate a concise description (1-2 sentences) for this API route:

Route: ${routePath}
Handler: ${symbol.name}

${codePreview ? `Code:\n\`\`\`typescript\n${codePreview}\n\`\`\`\n` : ''}
Description:`;
}

/**
 * Generate prompt for React hook documentation
 */
export function generateHookPrompt(symbol: DocSymbol): string {
  const params = symbol.parameters
    ?.map((p) => `${p.name}: ${p.type || 'any'}`)
    .join(', ') || '';

  const returnType = symbol.returnType?.type || 'void';

  const code = symbol.source?.trim() || '';
  const codePreview = code.length > 300 ? code.substring(0, 300) + '...' : code;

  return `Generate a concise description (1-2 sentences) for this React hook:

Hook name: ${symbol.name}
Parameters: ${params || 'none'}
Returns: ${returnType}

${codePreview ? `Code:\n\`\`\`typescript\n${codePreview}\n\`\`\`\n` : ''}
Description:`;
}

/**
 * Generate appropriate prompt based on symbol type
 */
export function generatePromptForSymbol(symbol: DocSymbol): string {
  // Check if it's a React component
  if (symbol.type === 'component') {
    return generateComponentPrompt(symbol);
  }

  // Check if it's a hook (starts with 'use')
  if (symbol.type === 'function' && symbol.name.startsWith('use')) {
    return generateHookPrompt(symbol);
  }

  // Generate prompt based on symbol type
  switch (symbol.type) {
    case 'function':
      return generateFunctionPrompt(symbol);
    case 'class':
      return generateClassPrompt(symbol);
    case 'constant':
    case 'variable':
      return generateConstantPrompt(symbol);
    default:
      return generateFunctionPrompt(symbol);
  }
}

/**
 * Generate prompt for type definition
 */
export function generatePromptForType(type: TypeDefinition): string {
  return generateTypePrompt(type);
}

/**
 * Parse LLM response and extract clean description
 */
export function parseDescription(response: string): string {
  // Remove common prefixes
  let cleaned = response
    .trim()
    .replace(/^Description:\s*/i, '')
    .replace(/^Summary:\s*/i, '')
    .replace(/^This (function|class|component|hook|interface|type|constant)\s+/i, '')
    .replace(/^A (function|class|component|hook|interface|type|constant) (that|which)\s+/i, '');

  // Capitalize first letter
  if (cleaned.length > 0 && cleaned[0]) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  // Ensure it ends with a period
  if (cleaned.length > 0 && !cleaned.endsWith('.') && !cleaned.endsWith('?') && !cleaned.endsWith('!')) {
    cleaned += '.';
  }

  return cleaned;
}

/**
 * Batch generate prompts for multiple symbols
 */
export function generateBatchPrompt(symbols: DocSymbol[]): string[] {
  return symbols.map((symbol) => generatePromptForSymbol(symbol));
}
