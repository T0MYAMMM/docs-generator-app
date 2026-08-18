/**
 * Scan command - Scan a project and display results
 */

import { resolve } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { Scanner } from '../../core/scanner/index.js';
import { logger } from '../../utils/logger.js';
import { formatFileSize } from '../../utils/helpers.js';

/**
 * Command options
 */
interface ScanOptions {
  tests?: boolean;
  configs?: boolean;
  gitignore?: boolean;
}

/**
 * Scan command handler
 */
export async function scanCommand(
  path: string,
  options: ScanOptions
): Promise<void> {
  try {
    const rootDir = resolve(path);
    logger.info(`Scanning project: ${chalk.cyan(rootDir)}`);

    // Create scanner with default patterns
    const scanner = new Scanner({
      rootDir,
      patterns: {
        include: [
          '**/*.{ts,tsx,js,jsx}',
          '**/package.json',
          '**/tsconfig.json',
        ],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.next/**',
          '**/build/**',
          '**/coverage/**',
        ],
      },
      respectGitignore: options.gitignore !== false,
      includeTests: options.tests !== false,
      includeConfigs: options.configs !== false,
    });

    // Show spinner while scanning
    const spinner = ora('Scanning project...').start();

    // Run scan
    const result = await scanner.scan();

    spinner.succeed('Scan complete!');

    // Display results
    await displayResults(scanner, result);
  } catch (error) {
    logger.error('Failed to scan project');
    logger.errorWithStack('Error:', error as Error);
    process.exit(1);
  }
}

/**
 * Display scan results
 */
async function displayResults(scanner: Scanner, result: any): Promise<void> {
  console.log('');
  console.log(chalk.bold.blue('📊 Scan Results'));
  console.log(chalk.gray('─'.repeat(60)));

  // Project information
  console.log('');
  console.log(chalk.bold('Project Information:'));
  console.log(`  Name:        ${chalk.cyan(result.config.name)}`);
  console.log(`  Framework:   ${chalk.cyan(result.config.framework)}`);
  if (result.config.description) {
    console.log(`  Description: ${chalk.gray(result.config.description)}`);
  }
  console.log('');

  // File statistics
  console.log(chalk.bold('Files Found:'));
  console.log(`  Total:       ${chalk.green(result.files.length)}`);

  const sourceFiles = scanner.getSourceFiles(result.files);
  const testFiles = scanner.getTestFiles(result.files);
  const configFiles = scanner.getConfigFiles(result.files);

  console.log(`  Source:      ${chalk.green(sourceFiles.length)}`);
  console.log(`  Tests:       ${chalk.yellow(testFiles.length)}`);
  console.log(`  Config:      ${chalk.gray(configFiles.length)}`);
  console.log('');

  // File types
  console.log(chalk.bold('By Type:'));
  const stats = result.filesByType;
  if (stats.typescript + stats['typescript-jsx'] > 0) {
    console.log(
      `  TypeScript:  ${chalk.blue(stats.typescript + stats['typescript-jsx'])}`
    );
  }
  if (stats.javascript + stats['javascript-jsx'] > 0) {
    console.log(
      `  JavaScript:  ${chalk.yellow(stats.javascript + stats['javascript-jsx'])}`
    );
  }
  if (stats.json > 0) {
    console.log(`  JSON:        ${chalk.gray(stats.json)}`);
  }
  console.log('');

  // Directory breakdown
  console.log(chalk.bold('By Directory:'));
  const byDirectory = scanner.groupByDirectory(sourceFiles);

  // Sort by file count
  const sortedDirs = Array.from(byDirectory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [dir, files] of sortedDirs.slice(0, 10)) {
    const displayDir = dir === '.' ? '(root)' : dir;
    console.log(`  ${chalk.cyan(displayDir.padEnd(30))} ${chalk.gray(files.length)} files`);
  }

  if (sortedDirs.length > 10) {
    console.log(`  ${chalk.gray(`... and ${sortedDirs.length - 10} more`)}`);
  }

  console.log('');

  // Major dependencies
  const { ConfigLoader } = await import('../../core/scanner/config-loader.js');
  const configLoader = new ConfigLoader(result.config.path);
  const majorDeps = configLoader.getMajorDependencies(result.config);

  if (majorDeps.length > 0) {
    console.log(chalk.bold('Major Dependencies:'));
    for (const dep of majorDeps) {
      console.log(`  ${chalk.cyan('●')} ${dep}`);
    }
    console.log('');
  }

  // Total size
  const totalSize = result.files.reduce((sum, file) => sum + file.size, 0);
  console.log(chalk.bold('Total Size:'));
  console.log(`  ${chalk.green(formatFileSize(totalSize))}`);
  console.log('');

  // Sample files
  console.log(chalk.bold('Sample Files:'));
  for (const file of sourceFiles.slice(0, 5)) {
    const size = formatFileSize(file.size);
    console.log(`  ${chalk.gray(file.relativePath)} ${chalk.dim(`(${size})`)}`);
  }

  if (sourceFiles.length > 5) {
    console.log(`  ${chalk.gray(`... and ${sourceFiles.length - 5} more`)}`);
  }

  console.log('');
  console.log(chalk.gray('─'.repeat(60)));
  console.log('');
  console.log(chalk.green('✓ Scan completed successfully!'));
  console.log('');
}
