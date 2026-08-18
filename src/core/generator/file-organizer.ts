/**
 * File Organizer
 *
 * Organizes generated documentation files into a structured directory layout.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, relative, sep } from 'path';
import { Symbol, GeneratedDoc, OutputConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * File organizer for documentation output
 */
export class FileOrganizer {
  constructor(private outputConfig: OutputConfig) {}

  /**
   * Determine output path for a symbol
   */
  getOutputPath(symbol: Symbol, projectRoot: string): string {
    const { path: outputDir, structure } = this.outputConfig;

    switch (structure) {
      case 'mirror':
        return this.getMirrorPath(symbol, projectRoot, outputDir);

      case 'flat':
        return this.getFlatPath(symbol, outputDir);

      case 'custom':
        return this.getCustomPath(symbol, outputDir);

      default:
        return this.getMirrorPath(symbol, projectRoot, outputDir);
    }
  }

  /**
   * Get mirrored directory structure path
   */
  private getMirrorPath(symbol: Symbol, projectRoot: string, outputDir: string): string {
    // Get relative path from project root
    const relPath = relative(projectRoot, symbol.filePath);

    // Remove file extension
    const withoutExt = relPath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Convert to markdown filename
    const parts = withoutExt.split(sep);
    const fileName = parts.pop();
    const dirPath = parts.join(sep);

    // Build output path
    const mdFileName = `${this.sanitizeFileName(fileName || 'index')}-${this.sanitizeFileName(symbol.name)}.md`;

    return join(outputDir, dirPath, mdFileName);
  }

  /**
   * Get flat structure path (all files in one directory)
   */
  private getFlatPath(symbol: Symbol, outputDir: string): string {
    // Create filename from file path and symbol name
    const baseName = symbol.filePath
      .replace(/\.(ts|tsx|js|jsx)$/, '')
      .split(sep)
      .filter(part => !['src', 'lib', 'app', 'components'].includes(part))
      .join('-');

    const fileName = `${this.sanitizeFileName(baseName)}-${this.sanitizeFileName(symbol.name)}.md`;

    return join(outputDir, fileName);
  }

  /**
   * Get custom organized path (by symbol type)
   */
  private getCustomPath(symbol: Symbol, outputDir: string): string {
    // Organize by category
    const category = this.getCategoryFromSymbol(symbol);

    // Create filename
    const fileName = `${this.sanitizeFileName(symbol.name)}.md`;

    return join(outputDir, category, fileName);
  }

  /**
   * Get category directory from symbol
   */
  private getCategoryFromSymbol(symbol: Symbol): string {
    switch (symbol.type) {
      case 'component':
        return 'components';
      case 'hook':
        return 'hooks';
      case 'function':
        return 'functions';
      case 'class':
        return 'classes';
      case 'interface':
      case 'type':
      case 'enum':
        return 'types';
      default:
        return 'misc';
    }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Write document to file
   */
  async writeDocument(doc: GeneratedDoc): Promise<void> {
    try {
      // Ensure directory exists
      await mkdir(dirname(doc.path), { recursive: true });

      // Write file
      await writeFile(doc.path, doc.content, 'utf-8');

      logger.debug(`Written: ${doc.path}`);
    } catch (error) {
      logger.error(`Failed to write ${doc.path}:`, error);
      throw error;
    }
  }

  /**
   * Write multiple documents
   */
  async writeDocuments(docs: GeneratedDoc[]): Promise<{ written: number; failed: number }> {
    let written = 0;
    let failed = 0;

    for (const doc of docs) {
      try {
        await this.writeDocument(doc);
        written++;
      } catch {
        failed++;
      }
    }

    return { written, failed };
  }

  /**
   * Generate index file for a directory
   */
  async generateIndex(
    dirPath: string,
    title: string,
    description: string,
    files: string[]
  ): Promise<void> {
    const indexPath = join(dirPath, 'index.md');

    const content = [
      '---',
      `title: "${title}"`,
      `description: "${description}"`,
      `tags: ["index", "overview"]`,
      `date: "${new Date().toISOString().split('T')[0]}"`,
      '---',
      '',
      `# ${title}`,
      '',
      description,
      '',
      '## Contents',
      '',
      ...files.map(file => {
        const name = file.replace(/\.md$/, '');
        const displayName = name
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return `- [${displayName}](./${file})`;
      }),
      '',
    ].join('\n');

    await mkdir(dirname(indexPath), { recursive: true });
    await writeFile(indexPath, content, 'utf-8');

    logger.debug(`Generated index: ${indexPath}`);
  }

  /**
   * Get overview document path
   */
  getOverviewPath(_projectName: string): string {
    return join(this.outputConfig.path, 'overview.md');
  }

  /**
   * Get architecture document path
   */
  getArchitecturePath(): string {
    return join(this.outputConfig.path, 'architecture.md');
  }

  /**
   * Get API reference path
   */
  getApiReferencePath(): string {
    return join(this.outputConfig.path, 'api', 'index.md');
  }

  /**
   * Clean output directory
   */
  async clean(): Promise<void> {
    if (!this.outputConfig.clean) {
      return;
    }

    try {
      const { rm } = await import('fs/promises');
      await rm(this.outputConfig.path, { recursive: true, force: true });
      logger.info(`Cleaned output directory: ${this.outputConfig.path}`);
    } catch (error) {
      logger.warn(`Failed to clean output directory:`, error);
    }
  }
}
