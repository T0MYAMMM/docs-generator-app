#!/usr/bin/env node

/**
 * DocGen CLI - Command line interface
 *
 * Main CLI entry point for the documentation generator.
 */

import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { analyzeCommand } from './commands/analyze.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { logger, LogLevel } from '../utils/logger.js';

// Create CLI program
const program = new Command();

program
  .name('docgen')
  .description('Automatic documentation generator using static analysis and local LLM')
  .version('0.1.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug logging')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    // Set log level based on flags
    if (opts.debug) {
      logger.setLevel(LogLevel.DEBUG);
    } else if (opts.verbose) {
      logger.setLevel(LogLevel.INFO);
    }
  });

// Scan command
program
  .command('scan')
  .description('Scan a project and analyze its structure')
  .argument('[path]', 'Project path to scan', '.')
  .option('--no-tests', 'Exclude test files')
  .option('--no-configs', 'Exclude config files')
  .option('--no-gitignore', 'Do not respect .gitignore')
  .action(scanCommand);

// Analyze command
program
  .command('analyze')
  .description('Analyze a project and extract symbols')
  .argument('[path]', 'Project path to analyze', '.')
  .option('--no-tests', 'Exclude test files')
  .option('--no-configs', 'Exclude config files')
  .option('--no-gitignore', 'Do not respect .gitignore')
  .option('--llm', 'Enhance documentation with local LLM (requires Ollama)')
  .option('--llm-model <model>', 'LLM model to use', 'codellama:latest')
  .action(analyzeCommand);

// Generate command
program
  .command('generate')
  .description('Generate markdown documentation from code')
  .argument('[path]', 'Project path to generate docs for', '.')
  .option('--no-tests', 'Exclude test files')
  .option('--no-configs', 'Exclude config files')
  .option('--no-gitignore', 'Do not respect .gitignore')
  .option('--output <path>', 'Output directory', './docs')
  .option('--config <path>', 'Config file path')
  .option('--llm', 'Enhance documentation with local LLM (requires Ollama)')
  .option('--llm-model <model>', 'LLM model to use', 'codellama:latest')
  .option('--dry-run', 'Preview without writing files')
  .option('--clean', 'Clean output directory before generating')
  .action(generateCommand);

// Init command
program
  .command('init')
  .description('Initialize a new docgen configuration file')
  .option('-f, --force', 'Overwrite existing config file')
  .option('-i, --interactive', 'Interactive configuration setup')
  .action(initCommand);

// Update command
program
  .command('update')
  .description('Update existing documentation (incremental)')
  .argument('[path]', 'Project path to update docs for', '.')
  .option('--config <path>', 'Config file path')
  .option('--llm', 'Enhance documentation with local LLM')
  .option('--force', 'Force regeneration of all files')
  .action(updateCommand);

// Parse CLI arguments
program.parse();
