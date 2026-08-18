/**
 * Init command
 *
 * Initialize a new docgen configuration file.
 */

import { writeFile, access } from 'fs/promises';
import { join } from 'path';
import enquirer from 'enquirer';
import chalk from 'chalk';
import { generateExampleConfig } from '../../core/config/config-loader.js';
import { logger } from '../../utils/logger.js';

interface InitOptions {
  force?: boolean;
  interactive?: boolean;
}

/**
 * Initialize configuration file
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
  const configPath = join(process.cwd(), 'docgen.config.yml');

  // Check if config already exists
  try {
    await access(configPath);

    if (!options.force) {
      console.log(chalk.yellow('\n⚠️  Config file already exists: docgen.config.yml'));
      console.log(chalk.gray('Use --force to overwrite\n'));
      return;
    }
  } catch {
    // File doesn't exist, proceed
  }

  console.log(chalk.bold.cyan('\n📝 Initializing DocGen Configuration\n'));

  let config: string;

  if (options.interactive) {
    // Interactive mode
    config = await createInteractiveConfig();
  } else {
    // Use example config
    config = generateExampleConfig();
  }

  // Write config file
  await writeFile(configPath, config, 'utf-8');

  console.log(chalk.green('\n✅ Created docgen.config.yml\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Edit docgen.config.yml to customize settings'));
  console.log(chalk.gray('  2. Run: docgen generate'));
  console.log(chalk.gray('  3. View your documentation in ./docs\n'));
}

/**
 * Create config interactively
 */
async function createInteractiveConfig(): Promise<string> {
  const answers = await enquirer.prompt<{
    projectName: string;
    projectType: string;
    includePaths: string;
    excludeTests: boolean;
    outputPath: string;
    outputStructure: string;
    llmModel: string;
    generateOverview: boolean;
    generateArchitecture: boolean;
  }>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name?',
      initial: 'My Project',
    },
    {
      type: 'select',
      name: 'projectType',
      message: 'Project type?',
      choices: ['nextjs', 'react', 'typescript', 'javascript', 'node'],
      initial: 0,
    },
    {
      type: 'input',
      name: 'includePaths',
      message: 'Include patterns (comma-separated)?',
      initial: 'src/**/*.{ts,tsx}',
    },
    {
      type: 'confirm',
      name: 'excludeTests',
      message: 'Exclude test files?',
      initial: true,
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output directory?',
      initial: './docs',
    },
    {
      type: 'select',
      name: 'outputStructure',
      message: 'Output structure?',
      choices: [
        { name: 'custom', message: 'Custom (organized by type)' },
        { name: 'mirror', message: 'Mirror (same as source)' },
        { name: 'flat', message: 'Flat (all in one directory)' },
      ],
      initial: 0,
    },
    {
      type: 'input',
      name: 'llmModel',
      message: 'LLM model?',
      initial: 'codellama:latest',
    },
    {
      type: 'confirm',
      name: 'generateOverview',
      message: 'Generate project overview?',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'generateArchitecture',
      message: 'Generate architecture docs?',
      initial: true,
    },
  ]);

  // Build config from answers
  const includePaths = answers.includePaths.split(',').map((p) => p.trim());
  const excludePaths = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    ...(answers.excludeTests ? ['**/*.test.*', '**/*.spec.*'] : []),
  ];

  return `# DocGen Configuration File

# Project configuration
project:
  path: .
  name: ${answers.projectName}
  type: ${answers.projectType}

# File selection
files:
  include:
${includePaths.map((p) => `    - "${p}"`).join('\n')}
  exclude:
${excludePaths.map((p) => `    - "${p}"`).join('\n')}

# Output configuration
output:
  path: ${answers.outputPath}
  structure: ${answers.outputStructure}
  clean: false

# LLM configuration
llm:
  provider: ollama
  model: ${answers.llmModel}
  baseURL: http://localhost:11434
  temperature: 0.3
  maxTokens: 2048

# Documentation types to generate
generate:
  overview: ${answers.generateOverview}
  api: true
  components: true
  setup: false
  architecture: ${answers.generateArchitecture}
  guides: false

# Frontmatter defaults
frontmatter:
  author: DocGen
  defaultTags:
    - auto-generated
    - documentation

# Performance settings
performance:
  parallel: 4
  cache: true
  cacheDir: ./.docgen-cache

# Behavior settings
behavior:
  skipExisting: false
  updateMode: smart
  dryRun: false
  verbose: false
`;
}
