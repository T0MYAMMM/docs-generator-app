/**
 * Generate command
 *
 * Generate markdown documentation from analyzed code.
 */

import ora from 'ora';
import chalk from 'chalk';
import { Scanner } from '../../core/scanner/index.js';
import { Analyzer } from '../../core/analyzer/index.js';
import { Generator } from '../../core/generator/index.js';
import { LLMService } from '../../llm/llm-service.js';
import { loadConfig, validateConfig } from '../../core/config/config-loader.js';
import { logger } from '../../utils/logger.js';
import { AIGeneratedContent } from '../../types/index.js';

interface GenerateOptions {
  tests?: boolean;
  configs?: boolean;
  gitignore?: boolean;
  output?: string;
  config?: string;
  llm?: boolean;
  llmModel?: string;
  dryRun?: boolean;
  clean?: boolean;
}

/**
 * Generate documentation command
 */
export async function generateCommand(
  path: string,
  options: GenerateOptions
): Promise<void> {
  console.log(chalk.bold.cyan('\n📚 DocGen - Documentation Generator\n'));

  const spinner = ora('Loading configuration...').start();

  try {
    // Load configuration from file or use defaults
    const config = await loadConfig(options.config);

    // Override with CLI options
    config.project.path = path;

    if (options.output) {
      config.output.path = options.output;
    }

    if (options.llmModel) {
      config.llm.model = options.llmModel;
    }

    if (options.clean !== undefined) {
      config.output.clean = options.clean;
    }

    if (options.dryRun !== undefined) {
      config.behavior.dryRun = options.dryRun;
    }

    // Apply test/config exclusions
    if (options.tests === false) {
      config.files.exclude.push('**/*.test.*', '**/*.spec.*');
    }

    if (options.configs === false) {
      config.files.exclude.push('**/*.config.*');
    }

    // Validate configuration
    const errors = validateConfig(config);
    if (errors.length > 0) {
      spinner.fail('Invalid configuration');
      console.log(chalk.red('\nConfiguration errors:'));
      errors.forEach((error) => console.log(chalk.red(`  - ${error}`)));
      process.exit(1);
    }

    spinner.succeed('Configuration loaded');

    // Phase 1: Scan files
    spinner.text = 'Scanning project files...';
    const scanner = new Scanner({
      rootDir: path,
      patterns: {
        include: config.files.include,
        exclude: config.files.exclude,
      },
      respectGitignore: options.gitignore !== false,
      includeTests: options.tests !== false,
      includeConfigs: options.configs !== false,
    });

    const scanResult = await scanner.scan();
    spinner.succeed(
      `Found ${scanResult.files.length} files (${scanResult.filesByType.typescript || 0} TS, ${scanResult.filesByType['typescript-jsx'] || 0} TSX)`
    );

    if (scanResult.files.length === 0) {
      logger.warn('No files found to analyze');
      return;
    }

    // Phase 2: Analyze code
    spinner.start('Analyzing code structure...');
    const analyzer = new Analyzer();
    const analysisResult = await analyzer.analyze(scanResult.files, {
      name: scanResult.config.name,
      path: path,
      type: scanResult.config.framework,
      dependencies: scanResult.config.dependencies,
    });

    spinner.succeed(
      `Extracted ${analysisResult.analysis.symbols.length} symbols in ${analysisResult.duration}ms`
    );

    // Log symbol counts by type
    const symbolCounts = analysisResult.analysis.symbols.reduce((acc, symbol) => {
      acc[symbol.type] = (acc[symbol.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Symbol breakdown:', symbolCounts);

    // Phase 3: LLM Enhancement (optional)
    let aiContent: Map<string, AIGeneratedContent> | undefined;

    if (options.llm) {
      spinner.start('Enhancing documentation with LLM...');

      try {
        const llmService = new LLMService(config.llm);

        // Check if Ollama is available
        const isAvailable = await llmService.checkAvailability();
        if (!isAvailable) {
          spinner.warn('Ollama not available, skipping LLM enhancement');
        } else {
          aiContent = await llmService.enhanceAnalysis(analysisResult.analysis);
          spinner.succeed(`LLM enhancement complete (${aiContent.size} entries)`);
        }
      } catch (error) {
        spinner.warn(`LLM enhancement failed: ${(error as Error).message}`);
        logger.debug('LLM error:', error);
      }
    }

    // Phase 4: Generate documentation
    spinner.start('Generating markdown documentation...');
    const generator = new Generator(config);

    if (config.behavior.dryRun) {
      spinner.info('Dry run mode - no files will be written');
    }

    const result = await generator.generate(analysisResult.analysis, aiContent);

    if (result.errors.length > 0) {
      spinner.warn(
        `Generated ${result.filesGenerated} files with ${result.errors.length} errors in ${result.duration}ms`
      );
      logger.warn('Errors:', result.errors);
    } else {
      spinner.succeed(
        `Generated ${result.filesGenerated} documentation files in ${result.duration}ms`
      );
    }

    // Phase 5: Generate indices
    if (!config.behavior.dryRun && result.filesGenerated > 0) {
      spinner.start('Generating index files...');
      await generator.generateIndices(result.documents);
      spinner.succeed('Index files generated');
    }

    // Summary
    console.log(chalk.bold.green('\n✅ Documentation generation complete!\n'));
    console.log(chalk.cyan('Summary:'));
    console.log(`  ${chalk.gray('Output directory:')} ${config.output.path}`);
    console.log(`  ${chalk.gray('Files generated:')} ${result.filesGenerated}`);

    if (options.llm && aiContent) {
      console.log(`  ${chalk.gray('LLM-enhanced entries:')} ${aiContent.size}`);
    }

    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.gray(`  1. Review the generated docs in ${config.output.path}`));
    console.log(chalk.gray(`  2. Copy to My Bookshelf: cp -r ${config.output.path}/* ~/my-bookshelf/docs/`));
    console.log(chalk.gray(`  3. View in browser: cd ~/my-bookshelf && npm run dev\n`));

  } catch (error) {
    spinner.fail('Generation failed');
    logger.error('Error:', error);
    throw error;
  }
}
