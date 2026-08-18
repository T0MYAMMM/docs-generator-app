/**
 * Documentation Enhancer - Enhance code documentation using LLM
 *
 * Uses local LLM (via Ollama) to generate high-quality descriptions
 * for symbols that don't have JSDoc comments.
 */

import { Symbol as DocSymbol, TypeDefinition, ProjectAnalysis } from '../types/index.js';
import { LLMService, LLMServiceOptions } from './llm-service.js';
import {
  generatePromptForSymbol,
  generatePromptForType,
  parseDescription,
  SYSTEM_PROMPT,
} from './prompts.js';
import { logger } from '../utils/logger.js';

/**
 * Enhancement options
 */
export interface EnhancementOptions {
  /** Only enhance exported symbols */
  exportedOnly?: boolean;

  /** Skip symbols that already have comments */
  skipExisting?: boolean;

  /** Maximum symbols to enhance (for testing/limits) */
  maxSymbols?: number;

  /** Temperature for generation */
  temperature?: number;

  /** Model to use */
  model?: string;
}

/**
 * Enhancement result
 */
export interface EnhancementResult {
  /** Total symbols processed */
  totalSymbols: number;

  /** Symbols enhanced */
  enhanced: number;

  /** Symbols skipped */
  skipped: number;

  /** Symbols failed */
  failed: number;

  /** Duration in ms */
  duration: number;

  /** Cache hits */
  cacheHits?: number;
}

/**
 * Documentation Enhancer class
 */
export class DocEnhancer {
  private llmService: LLMService;
  private options: Required<EnhancementOptions>;

  constructor(
    llmServiceOptions: LLMServiceOptions = {},
    enhancementOptions: EnhancementOptions = {}
  ) {
    this.llmService = new LLMService(llmServiceOptions);

    this.options = {
      exportedOnly: enhancementOptions.exportedOnly ?? true,
      skipExisting: enhancementOptions.skipExisting ?? true,
      maxSymbols: enhancementOptions.maxSymbols ?? Infinity,
      temperature: enhancementOptions.temperature ?? 0.3,
      model: enhancementOptions.model || llmServiceOptions.model || 'codellama:latest',
    };

    logger.debug('DocEnhancer initialized');
  }

  /**
   * Check if LLM is ready to use
   */
  async isReady(): Promise<boolean> {
    return this.llmService.isReady();
  }

  /**
   * Enhance a single symbol with LLM-generated description
   */
  async enhanceSymbol(symbol: DocSymbol): Promise<DocSymbol> {
    // Skip if already has comment and skipExisting is true
    if (this.options.skipExisting && symbol.comment) {
      logger.debug(`Skipping ${symbol.name} (already has comment)`);
      return symbol;
    }

    // Skip if not exported and exportedOnly is true
    if (this.options.exportedOnly && !symbol.exported) {
      logger.debug(`Skipping ${symbol.name} (not exported)`);
      return symbol;
    }

    try {
      // Generate prompt
      const prompt = generatePromptForSymbol(symbol);

      // Generate description
      const response = await this.llmService.generate(prompt, {
        system: SYSTEM_PROMPT,
        temperature: this.options.temperature,
        model: this.options.model,
        maxTokens: 150, // Keep descriptions concise
        stop: ['\n\n', 'Example:', 'Note:'], // Stop at common continuation points
      });

      // Parse and clean the response
      const description = parseDescription(response);

      // Update symbol
      return {
        ...symbol,
        comment: description,
        tags: {
          ...symbol.tags,
          'ai-generated': 'true',
        },
      };
    } catch (error) {
      logger.error(`Failed to enhance ${symbol.name}`);
      logger.debug(error instanceof Error ? error.message : String(error));
      return symbol;
    }
  }

  /**
   * Enhance multiple symbols in batch
   */
  async enhanceSymbols(symbols: DocSymbol[]): Promise<{
    symbols: DocSymbol[];
    result: EnhancementResult;
  }> {
    const startTime = Date.now();

    // Filter symbols based on options
    let toEnhance = symbols;

    if (this.options.exportedOnly) {
      toEnhance = toEnhance.filter((s) => s.exported);
    }

    if (this.options.skipExisting) {
      toEnhance = toEnhance.filter((s) => !s.comment);
    }

    // Limit if maxSymbols is set
    if (this.options.maxSymbols < Infinity) {
      toEnhance = toEnhance.slice(0, this.options.maxSymbols);
    }

    logger.info(`Enhancing ${toEnhance.length} symbols with LLM...`);

    // Generate prompts for all symbols
    const prompts = toEnhance.map((symbol) => generatePromptForSymbol(symbol));

    // Generate descriptions in batch
    const responses = await this.llmService.generateBatch(prompts, {
      system: SYSTEM_PROMPT,
      temperature: this.options.temperature,
      model: this.options.model,
      maxTokens: 150,
      stop: ['\n\n', 'Example:', 'Note:'],
    });

    // Update symbols with generated descriptions
    let enhanced = 0;
    let failed = 0;

    const enhancedSymbols = symbols.map((symbol) => {
      const index = toEnhance.indexOf(symbol);

      if (index === -1) {
        // Symbol was not in the to-enhance list
        return symbol;
      }

      const response = responses[index];

      if (!response || response.trim().length === 0) {
        failed++;
        return symbol;
      }

      enhanced++;

      const description = parseDescription(response);

      return {
        ...symbol,
        comment: description,
        tags: {
          ...symbol.tags,
          'ai-generated': 'true',
        },
      };
    });

    const duration = Date.now() - startTime;

    const result: EnhancementResult = {
      totalSymbols: symbols.length,
      enhanced,
      skipped: symbols.length - toEnhance.length,
      failed,
      duration,
      cacheHits: this.llmService.getCacheStats().size,
    };

    logger.success(
      `Enhanced ${enhanced} symbols in ${duration}ms (${result.skipped} skipped, ${failed} failed)`
    );

    return {
      symbols: enhancedSymbols,
      result,
    };
  }

  /**
   * Enhance a type definition
   */
  async enhanceType(type: TypeDefinition): Promise<TypeDefinition> {
    // Skip if already has description
    if (this.options.skipExisting && type.description) {
      return type;
    }

    // Note: TypeDefinition doesn't have exported property, enhancing all types

    try {
      const prompt = generatePromptForType(type);

      const response = await this.llmService.generate(prompt, {
        system: SYSTEM_PROMPT,
        temperature: this.options.temperature,
        model: this.options.model,
        maxTokens: 100,
        stop: ['\n\n'],
      });

      const description = parseDescription(response);

      return {
        ...type,
        description,
      };
    } catch (error) {
      logger.error(`Failed to enhance type ${type.name}`);
      logger.debug(error instanceof Error ? error.message : String(error));
      return type;
    }
  }

  /**
   * Enhance all types in batch
   */
  async enhanceTypes(types: TypeDefinition[]): Promise<TypeDefinition[]> {
    let toEnhance = types;

    // Filter by existing description
    if (this.options.skipExisting) {
      toEnhance = toEnhance.filter((t) => !t.description);
    }

    if (toEnhance.length === 0) {
      return types;
    }

    logger.info(`Enhancing ${toEnhance.length} type definitions with LLM...`);

    const prompts = toEnhance.map((type) => generatePromptForType(type));

    const responses = await this.llmService.generateBatch(prompts, {
      system: SYSTEM_PROMPT,
      temperature: this.options.temperature,
      model: this.options.model,
      maxTokens: 100,
      stop: ['\n\n'],
    });

    return types.map((type) => {
      const index = toEnhance.indexOf(type);

      if (index === -1) {
        return type;
      }

      const response = responses[index];

      if (!response || response.trim().length === 0) {
        return type;
      }

      const description = parseDescription(response);

      return {
        ...type,
        description,
      };
    });
  }

  /**
   * Enhance entire project analysis
   */
  async enhanceProject(analysis: ProjectAnalysis): Promise<{
    analysis: ProjectAnalysis;
    result: EnhancementResult;
  }> {
    logger.info('Enhancing project documentation with LLM...');

    // Enhance symbols
    const { symbols: enhancedSymbols, result: symbolResult } = await this.enhanceSymbols(
      analysis.symbols
    );

    // Enhance types
    const enhancedTypes = await this.enhanceTypes(analysis.types);

    const enhancedAnalysis: ProjectAnalysis = {
      ...analysis,
      symbols: enhancedSymbols,
      types: enhancedTypes,
    };

    return {
      analysis: enhancedAnalysis,
      result: symbolResult,
    };
  }

  /**
   * Get LLM service instance
   */
  getLLMService(): LLMService {
    return this.llmService;
  }

  /**
   * Clear LLM cache
   */
  clearCache(): void {
    this.llmService.clearCache();
  }
}

/**
 * Create doc enhancer with default settings
 */
export function createDocEnhancer(
  llmOptions?: LLMServiceOptions,
  enhanceOptions?: EnhancementOptions
): DocEnhancer {
  return new DocEnhancer(llmOptions, enhanceOptions);
}
