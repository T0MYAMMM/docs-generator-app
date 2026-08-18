/**
 * Markdown Builder
 *
 * Builds markdown content from code symbols and AI-generated content.
 */

import { Symbol, TypeDefinition, CodeExample } from '../../types/index.js';

/**
 * Build markdown documentation for a function
 */
export function buildFunctionMarkdown(
  symbol: Symbol,
  aiDescription?: string,
  examples?: CodeExample[]
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${symbol.name}\n`);

  // Description
  if (aiDescription) {
    sections.push(aiDescription);
    sections.push('');
  } else if (symbol.comment) {
    sections.push(symbol.comment);
    sections.push('');
  }

  // Signature
  sections.push('## Signature\n');
  sections.push('```typescript');
  sections.push(buildFunctionSignature(symbol));
  sections.push('```\n');

  // Parameters
  if (symbol.parameters && symbol.parameters.length > 0) {
    sections.push('## Parameters\n');
    for (const param of symbol.parameters) {
      const optional = param.optional ? ' *(optional)*' : '';
      const type = param.type ? `: \`${param.type}\`` : '';
      const defaultVal = param.defaultValue ? ` = \`${param.defaultValue}\`` : '';
      const desc = param.description ? ` - ${param.description}` : '';

      sections.push(`- **${param.name}**${type}${defaultVal}${optional}${desc}`);
    }
    sections.push('');
  }

  // Return type
  if (symbol.returnType) {
    sections.push('## Returns\n');
    sections.push(`**${symbol.returnType.type}**`);
    if (symbol.returnType.description) {
      sections.push(` - ${symbol.returnType.description}`);
    }
    sections.push('');
  }

  // Examples
  if (examples && examples.length > 0) {
    sections.push('## Examples\n');
    for (const example of examples) {
      if (example.title) {
        sections.push(`### ${example.title}\n`);
      }
      if (example.description) {
        sections.push(`${example.description}\n`);
      }
      sections.push(`\`\`\`${example.language}`);
      sections.push(example.code);
      sections.push('```\n');
    }
  }

  // Source location
  sections.push('## Source\n');
  sections.push(`[\`${symbol.filePath}\`:${symbol.line}](${symbol.filePath}#L${symbol.line})\n`);

  return sections.join('\n');
}

/**
 * Build markdown documentation for a component
 */
export function buildComponentMarkdown(
  symbol: Symbol,
  aiDescription?: string,
  examples?: CodeExample[]
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${symbol.name}\n`);

  // Description
  if (aiDescription) {
    sections.push(aiDescription);
    sections.push('');
  } else if (symbol.comment) {
    sections.push(symbol.comment);
    sections.push('');
  }

  // Props
  if (symbol.props && Object.keys(symbol.props).length > 0) {
    sections.push('## Props\n');
    sections.push('| Prop | Type | Required | Description |');
    sections.push('|------|------|----------|-------------|');

    for (const [propName, propType] of Object.entries(symbol.props)) {
      const required = propType.properties?.[propName]?.optional === false ? 'Yes' : 'No';
      const type = `\`${propType.value}\``;
      const description = propType.description || '-';

      sections.push(`| ${propName} | ${type} | ${required} | ${description} |`);
    }
    sections.push('');
  }

  // Usage examples
  if (examples && examples.length > 0) {
    sections.push('## Usage\n');
    for (const example of examples) {
      if (example.title) {
        sections.push(`### ${example.title}\n`);
      }
      if (example.description) {
        sections.push(`${example.description}\n`);
      }
      sections.push(`\`\`\`${example.language}`);
      sections.push(example.code);
      sections.push('```\n');
    }
  } else {
    // Generate basic usage example
    sections.push('## Usage\n');
    sections.push('```tsx');
    sections.push(`import { ${symbol.name} } from '${getImportPath(symbol.filePath)}';`);
    sections.push('');
    sections.push(`<${symbol.name} ${generatePropsExample(symbol.props)} />`);
    sections.push('```\n');
  }

  // Source location
  sections.push('## Source\n');
  sections.push(`[\`${symbol.filePath}\`:${symbol.line}](${symbol.filePath}#L${symbol.line})\n`);

  return sections.join('\n');
}

/**
 * Build markdown documentation for a class
 */
export function buildClassMarkdown(
  symbol: Symbol,
  aiDescription?: string,
  examples?: CodeExample[]
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${symbol.name}\n`);

  // Description
  if (aiDescription) {
    sections.push(aiDescription);
    sections.push('');
  } else if (symbol.comment) {
    sections.push(symbol.comment);
    sections.push('');
  }

  // Extends/Implements
  if (symbol.extends || symbol.implements) {
    sections.push('## Class Hierarchy\n');
    if (symbol.extends) {
      sections.push(`**Extends:** \`${symbol.extends}\``);
    }
    if (symbol.implements && symbol.implements.length > 0) {
      sections.push(`**Implements:** ${symbol.implements.map(i => `\`${i}\``).join(', ')}`);
    }
    sections.push('');
  }

  // Constructor
  if (symbol.parameters && symbol.parameters.length > 0) {
    sections.push('## Constructor\n');
    sections.push('```typescript');
    sections.push(buildConstructorSignature(symbol));
    sections.push('```\n');

    sections.push('### Parameters\n');
    for (const param of symbol.parameters) {
      const optional = param.optional ? ' *(optional)*' : '';
      const type = param.type ? `: \`${param.type}\`` : '';
      const desc = param.description ? ` - ${param.description}` : '';

      sections.push(`- **${param.name}**${type}${optional}${desc}`);
    }
    sections.push('');
  }

  // Examples
  if (examples && examples.length > 0) {
    sections.push('## Examples\n');
    for (const example of examples) {
      if (example.title) {
        sections.push(`### ${example.title}\n`);
      }
      if (example.description) {
        sections.push(`${example.description}\n`);
      }
      sections.push(`\`\`\`${example.language}`);
      sections.push(example.code);
      sections.push('```\n');
    }
  }

  // Source location
  sections.push('## Source\n');
  sections.push(`[\`${symbol.filePath}\`:${symbol.line}](${symbol.filePath}#L${symbol.line})\n`);

  return sections.join('\n');
}

/**
 * Build markdown documentation for a type/interface
 */
export function buildTypeMarkdown(
  symbol: Symbol,
  aiDescription?: string
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${symbol.name}\n`);

  // Description
  if (aiDescription) {
    sections.push(aiDescription);
    sections.push('');
  } else if (symbol.comment) {
    sections.push(symbol.comment);
    sections.push('');
  }

  // Type definition
  sections.push('## Definition\n');
  sections.push('```typescript');
  if (symbol.source) {
    sections.push(symbol.source);
  } else {
    sections.push(`${symbol.type} ${symbol.name}`);
  }
  sections.push('```\n');

  // Properties (if interface/type with properties)
  if (symbol.props && Object.keys(symbol.props).length > 0) {
    sections.push('## Properties\n');
    sections.push('| Property | Type | Required | Description |');
    sections.push('|----------|------|----------|-------------|');

    for (const [propName, propType] of Object.entries(symbol.props)) {
      const required = propType.properties?.[propName]?.optional === false ? 'Yes' : 'No';
      const type = `\`${propType.value}\``;
      const description = propType.description || '-';

      sections.push(`| ${propName} | ${type} | ${required} | ${description} |`);
    }
    sections.push('');
  }

  // Source location
  sections.push('## Source\n');
  sections.push(`[\`${symbol.filePath}\`:${symbol.line}](${symbol.filePath}#L${symbol.line})\n`);

  return sections.join('\n');
}

/**
 * Build function signature
 */
function buildFunctionSignature(symbol: Symbol): string {
  const name = symbol.name;
  const params = symbol.parameters?.map(p => {
    const optional = p.optional ? '?' : '';
    const type = p.type ? `: ${p.type}` : '';
    const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : '';
    return `${p.name}${optional}${type}${defaultVal}`;
  }).join(', ') || '';

  const returnType = symbol.returnType ? `: ${symbol.returnType.type}` : '';

  return `function ${name}(${params})${returnType}`;
}

/**
 * Build constructor signature
 */
function buildConstructorSignature(symbol: Symbol): string {
  const params = symbol.parameters?.map(p => {
    const optional = p.optional ? '?' : '';
    const type = p.type ? `: ${p.type}` : '';
    const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : '';
    return `${p.name}${optional}${type}${defaultVal}`;
  }).join(', ') || '';

  return `constructor(${params})`;
}

/**
 * Get import path from file path
 */
function getImportPath(filePath: string): string {
  // Remove file extension and convert to module path
  const withoutExt = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');

  // For simplicity, just use the file name or relative path
  // In real implementation, this would be more sophisticated
  const parts = withoutExt.split(/[/\\]/);
  const fileName = parts[parts.length - 1];

  return `./${fileName}`;
}

/**
 * Generate example props for a component
 */
function generatePropsExample(props?: Record<string, TypeDefinition>): string {
  if (!props || Object.keys(props).length === 0) {
    return '';
  }

  const propStrings: string[] = [];

  for (const [propName, propType] of Object.entries(props)) {
    // Generate example value based on type
    const exampleValue = generateExampleValue(propType.value);
    propStrings.push(`${propName}={${exampleValue}}`);
  }

  return propStrings.join(' ');
}

/**
 * Generate example value based on type
 */
function generateExampleValue(type: string): string {
  if (type.includes('string')) return '"example"';
  if (type.includes('number')) return '42';
  if (type.includes('boolean')) return 'true';
  if (type.includes('function') || type.includes('=>')) return '{() => {}}';
  if (type.includes('[]')) return '[]';
  if (type.includes('{}') || type.startsWith('{')) return '{}';

  return 'value';
}
