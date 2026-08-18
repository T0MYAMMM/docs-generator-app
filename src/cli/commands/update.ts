/**
 * Update command
 *
 * Update existing documentation (incremental regeneration).
 */

import ora from 'ora';
import { stat } from 'fs/promises';
import { Scanner } from '../../core/scanner/index.js';
import { Analyzer } from '../../core/analyzer/index.js';
import { Generator } from '../../core/generator/index.js';
import { LLMService } from '../../llm/llm-service.js';
import { loadConfig } from '../../core/config/config-loader.js';
import { logger } from '../../utils/logger.js';
import { FileNode, AIGeneratedContent } from '../../types/index.js';

interface UpdateOptions {
  config?: string;
  llm?: boolean;
  force?: boolean;
}

/**
 * Update documentation command
 */
export async function updateCommand(
  path: string,
  options: UpdateOptions
): Promise<void> {
  const spinner = ora('Loading configuration...').start();

  try {
    // Load configuration
    const config = await loadConfig(options.config);
    config.project.path = path;
    config.behavior.updateMode = options.force ? 'force' : 'smart';

    spinner.succeed('Configuration loaded');

    // Phase 1: Scan files
    spinner.start('Scanning for changes...');
    const scanner = new Scanner(
      path,
      config.files.include,
      config.files.exclude,
      true
    );

    const scanResult = await scanner.scan();

    // Detect changed files
    const changedFiles = await detectChangedFiles(scanResult.files, config.performance.cacheDir);

    if (changedFiles.length === 0) {
      spinner.succeed('No changes detected - documentation is up to date');
      return;
    }

    spinner.succeed(
      `Found ${changedFiles.length} changed files (${scanResult.files.length} total)`
    );

    // Phase 2: Analyze changed files
    spinner.start('Analyzing changes...');
    const analyzer = new Analyzer();
    const analysisResult = await analyzer.analyze(changedFiles);

    spinner.succeed(
      `Analyzed ${analysisResult.analysis.symbols.length} symbols from changed files`
    );

    // Phase 3: LLM Enhancement (optional)
    let aiContent: Map<string, AIGeneratedContent> | undefined;

    if (options.llm) {
      spinner.start('Enhancing documentation with LLM...');

      try {
        const llmService = new LLMService(config.llm);
        const isAvailable = await llmService.checkAvailability();

        if (!isAvailable) {
          spinner.warn('Ollama not available, skipping LLM enhancement');
        } else {
          aiContent = await llmService.enhanceAnalysis(analysisResult.analysis);
          spinner.succeed(`LLM enhancement complete (${aiContent.size} entries)`);
        }
      } catch (error) {
        spinner.warn(`LLM enhancement failed: ${(error as Error).message}`);
      }
    }

    // Phase 4: Regenerate documentation
    spinner.start('Updating documentation...');
    const generator = new Generator(config);

    const result = await generator.generate(analysisResult.analysis, aiContent);

    if (result.errors.length > 0) {
      spinner.warn(
        `Updated ${result.filesGenerated} files with ${result.errors.length} errors`
      );
    } else {
      spinner.succeed(
        `Updated ${result.filesGenerated} documentation files in ${result.duration}ms`
      );
    }

    // Summary
    logger.info('\n📝 Documentation update complete!\n');
    logger.info(`Files updated: ${result.filesGenerated}`);
    logger.info(`Output directory: ${config.output.path}`);

  } catch (error) {
    spinner.fail('Update failed');
    logger.error('Error:', error);
    throw error;
  }
}

/**
 * Detect files that have changed since last generation
 */
async function detectChangedFiles(
  files: FileNode[],
  cacheDir: string
): Promise<FileNode[]> {
  const changedFiles: FileNode[] = [];

  for (const file of files) {
    try {
      // Check file modification time
      const stats = await stat(file.path);
      const mtime = stats.mtime;

      // For now, consider all files as changed
      // In a real implementation, this would compare with cached timestamps
      if (mtime > file.lastModified) {
        changedFiles.push(file);
      }
    } catch {
      // If we can't stat the file, consider it changed
      changedFiles.push(file);
    }
  }

  // If no changes detected but this is first run, include all files
  if (changedFiles.length === 0) {
    return files;
  }

  return changedFiles;
}
