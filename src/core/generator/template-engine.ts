/**
 * Template Engine
 *
 * Handles Handlebars template compilation and rendering for documentation generation.
 */

import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template engine for generating markdown
 */
export class TemplateEngine {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private customTemplatesPath?: string;

  constructor(customTemplatesPath?: string) {
    this.customTemplatesPath = customTemplatesPath;
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Code block helper
    Handlebars.registerHelper('codeBlock', (language: string, code: string) => {
      return new Handlebars.SafeString(`\`\`\`${language}\n${code}\n\`\`\``);
    });

    // Inline code helper
    Handlebars.registerHelper('code', (text: string) => {
      return new Handlebars.SafeString(`\`${text}\``);
    });

    // Link helper
    Handlebars.registerHelper('link', (text: string, url: string) => {
      return new Handlebars.SafeString(`[${text}](${url})`);
    });

    // Join array with separator
    Handlebars.registerHelper('join', (array: string[], separator: string) => {
      return array.join(separator);
    });

    // Format type
    Handlebars.registerHelper('formatType', (type: string) => {
      return new Handlebars.SafeString(`\`${type}\``);
    });

    // Uppercase first letter
    Handlebars.registerHelper('capitalize', (text: string) => {
      return text.charAt(0).toUpperCase() + text.slice(1);
    });

    // Check if array has items
    Handlebars.registerHelper('hasItems', (array: unknown[]) => {
      return array && array.length > 0;
    });

    // Format parameters
    Handlebars.registerHelper('formatParams', function (params: unknown[]) {
      if (!params || params.length === 0) return '';

      return params
        .map((p: any) => {
          const optional = p.optional ? '?' : '';
          const type = p.type ? `: ${p.type}` : '';
          return `${p.name}${optional}${type}`;
        })
        .join(', ');
    });

    // Format Python parameters
    Handlebars.registerHelper('formatPythonParams', function (params: unknown[]) {
      if (!params || params.length === 0) return '';

      return params
        .map((p: any) => {
          let param = p.name;

          // Add type hint if available
          if (p.type) {
            param += `: ${p.type}`;
          }

          // Add default value if available
          if (p.defaultValue !== undefined && p.defaultValue !== null) {
            param += ` = ${p.defaultValue}`;
          }

          // Handle *args and **kwargs
          if (p.isVarArgs) {
            param = `*${p.name}`;
          }
          if (p.isKwArgs) {
            param = `**${p.name}`;
          }

          return param;
        })
        .join(', ');
    });

    // Format title (remove underscores, capitalize words)
    Handlebars.registerHelper('formatTitle', (text: string) => {
      if (!text) return '';

      return text
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });

    // Check if string includes substring
    Handlebars.registerHelper('includes', (text: string, search: string) => {
      if (!text || !search) return false;
      return text.toLowerCase().includes(search.toLowerCase());
    });

    // Greater than comparison
    Handlebars.registerHelper('gt', (a: any, b: any) => {
      return Number(a) > Number(b);
    });

    // Or helper
    Handlebars.registerHelper('or', function(...args: any[]) {
      // Remove the last argument (options object)
      args.pop();
      return args.some(arg => !!arg);
    });

    // Unless helper for negation
    Handlebars.registerHelper('unless', function (this: unknown, conditional: any, options: any) {
      if (!conditional) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Concat helper
    Handlebars.registerHelper('concat', (...args: any[]) => {
      // Remove the last argument (options object)
      args.pop();
      return args.join('');
    });

    // Equals comparison
    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => {
      return a === b;
    });

    // Not equals comparison
    Handlebars.registerHelper('ne', (a: unknown, b: unknown) => {
      return a !== b;
    });
  }

  /**
   * Load and compile a template
   */
  async loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
    // Check if already loaded
    if (this.templates.has(name)) {
      return this.templates.get(name)!;
    }

    // Try custom templates first
    if (this.customTemplatesPath) {
      try {
        const customPath = join(this.customTemplatesPath, `${name}.hbs`);
        const content = await readFile(customPath, 'utf-8');
        const template = Handlebars.compile(content, { noEscape: true });
        this.templates.set(name, template);
        return template;
      } catch {
        // Fall through to default templates
      }
    }

    // Load default template
    // After bundling, templates are at ../templates relative to dist/cli
    const defaultPath = join(__dirname, '../templates', `${name}.hbs`);
    const content = await readFile(defaultPath, 'utf-8');
    const template = Handlebars.compile(content, { noEscape: true });
    this.templates.set(name, template);
    return template;
  }

  /**
   * Render a template with data
   */
  async render(templateName: string, data: Record<string, unknown>): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return template(data);
  }

  /**
   * Register a custom template
   */
  registerTemplate(name: string, content: string): void {
    const template = Handlebars.compile(content, { noEscape: true });
    this.templates.set(name, template);
  }

  /**
   * Clear all cached templates
   */
  clearCache(): void {
    this.templates.clear();
  }
}

/**
 * Default template engine instance
 */
export const defaultTemplateEngine = new TemplateEngine();
