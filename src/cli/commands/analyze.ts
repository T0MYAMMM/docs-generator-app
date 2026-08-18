/**
 * Analyze command - Analyze a project and display results
 */

import { resolve } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { Scanner } from '../../core/scanner/index.js';
import { Analyzer } from '../../core/analyzer/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Command options
 */
interface AnalyzeOptions {
  tests?: boolean;
  configs?: boolean;
  gitignore?: boolean;
  llm?: boolean;
  llmModel?: string;
}

/**
 * Analyze command handler
 */
export async function analyzeCommand(
  path: string,
  options: AnalyzeOptions
): Promise<void> {
  try {
    const rootDir = resolve(path);
    logger.info(`Analyzing project: ${chalk.cyan(rootDir)}`);

    // Step 1: Scan project
    const spinner = ora('Scanning project files...').start();

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

    const scanResult = await scanner.scan();
    spinner.succeed(`Scanned ${scanResult.files.length} files`);

    // Step 2: Analyze files
    spinner.start('Analyzing code...');

    const analyzer = new Analyzer({
      extractComments: true,
      detectPatterns: true,
      enhanceWithLLM: options.llm || false,
      llmModel: options.llmModel || 'codellama:latest',
      llmExportedOnly: true,
    });

    const sourceFiles = scanner.getSourceFiles(scanResult.files);

    const analysisResult = await analyzer.analyze(sourceFiles, {
      name: scanResult.config.name,
      path: rootDir,
      type: scanResult.config.framework,
      dependencies: scanResult.config.dependencies,
    });

    spinner.succeed('Analysis complete!');

    // Display results
    displayResults(analyzer, analysisResult);
  } catch (error) {
    logger.error('Failed to analyze project');
    logger.errorWithStack('Error:', error as Error);
    process.exit(1);
  }
}

/**
 * Display analysis results
 */
function displayResults(analyzer: Analyzer, result: any): void {
  console.log('');
  console.log(chalk.bold.blue('📊 Analysis Results'));
  console.log(chalk.gray('─'.repeat(60)));

  // Project information
  console.log('');
  console.log(chalk.bold('Project:'));
  console.log(`  Name:        ${chalk.cyan(result.analysis.project.name)}`);
  console.log(`  Type:        ${chalk.cyan(result.analysis.project.type)}`);
  console.log(`  Files:       ${chalk.green(result.analysis.project.fileCount)}`);
  console.log('');

  // Symbol statistics
  const stats = analyzer.getStatistics(result);

  console.log(chalk.bold('Symbols Extracted:'));
  console.log(`  Total:       ${chalk.green(stats.totalSymbols)}`);
  console.log(`  Exported:    ${chalk.green(stats.exported)}`);
  console.log(`  With Docs:   ${chalk.yellow(stats.withComments)}/${stats.totalSymbols}`);
  console.log('');

  // By type
  console.log(chalk.bold('By Type:'));
  for (const [type, count] of Object.entries(stats.byType)) {
    const icon = getTypeIcon(type);
    console.log(`  ${icon} ${type.padEnd(15)} ${chalk.cyan(count)}`);
  }
  console.log('');

  // Type definitions
  console.log(chalk.bold('Type Definitions:'));
  console.log(`  Interfaces:  ${chalk.cyan(countByKind(result.analysis.types, 'interface'))}`);
  console.log(`  Types:       ${chalk.cyan(countByKind(result.analysis.types, 'type'))}`);
  console.log(`  Enums:       ${chalk.cyan(countByKind(result.analysis.types, 'enum'))}`);
  console.log('');

  // Patterns
  if (result.analysis.patterns.length > 0) {
    console.log(chalk.bold('Detected Patterns:'));
    const patternCounts = countPatterns(result.analysis.patterns);
    for (const [type, count] of Object.entries(patternCounts)) {
      console.log(`  ${getPatternIcon(type)} ${type.padEnd(20)} ${chalk.cyan(count)}`);
    }
    console.log('');
  }

  // Sample symbols
  console.log(chalk.bold('Sample Symbols:'));
  const sampleSymbols = result.analysis.symbols.filter((s: any) => s.exported).slice(0, 10);

  for (const symbol of sampleSymbols) {
    const icon = getTypeIcon(symbol.type);
    const comment = symbol.comment ? chalk.green('✓') : chalk.gray('○');
    console.log(
      `  ${icon} ${symbol.name.padEnd(30)} ${comment} ${chalk.gray(symbol.type)}`
    );
  }

  if (result.analysis.symbols.length > 10) {
    console.log(`  ${chalk.gray(`... and ${result.analysis.symbols.length - 10} more`)}`);
  }

  console.log('');

  // Duration
  console.log(chalk.bold('Performance:'));
  console.log(`  Duration:    ${chalk.green(result.duration)}ms`);
  console.log('');

  console.log(chalk.gray('─'.repeat(60)));
  console.log('');
  console.log(chalk.green('✓ Analysis completed successfully!'));
  console.log('');
}

/**
 * Get icon for symbol type
 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    function: '𝑓',
    class: 'C',
    interface: 'I',
    type: 'T',
    variable: 'v',
    constant: 'c',
    component: '⚛',
    hook: '↻',
    enum: 'E',
  };

  return icons[type] || '•';
}

/**
 * Get icon for pattern type
 */
function getPatternIcon(type: string): string {
  const icons: Record<string, string> = {
    'react-component': '⚛',
    hook: '↻',
    'nextjs-page': '📄',
    'api-route': '🔌',
    util: '🔧',
    config: '⚙',
  };

  return icons[type] || '●';
}

/**
 * Count types by kind
 */
function countByKind(types: any[], kind: string): number {
  return types.filter((t) => t.kind === kind).length;
}

/**
 * Count patterns by type
 */
function countPatterns(patterns: any[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const pattern of patterns) {
    counts[pattern.type] = (counts[pattern.type] || 0) + 1;
  }

  return counts;
}
