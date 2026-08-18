/**
 * FileWalker - Directory traversal module
 *
 * Recursively traverses a directory tree and collects file paths.
 * Respects .gitignore rules and supports include/exclude patterns.
 */

import { join, relative } from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { FileConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { normalizePath, fileExists, readFile } from '../../utils/helpers.js';

/**
 * FileWalker options
 */
export interface FileWalkerOptions {
  /** Project root directory */
  rootDir: string;

  /** File selection patterns */
  patterns: FileConfig;

  /** Respect .gitignore */
  respectGitignore?: boolean;

  /** Follow symbolic links */
  followSymlinks?: boolean;
}

/**
 * FileWalker class for directory traversal
 */
export class FileWalker {
  private rootDir: string;
  private patterns: FileConfig;
  private respectGitignore: boolean;
  private ignoreFilter: ReturnType<typeof ignore> | null = null;

  constructor(options: FileWalkerOptions) {
    this.rootDir = options.rootDir;
    this.patterns = options.patterns;
    this.respectGitignore = options.respectGitignore ?? true;
  }

  /**
   * Walk the directory tree and collect file paths
   */
  async walk(): Promise<string[]> {
    logger.debug(`Walking directory: ${this.rootDir}`);

    // Load .gitignore if needed
    if (this.respectGitignore) {
      await this.loadGitignore();
    }

    // Find files using glob patterns
    const files = await this.findFiles();

    logger.debug(`Found ${files.length} files`);

    return files;
  }

  /**
   * Load .gitignore file and create ignore filter
   */
  private async loadGitignore(): Promise<void> {
    const gitignorePath = join(this.rootDir, '.gitignore');

    if (!(await fileExists(gitignorePath))) {
      logger.debug('No .gitignore found');
      return;
    }

    const content = await readFile(gitignorePath);
    if (!content) {
      logger.warn('Failed to read .gitignore');
      return;
    }

    // Create ignore filter
    this.ignoreFilter = ignore().add(content);

    // Always ignore node_modules and common build directories
    this.ignoreFilter.add([
      'node_modules/',
      'dist/',
      'build/',
      '.next/',
      '.nuxt/',
      'out/',
      'coverage/',
      '.cache/',
      '.docgen-cache/',
    ]);

    logger.debug('Loaded .gitignore rules');
  }

  /**
   * Find files matching the include/exclude patterns
   */
  private async findFiles(): Promise<string[]> {
    const allFiles: string[] = [];

    // Process each include pattern
    for (const pattern of this.patterns.include) {
      logger.debug(`Searching for pattern: ${pattern}`);

      // Use glob to find matching files
      const matches = await glob(pattern, {
        cwd: this.rootDir,
        absolute: true,
        ignore: this.patterns.exclude,
        nodir: true, // Only files, no directories
      });

      allFiles.push(...matches);
    }

    // Remove duplicates
    const uniqueFiles = Array.from(new Set(allFiles));

    // Apply .gitignore filter if loaded
    if (this.ignoreFilter) {
      return uniqueFiles.filter((file) => {
        const relativePath = normalizePath(relative(this.rootDir, file));
        return !this.ignoreFilter!.ignores(relativePath);
      });
    }

    return uniqueFiles;
  }
}

/**
 * Walk a directory and collect file paths
 *
 * Convenience function for simple use cases.
 */
export async function walkDirectory(
  rootDir: string,
  patterns: FileConfig
): Promise<string[]> {
  const walker = new FileWalker({
    rootDir,
    patterns,
  });

  return walker.walk();
}
