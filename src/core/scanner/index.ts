/**
 * Scanner - Main orchestrator for project scanning
 *
 * Combines FileWalker, FileClassifier, and ConfigLoader to scan a project
 * and collect all necessary information for documentation generation.
 */

import { FileWalker } from './file-walker.js';
import { FileClassifier } from './file-classifier.js';
import { ConfigLoader, ProjectConfig } from './config-loader.js';
import { FileConfig, FileNode, ScanResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Scanner options
 */
export interface ScannerOptions {
  /** Project root directory */
  rootDir: string;

  /** File selection patterns */
  patterns: FileConfig;

  /** Respect .gitignore */
  respectGitignore?: boolean;

  /** Include test files */
  includeTests?: boolean;

  /** Include config files */
  includeConfigs?: boolean;
}

/**
 * Scanner result with project config
 */
export interface ScanResultWithConfig extends ScanResult {
  /** Project configuration */
  config: ProjectConfig;
}

/**
 * Scanner class - orchestrates the file discovery and classification process
 */
export class Scanner {
  private rootDir: string;
  private patterns: FileConfig;
  private respectGitignore: boolean;
  private includeTests: boolean;
  private includeConfigs: boolean;

  constructor(options: ScannerOptions) {
    this.rootDir = options.rootDir;
    this.patterns = options.patterns;
    this.respectGitignore = options.respectGitignore ?? true;
    this.includeTests = options.includeTests ?? false;
    this.includeConfigs = options.includeConfigs ?? true;
  }

  /**
   * Scan the project and collect all files
   */
  async scan(): Promise<ScanResultWithConfig> {
    const startTime = Date.now();

    logger.info(`Scanning project: ${this.rootDir}`);

    // Step 1: Load project configuration
    logger.info('Loading project configuration...');
    const config = await this.loadConfig();

    // Step 2: Walk directory tree
    logger.info('Walking directory tree...');
    const filePaths = await this.walkDirectory();

    // Step 3: Classify files
    logger.info(`Classifying ${filePaths.length} files...`);
    const files = await this.classifyFiles(filePaths);

    // Step 4: Filter files based on options
    logger.info('Filtering files...');
    const filteredFiles = this.filterFiles(files);

    // Step 5: Generate statistics
    const stats = this.generateStats(filteredFiles);

    const duration = Date.now() - startTime;

    logger.success(
      `Scan complete: ${filteredFiles.length} files in ${duration}ms`
    );
    logger.info(`  TypeScript: ${stats.typescript + stats['typescript-jsx']}`);
    logger.info(`  JavaScript: ${stats.javascript + stats['javascript-jsx']}`);
    logger.info(`  Config: ${stats.config}`);

    return {
      files: filteredFiles,
      totalFiles: filePaths.length,
      filesByType: stats,
      errors: [],
      config,
    };
  }

  /**
   * Load project configuration
   */
  private async loadConfig(): Promise<ProjectConfig> {
    const configLoader = new ConfigLoader(this.rootDir);
    return configLoader.load();
  }

  /**
   * Walk directory and collect file paths
   */
  private async walkDirectory(): Promise<string[]> {
    const walker = new FileWalker({
      rootDir: this.rootDir,
      patterns: this.patterns,
      respectGitignore: this.respectGitignore,
    });

    return walker.walk();
  }

  /**
   * Classify files
   */
  private async classifyFiles(filePaths: string[]): Promise<FileNode[]> {
    const classifier = new FileClassifier();
    return classifier.classifyBatch(filePaths, this.rootDir);
  }

  /**
   * Filter files based on scanner options
   */
  private filterFiles(files: FileNode[]): FileNode[] {
    let filtered = files;

    // Filter out test files if not included
    if (!this.includeTests) {
      filtered = filtered.filter((file) => !file.isTest);
      logger.debug(`Filtered out test files: ${files.length - filtered.length}`);
    }

    // Filter out config files if not included
    if (!this.includeConfigs) {
      filtered = filtered.filter((file) => !file.isConfig);
      logger.debug(`Filtered out config files: ${files.length - filtered.length}`);
    }

    // Only keep source code files (TypeScript/JavaScript/Python)
    filtered = filtered.filter(
      (file) =>
        file.language === 'typescript' ||
        file.language === 'javascript' ||
        file.language === 'python' ||
        file.type === 'config' ||
        file.type === 'json'
    );

    return filtered;
  }

  /**
   * Generate file type statistics
   */
  private generateStats(files: FileNode[]): ScanResult['filesByType'] {
    const classifier = new FileClassifier();
    return classifier.getFileTypeStats(files);
  }

  /**
   * Get only source code files (for analysis)
   */
  getSourceFiles(files: FileNode[]): FileNode[] {
    return files.filter(
      (file) =>
        (file.language === 'typescript' || file.language === 'javascript') &&
        !file.isTest &&
        !file.isConfig
    );
  }

  /**
   * Get test files
   */
  getTestFiles(files: FileNode[]): FileNode[] {
    return files.filter((file) => file.isTest);
  }

  /**
   * Get config files
   */
  getConfigFiles(files: FileNode[]): FileNode[] {
    return files.filter((file) => file.isConfig);
  }

  /**
   * Group files by directory
   */
  groupByDirectory(files: FileNode[]): Map<string, FileNode[]> {
    const groups = new Map<string, FileNode[]>();

    for (const file of files) {
      // Get directory from relative path
      const parts = file.relativePath.split('/');
      const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';

      if (!groups.has(directory)) {
        groups.set(directory, []);
      }

      groups.get(directory)!.push(file);
    }

    return groups;
  }

  /**
   * Group files by framework/pattern
   */
  groupByFramework(files: FileNode[]): Map<string, FileNode[]> {
    const groups = new Map<string, FileNode[]>();

    for (const file of files) {
      const framework = file.framework || 'none';

      if (!groups.has(framework)) {
        groups.set(framework, []);
      }

      groups.get(framework)!.push(file);
    }

    return groups;
  }
}

/**
 * Scan a project
 *
 * Convenience function for simple use cases.
 */
export async function scanProject(
  rootDir: string,
  patterns: FileConfig
): Promise<ScanResultWithConfig> {
  const scanner = new Scanner({
    rootDir,
    patterns,
  });

  return scanner.scan();
}

// Export sub-modules
export { FileWalker } from './file-walker.js';
export { FileClassifier } from './file-classifier.js';
export { ConfigLoader } from './config-loader.js';
export type { ProjectConfig } from './config-loader.js';
