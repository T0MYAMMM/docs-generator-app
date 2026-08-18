/**
 * Configuration Loader
 *
 * Loads and validates docgen.config.yml configuration files.
 */

import { readFile, access } from 'fs/promises';
import { parse } from 'yaml';
import { join } from 'path';
import { DocGenConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: DocGenConfig = {
  project: {
    path: '.',
  },
  files: {
    include: ['**/*.{ts,tsx,js,jsx,py}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/__pycache__/**',
      '**/*.pyc',
    ],
  },
  llm: {
    provider: 'ollama',
    model: 'codellama:latest',
    baseURL: 'http://localhost:11434',
    temperature: 0.3,
    maxTokens: 2048,
  },
  output: {
    path: './docs',
    structure: 'custom',
    clean: false,
  },
  generate: {
    overview: true,
    api: true,
    components: true,
    setup: false,
    architecture: true,
    guides: false,
  },
  frontmatter: {
    author: 'DocGen',
    defaultTags: ['auto-generated', 'documentation'],
  },
  performance: {
    parallel: 4,
    cache: true,
    cacheDir: './.docgen-cache',
  },
  behavior: {
    skipExisting: false,
    updateMode: 'smart',
    dryRun: false,
    verbose: false,
  },
};

/**
 * Config file names to search for
 */
const CONFIG_FILE_NAMES = [
  'docgen.config.yml',
  'docgen.config.yaml',
  '.docgenrc.yml',
  '.docgenrc.yaml',
];

/**
 * Load configuration from file
 */
export async function loadConfig(configPath?: string): Promise<DocGenConfig> {
  let config: Partial<DocGenConfig> = {};

  // If config path provided, try to load it
  if (configPath) {
    try {
      const content = await readFile(configPath, 'utf-8');
      config = parse(content) as Partial<DocGenConfig>;
      logger.info(`Loaded config from: ${configPath}`);
    } catch (error) {
      logger.error(`Failed to load config from ${configPath}:`, error);
      throw new Error(`Config file not found or invalid: ${configPath}`);
    }
  } else {
    // Search for config file in current directory
    config = await findAndLoadConfig(process.cwd());
  }

  // Merge with defaults
  return mergeConfig(DEFAULT_CONFIG, config);
}

/**
 * Find and load config file in directory
 */
async function findAndLoadConfig(dir: string): Promise<Partial<DocGenConfig>> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(dir, fileName);

    try {
      await access(filePath);
      const content = await readFile(filePath, 'utf-8');
      const config = parse(content) as Partial<DocGenConfig>;
      logger.info(`Found config file: ${fileName}`);
      return config;
    } catch {
      // File doesn't exist, try next
      continue;
    }
  }

  logger.debug('No config file found, using defaults');
  return {};
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(
  defaults: DocGenConfig,
  override: Partial<DocGenConfig>
): DocGenConfig {
  const merged = { ...defaults };

  // Merge project
  if (override.project) {
    merged.project = { ...defaults.project, ...override.project };
  }

  // Merge files
  if (override.files) {
    merged.files = {
      include: override.files.include || defaults.files.include,
      exclude: override.files.exclude || defaults.files.exclude,
    };
  }

  // Merge LLM
  if (override.llm) {
    merged.llm = { ...defaults.llm, ...override.llm };
  }

  // Merge output
  if (override.output) {
    merged.output = { ...defaults.output, ...override.output };
  }

  // Merge generate
  if (override.generate) {
    merged.generate = { ...defaults.generate, ...override.generate };
  }

  // Merge templates
  if (override.templates) {
    merged.templates = override.templates;
  }

  // Merge frontmatter
  if (override.frontmatter) {
    merged.frontmatter = { ...defaults.frontmatter, ...override.frontmatter };
  }

  // Merge performance
  if (override.performance) {
    merged.performance = { ...defaults.performance, ...override.performance };
  }

  // Merge behavior
  if (override.behavior) {
    merged.behavior = { ...defaults.behavior, ...override.behavior };
  }

  return merged;
}

/**
 * Validate configuration
 */
export function validateConfig(config: DocGenConfig): string[] {
  const errors: string[] = [];

  // Validate files
  if (!config.files.include || config.files.include.length === 0) {
    errors.push('files.include must contain at least one pattern');
  }

  // Validate output
  if (!config.output.path) {
    errors.push('output.path is required');
  }

  if (!['mirror', 'flat', 'custom'].includes(config.output.structure)) {
    errors.push('output.structure must be "mirror", "flat", or "custom"');
  }

  // Validate LLM
  if (!config.llm.model) {
    errors.push('llm.model is required');
  }

  if (config.llm.temperature < 0 || config.llm.temperature > 1) {
    errors.push('llm.temperature must be between 0 and 1');
  }

  // Validate performance
  if (config.performance.parallel < 1) {
    errors.push('performance.parallel must be at least 1');
  }

  return errors;
}

/**
 * Generate example config content
 */
export function generateExampleConfig(): string {
  return `# DocGen Configuration File
# Documentation: https://github.com/yourusername/docgen

# Project configuration
project:
  path: .
  name: My Project
  type: nextjs  # nextjs, react, typescript, javascript

# File selection
files:
  include:
    - "src/**/*.{ts,tsx,js,jsx}"
    - "app/**/*.{ts,tsx}"
    - "lib/**/*.ts"
  exclude:
    - "**/*.test.{ts,tsx}"
    - "**/*.spec.{ts,tsx}"
    - "**/node_modules/**"
    - "**/.next/**"
    - "**/dist/**"

# Output configuration
output:
  path: ./docs
  structure: custom  # mirror, flat, or custom
  clean: false  # Clean output directory before generation

# LLM configuration
llm:
  provider: ollama
  model: codellama:latest
  baseURL: http://localhost:11434
  temperature: 0.3
  maxTokens: 2048

# Documentation types to generate
generate:
  overview: true
  api: true
  components: true
  setup: false
  architecture: true
  guides: false

# Custom templates (optional)
# templates:
#   component: ./templates/component.hbs
#   function: ./templates/function.hbs

# Frontmatter defaults
frontmatter:
  author: DocGen
  defaultTags:
    - auto-generated
    - documentation

# Performance settings
performance:
  parallel: 4  # Number of parallel LLM calls
  cache: true
  cacheDir: ./.docgen-cache

# Behavior settings
behavior:
  skipExisting: false  # Skip files that already exist
  updateMode: smart    # smart, force, or never
  dryRun: false
  verbose: false
`;
}
