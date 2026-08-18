/**
 * LLM Service - High-level service for LLM operations
 *
 * Provides caching, retry logic, and batch processing for documentation generation.
 */

import { OllamaClient, GenerationOptions } from './ollama-client.js';
import { logger } from '../utils/logger.js';
import { calculateHash, retry } from '../utils/helpers.js';

/**
 * Cache entry
 */
interface CacheEntry {
  prompt: string;
  response: string;
  timestamp: number;
  model: string;
}

/**
 * LLM service options
 */
export interface LLMServiceOptions {
  /** Ollama host URL */
  host?: string;

  /** Default model to use */
  model?: string;

  /** Enable caching */
  enableCache?: boolean;

  /** Cache TTL in milliseconds (default: 24 hours) */
  cacheTTL?: number;

  /** Maximum retries for failed requests */
  maxRetries?: number;

  /** Delay between retries in ms */
  retryDelay?: number;
}

/**
 * LLM Service for documentation generation
 */
export class LLMService {
  private client: OllamaClient;
  private cache: Map<string, CacheEntry>;
  private options: Required<LLMServiceOptions>;

  constructor(options: LLMServiceOptions = {}) {
    this.options = {
      host: options.host || 'http://localhost:11434',
      model: options.model || 'codellama:latest',
      enableCache: options.enableCache ?? true,
      cacheTTL: options.cacheTTL || 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
    };

    this.client = new OllamaClient({
      host: this.options.host,
      defaultModel: this.options.model,
    });

    this.cache = new Map();

    logger.debug('LLM Service initialized');
  }

  /**
   * Check if LLM service is ready
   */
  async isReady(): Promise<boolean> {
    // Check connection
    const connected = await this.client.checkConnection();
    if (!connected) {
      return false;
    }

    // Check if model is available
    const modelAvailable = await this.client.checkModel();
    if (!modelAvailable) {
      logger.warn(
        `Model ${this.options.model} not found. You may need to pull it first.`
      );
      logger.info(`Run: ollama pull ${this.options.model}`);
      return false;
    }

    return true;
  }

  /**
   * Generate documentation with caching and retry
   */
  async generate(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const model = options.model || this.options.model;

    // Check cache first
    if (this.options.enableCache) {
      const cached = this.getFromCache(prompt, model);
      if (cached) {
        logger.debug('Using cached response');
        return cached;
      }
    }

    // Generate with retry logic
    const generateFn = async () => {
      const result = await this.client.generate(prompt, {
        ...options,
        model,
      });

      return result.text;
    };

    try {
      const response = await retry(generateFn, {
        maxAttempts: this.options.maxRetries,
        delayMs: this.options.retryDelay,
        backoffMultiplier: 1.5,
      });

      // Cache the response
      if (this.options.enableCache) {
        this.addToCache(prompt, response, model);
      }

      return response;
    } catch (error) {
      logger.error('Generation failed after retries');
      throw error;
    }
  }

  /**
   * Generate documentation for multiple prompts in batch
   */
  async generateBatch(
    prompts: string[],
    options: GenerationOptions = {}
  ): Promise<string[]> {
    logger.info(`Generating ${prompts.length} descriptions...`);

    const results: string[] = [];
    const batchSize = 5; // Process 5 at a time to avoid overwhelming the server

    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);

      logger.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prompts.length / batchSize)}`
      );

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (prompt) => {
          try {
            return await this.generate(prompt, options);
          } catch (error) {
            logger.error('Failed to generate for prompt');
            logger.debug(error instanceof Error ? error.message : String(error));
            return ''; // Return empty string on failure
          }
        })
      );

      results.push(...batchResults);

      // Log progress
      logger.debug(`Generated ${results.length}/${prompts.length} descriptions`);
    }

    logger.success(`Generated ${results.length} descriptions`);

    return results;
  }

  /**
   * Get response from cache
   */
  private getFromCache(prompt: string, model: string): string | null {
    const key = this.getCacheKey(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    const age = Date.now() - entry.timestamp;
    if (age > this.options.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Add response to cache
   */
  private addToCache(prompt: string, response: string, model: string): void {
    const key = this.getCacheKey(prompt, model);

    this.cache.set(key, {
      prompt,
      response,
      timestamp: Date.now(),
      model,
    });
  }

  /**
   * Generate cache key from prompt and model
   */
  private getCacheKey(prompt: string, model: string): string {
    return calculateHash(`${model}:${prompt}`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
  } {
    return {
      size: this.cache.size,
      hits: 0, // Could track this if needed
    };
  }

  /**
   * Get Ollama client instance
   */
  getClient(): OllamaClient {
    return this.client;
  }

  /**
   * Pull the model if not available
   */
  async pullModel(): Promise<boolean> {
    logger.info(`Pulling model ${this.options.model}...`);
    return this.client.pullModel(this.options.model);
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return this.client.listModels();
  }
}

/**
 * Create LLM service with default settings
 */
export function createLLMService(options?: LLMServiceOptions): LLMService {
  return new LLMService(options);
}
