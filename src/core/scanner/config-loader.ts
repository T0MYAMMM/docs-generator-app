/**
 * ConfigLoader - Project configuration loader
 *
 * Loads and parses project configuration files like package.json and tsconfig.json.
 * Extracts useful information for documentation generation.
 */

import { join } from 'path';
import { Framework, ProjectMetadata } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { fileExists, readJSONFile } from '../../utils/helpers.js';

/**
 * Package.json structure (partial)
 */
interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * TSConfig structure (partial)
 */
interface TSConfig {
  compilerOptions?: {
    target?: string;
    module?: string;
    lib?: string[];
    jsx?: string;
    paths?: Record<string, string[]>;
    [key: string]: unknown;
  };
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

/**
 * Loaded project configuration
 */
export interface ProjectConfig {
  /** Project name */
  name: string;

  /** Project description */
  description?: string;

  /** Project version */
  version?: string;

  /** Detected framework */
  framework: Framework;

  /** All dependencies */
  dependencies: Record<string, string>;

  /** TypeScript configuration */
  tsConfig?: TSConfig;

  /** Package.json */
  packageJson?: PackageJson;
}

/**
 * ConfigLoader class for loading project configuration
 */
export class ConfigLoader {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /**
   * Load all project configuration
   */
  async load(): Promise<ProjectConfig> {
    logger.debug(`Loading project configuration from ${this.rootDir}`);

    // Load package.json
    const packageJson = await this.loadPackageJson();

    // Load tsconfig.json
    const tsConfig = await this.loadTSConfig();

    // Load Python project files
    const pythonDeps = await this.loadPythonDependencies();

    // Detect framework
    const framework = await this.detectFramework(packageJson, pythonDeps);

    // Merge dependencies
    const dependencies = {
      ...packageJson?.dependencies,
      ...packageJson?.devDependencies,
      ...pythonDeps,
    };

    // Determine project name
    const projectName = this.determineProjectName(packageJson);

    // Generate description
    const description = this.generateDescription(packageJson, framework);

    const config: ProjectConfig = {
      name: projectName,
      description: description || packageJson?.description,
      version: packageJson?.version,
      framework,
      dependencies,
      tsConfig,
      packageJson,
    };

    logger.debug(`Loaded config for project: ${config.name}`);
    logger.debug(`Detected framework: ${config.framework}`);

    return config;
  }

  /**
   * Load package.json
   */
  private async loadPackageJson(): Promise<PackageJson | undefined> {
    const packageJsonPath = join(this.rootDir, 'package.json');

    if (!(await fileExists(packageJsonPath))) {
      logger.warn('No package.json found');
      return undefined;
    }

    const packageJson = await readJSONFile<PackageJson>(packageJsonPath);

    if (!packageJson) {
      logger.error('Failed to parse package.json');
      return undefined;
    }

    logger.debug(`Loaded package.json: ${packageJson.name || 'unnamed'}`);
    return packageJson;
  }

  /**
   * Load tsconfig.json
   */
  private async loadTSConfig(): Promise<TSConfig | undefined> {
    const tsconfigPath = join(this.rootDir, 'tsconfig.json');

    if (!(await fileExists(tsconfigPath))) {
      logger.debug('No tsconfig.json found');
      return undefined;
    }

    const tsConfig = await readJSONFile<TSConfig>(tsconfigPath);

    if (!tsConfig) {
      logger.error('Failed to parse tsconfig.json');
      return undefined;
    }

    logger.debug('Loaded tsconfig.json');
    return tsConfig;
  }

  /**
   * Load Python dependencies from requirements.txt or setup.py
   */
  private async loadPythonDependencies(): Promise<Record<string, string>> {
    const deps: Record<string, string> = {};

    // Check for requirements.txt
    const requirementsPath = join(this.rootDir, 'requirements.txt');
    if (await fileExists(requirementsPath)) {
      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(requirementsPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            // Parse package==version or package>=version format
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)(==|>=|<=|>|<|~=)?(.+)?$/);
            if (match && match[1]) {
              deps[match[1]] = match[3] || '*';
            }
          }
        }

        logger.debug(`Loaded ${Object.keys(deps).length} Python dependencies from requirements.txt`);
      } catch (error) {
        logger.debug('Failed to read requirements.txt');
      }
    }

    return deps;
  }

  /**
   * Determine project name from package.json or directory
   */
  private determineProjectName(packageJson?: PackageJson): string {
    if (packageJson?.name) {
      return packageJson.name;
    }

    // Extract name from directory path
    const parts = this.rootDir.split('/');
    const dirName = parts[parts.length - 1];

    // Clean up directory name
    if (dirName && dirName !== '.' && dirName !== '..') {
      return dirName;
    }

    return 'unknown-project';
  }

  /**
   * Generate project description based on detected framework
   */
  private generateDescription(packageJson?: PackageJson, framework?: Framework): string | undefined {
    if (packageJson?.description) {
      return packageJson.description;
    }

    // Generate description based on framework
    switch (framework) {
      case 'airflow':
        return 'Apache Airflow project for workflow orchestration and data pipelines';
      case 'django':
        return 'Django web application';
      case 'flask':
        return 'Flask web application';
      case 'fastapi':
        return 'FastAPI web application';
      case 'nextjs':
        return 'Next.js web application';
      case 'react':
        return 'React application';
      case 'vue':
        return 'Vue.js application';
      case 'node':
        return 'Node.js application';
      default:
        return undefined;
    }
  }

  /**
   * Detect framework from dependencies
   */
  private async detectFramework(packageJson?: PackageJson, pythonDeps?: Record<string, string>): Promise<Framework> {
    // Check Python dependencies first
    if (pythonDeps && Object.keys(pythonDeps).length > 0) {
      // Check for Airflow
      if (pythonDeps['apache-airflow'] || pythonDeps['airflow']) {
        return 'airflow';
      }

      // Check for Django
      if (pythonDeps['Django'] || pythonDeps['django']) {
        return 'django';
      }

      // Check for Flask
      if (pythonDeps['Flask'] || pythonDeps['flask']) {
        return 'flask';
      }

      // Check for FastAPI
      if (pythonDeps['fastapi']) {
        return 'fastapi';
      }
    }

    // Check for DAG files in directory (Airflow detection)
    const hasDagFiles = await this.checkForAirflowDAGs();
    if (hasDagFiles) {
      return 'airflow';
    }

    if (!packageJson) {
      return 'none';
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for Next.js
    if (allDeps.next) {
      return 'nextjs';
    }

    // Check for React
    if (allDeps.react) {
      return 'react';
    }

    // Check for Vue
    if (allDeps.vue) {
      return 'vue';
    }

    // Default to Node.js
    if (allDeps.express || allDeps.fastify || allDeps.koa) {
      return 'node';
    }

    return 'none';
  }

  /**
   * Check if directory contains Airflow DAG files
   */
  private async checkForAirflowDAGs(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const glob = await import('glob');

      // Look for Python files with 'dag' in the name or containing DAG imports
      const dagFiles = glob.globSync('**/*dag*.py', {
        cwd: this.rootDir,
        ignore: ['**/node_modules/**', '**/.venv/**', '**/venv/**'],
        nodir: true,
      });

      if (dagFiles.length > 0) {
        // Check if any file imports airflow
        for (const file of dagFiles.slice(0, 5)) {  // Check first 5 files
          try {
            const content = await fs.readFile(join(this.rootDir, file), 'utf-8');
            if (content.includes('from airflow') || content.includes('import airflow')) {
              return true;
            }
          } catch {
            continue;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get major dependencies (popular frameworks/libraries)
   */
  getMajorDependencies(config: ProjectConfig): string[] {
    const major: string[] = [];

    const deps = config.dependencies;

    // Frontend frameworks
    if (deps.next) major.push('Next.js');
    if (deps.react) major.push('React');
    if (deps.vue) major.push('Vue');

    // Backend frameworks
    if (deps.express) major.push('Express');
    if (deps.fastify) major.push('Fastify');

    // UI libraries
    if (deps['@radix-ui/react-dialog']) major.push('Radix UI');
    if (deps['@headlessui/react']) major.push('Headless UI');

    // Styling
    if (deps.tailwindcss) major.push('Tailwind CSS');
    if (deps['styled-components']) major.push('Styled Components');

    // State management
    if (deps.redux) major.push('Redux');
    if (deps.zustand) major.push('Zustand');

    // Data fetching
    if (deps['@tanstack/react-query']) major.push('React Query');
    if (deps.swr) major.push('SWR');

    // Testing
    if (deps.vitest) major.push('Vitest');
    if (deps.jest) major.push('Jest');

    // Build tools
    if (deps.vite) major.push('Vite');
    if (deps.webpack) major.push('Webpack');

    return major;
  }

  /**
   * Check if project uses TypeScript
   */
  isTypeScriptProject(config: ProjectConfig): boolean {
    return (
      !!config.tsConfig ||
      !!config.dependencies.typescript ||
      !!config.packageJson?.devDependencies?.typescript
    );
  }

  /**
   * Check if project uses ESM modules
   */
  isESMProject(config: ProjectConfig): boolean {
    return config.packageJson?.type === 'module';
  }

  /**
   * Create ProjectMetadata from config
   */
  createMetadata(config: ProjectConfig, fileCount: number, symbolCount: number): ProjectMetadata {
    return {
      name: config.name,
      path: this.rootDir,
      type: config.framework,
      dependencies: config.dependencies,
      tsConfig: config.tsConfig as Record<string, unknown> | undefined,
      fileCount,
      symbolCount,
    };
  }
}

/**
 * Load project configuration
 *
 * Convenience function for simple use cases.
 */
export async function loadProjectConfig(rootDir: string): Promise<ProjectConfig> {
  const loader = new ConfigLoader(rootDir);
  return loader.load();
}
