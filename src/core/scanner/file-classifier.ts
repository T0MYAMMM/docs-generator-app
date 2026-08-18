/**
 * FileClassifier - File type detection and classification
 *
 * Determines the type, language, and framework of source files.
 * Used by the scanner to categorize files for analysis.
 */

import { extname } from 'path';
import {
  FileType,
  Language,
  Framework,
  FileNode,
} from '../../types/index.js';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger.js';
import {
  normalizePath,
  isTestFile,
  isConfigFile,
} from '../../utils/helpers.js';

/**
 * File extension to FileType mapping
 */
const FILE_TYPE_MAP: Record<string, FileType> = {
  '.ts': 'typescript',
  '.tsx': 'typescript-jsx',
  '.js': 'javascript',
  '.jsx': 'javascript-jsx',
  '.py': 'python',
  '.json': 'json',
  '.md': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
};

/**
 * Framework detection patterns
 */
const FRAMEWORK_PATTERNS = {
  nextjs: [
    /pages\/.*\.(tsx?|jsx?)$/,
    /app\/.*\.(tsx?|jsx?)$/,
    /next\.config\./,
  ],
  react: [/\.tsx?$/, /\.jsx$/],
  vue: [/\.vue$/],
  node: [/server\.(ts|js)$/, /index\.(ts|js)$/],
  django: [
    /models\.py$/,
    /views\.py$/,
    /settings\.py$/,
    /admin\.py$/,
  ],
  flask: [
    /app\.py$/,
    /routes\.py$/,
    /__init__\.py$/,
  ],
  fastapi: [
    /main\.py$/,
    /routers\//,
  ],
  airflow: [
    /dags\//,
    /_dag\.py$/,
    /operators\//,
    /sensors\//,
  ],
};

/**
 * FileClassifier class for file type detection
 */
export class FileClassifier {
  /**
   * Classify a file and return FileNode information
   */
  async classify(
    filePath: string,
    rootDir: string
  ): Promise<FileNode | null> {
    try {
      // Get file stats
      const stats = await fs.stat(filePath);

      // Skip if not a regular file
      if (!stats.isFile()) {
        return null;
      }

      // Determine file type
      const type = this.detectFileType(filePath);

      // Skip if unknown type
      if (type === 'unknown') {
        logger.debug(`Skipping unknown file type: ${filePath}`);
        return null;
      }

      // Determine language
      const language = this.detectLanguage(type);

      // Detect framework
      const framework = await this.detectFramework(filePath, rootDir);

      // Get relative path
      const relativePath = normalizePath(
        filePath.replace(rootDir + '/', '')
      );

      return {
        path: filePath,
        relativePath,
        type,
        language,
        framework,
        size: stats.size,
        lastModified: stats.mtime,
        isTest: isTestFile(filePath),
        isConfig: isConfigFile(filePath),
      };
    } catch (error) {
      logger.debug(`Failed to classify file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Detect file type from extension
   */
  private detectFileType(filePath: string): FileType {
    const ext = extname(filePath).toLowerCase();

    // Check if it's a config file
    if (isConfigFile(filePath)) {
      return 'config';
    }

    // Use extension mapping
    return FILE_TYPE_MAP[ext] || 'unknown';
  }

  /**
   * Detect language from file type
   */
  private detectLanguage(type: FileType): Language {
    switch (type) {
      case 'typescript':
      case 'typescript-jsx':
        return 'typescript';

      case 'javascript':
      case 'javascript-jsx':
        return 'javascript';

      case 'python':
        return 'python';

      default:
        return 'unknown';
    }
  }

  /**
   * Detect framework by analyzing file path and content
   */
  private async detectFramework(
    filePath: string,
    rootDir: string
  ): Promise<Framework | undefined> {
    const relativePath = normalizePath(filePath.replace(rootDir + '/', ''));

    // Check Next.js patterns
    if (FRAMEWORK_PATTERNS.nextjs.some((pattern) => pattern.test(relativePath))) {
      return 'nextjs';
    }

    // Check React patterns (TSX/JSX files)
    if (FRAMEWORK_PATTERNS.react.some((pattern) => pattern.test(relativePath))) {
      // Read file content to check for React imports
      const hasReact = await this.checkForReactImports(filePath);
      if (hasReact) {
        return 'react';
      }
    }

    // Check Vue patterns
    if (FRAMEWORK_PATTERNS.vue.some((pattern) => pattern.test(relativePath))) {
      return 'vue';
    }

    // Check Node patterns
    if (FRAMEWORK_PATTERNS.node.some((pattern) => pattern.test(relativePath))) {
      return 'node';
    }

    // Check Python frameworks (check path first, then content for more accuracy)
    if (filePath.endsWith('.py')) {
      // Check Airflow first (path-based detection)
      if (FRAMEWORK_PATTERNS.airflow.some((pattern) => pattern.test(relativePath))) {
        return 'airflow';
      }

      // Check Django patterns
      if (FRAMEWORK_PATTERNS.django.some((pattern) => pattern.test(relativePath))) {
        return 'django';
      }

      // Check Flask patterns
      if (FRAMEWORK_PATTERNS.flask.some((pattern) => pattern.test(relativePath))) {
        return 'flask';
      }

      // Check FastAPI patterns
      if (FRAMEWORK_PATTERNS.fastapi.some((pattern) => pattern.test(relativePath))) {
        return 'fastapi';
      }

      // Content-based detection for Python frameworks
      const pythonFramework = await this.checkForPythonFrameworkImports(filePath);
      if (pythonFramework) {
        return pythonFramework;
      }
    }

    return 'none';
  }

  /**
   * Check if a file imports React
   */
  private async checkForReactImports(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for React imports
      const reactImportPatterns = [
        /import\s+(?:React|{[^}]*})\s+from\s+['"]react['"]/,
        /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/,
        /require\(['"]react['"]\)/,
      ];

      return reactImportPatterns.some((pattern) => pattern.test(content));
    } catch {
      return false;
    }
  }

  /**
   * Check if a Python file imports framework-specific modules
   */
  private async checkForPythonFrameworkImports(
    filePath: string
  ): Promise<Framework | undefined> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Check for Airflow imports (highest priority)
      if (
        content.includes('from airflow') ||
        content.includes('import airflow') ||
        content.includes('from airflow.') ||
        /from airflow\s+import|import airflow/.test(content)
      ) {
        return 'airflow';
      }

      // Check for Django imports
      if (
        content.includes('from django') ||
        content.includes('import django') ||
        /from django\s+import|import django/.test(content)
      ) {
        return 'django';
      }

      // Check for Flask imports
      if (
        content.includes('from flask') ||
        content.includes('import flask') ||
        content.includes('Flask(') ||
        /from flask\s+import|import flask/.test(content)
      ) {
        return 'flask';
      }

      // Check for FastAPI imports
      if (
        content.includes('from fastapi') ||
        content.includes('import fastapi') ||
        content.includes('FastAPI(') ||
        /from fastapi\s+import|import fastapi/.test(content)
      ) {
        return 'fastapi';
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Batch classify multiple files
   */
  async classifyBatch(
    filePaths: string[],
    rootDir: string
  ): Promise<FileNode[]> {
    logger.debug(`Classifying ${filePaths.length} files`);

    const results: FileNode[] = [];

    // Process files in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((filePath) => this.classify(filePath, rootDir))
      );

      // Filter out null results
      results.push(...batchResults.filter((node): node is FileNode => node !== null));
    }

    logger.debug(`Classified ${results.length} files`);

    return results;
  }

  /**
   * Get file type statistics
   */
  getFileTypeStats(files: FileNode[]): Record<FileType, number> {
    const stats: Record<FileType, number> = {
      typescript: 0,
      'typescript-jsx': 0,
      javascript: 0,
      'javascript-jsx': 0,
      python: 0,
      json: 0,
      markdown: 0,
      yaml: 0,
      config: 0,
      unknown: 0,
    };

    for (const file of files) {
      stats[file.type]++;
    }

    return stats;
  }

  /**
   * Filter files by type
   */
  filterByType(files: FileNode[], types: FileType[]): FileNode[] {
    return files.filter((file) => types.includes(file.type));
  }

  /**
   * Filter files by language
   */
  filterByLanguage(files: FileNode[], languages: Language[]): FileNode[] {
    return files.filter((file) => languages.includes(file.language));
  }

  /**
   * Filter out test and config files
   */
  filterProductionFiles(files: FileNode[]): FileNode[] {
    return files.filter((file) => !file.isTest && !file.isConfig);
  }

  /**
   * Get only source code files (TypeScript/JavaScript)
   */
  getSourceFiles(files: FileNode[]): FileNode[] {
    return files.filter(
      (file) =>
        file.language === 'typescript' || file.language === 'javascript'
    );
  }
}

/**
 * Classify a single file
 *
 * Convenience function for simple use cases.
 */
export async function classifyFile(
  filePath: string,
  rootDir: string
): Promise<FileNode | null> {
  const classifier = new FileClassifier();
  return classifier.classify(filePath, rootDir);
}

/**
 * Classify multiple files
 *
 * Convenience function for batch classification.
 */
export async function classifyFiles(
  filePaths: string[],
  rootDir: string
): Promise<FileNode[]> {
  const classifier = new FileClassifier();
  return classifier.classifyBatch(filePaths, rootDir);
}
