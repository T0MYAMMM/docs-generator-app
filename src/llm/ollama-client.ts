/**
 * Ollama Client - Interface with local Ollama server
 *
 * Provides a wrapper around the Ollama API for generating documentation
 * using local LLMs like CodeLlama.
 */

import { Ollama } from 'ollama';
import { logger } from '../utils/logger.js';

/**
 * Ollama generation options
 */
export interface GenerationOptions {
  /** Model to use (default: codellama:latest) */
  model?: string;

  /** Temperature for generation (0-1) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Stop sequences */
  stop?: string[];

  /** System prompt */
  system?: string;
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Generated text */
  text: string;

  /** Model used */
  model: string;

  /** Generation time in ms */
  duration: number;

  /** Number of tokens generated */
  tokens?: number;
}

/**
 * OllamaClient class for interacting with local Ollama server
 */
export class OllamaClient {
  private client: Ollama;
  private defaultModel: string;
  private serverUrl: string;

  constructor(options: {
    host?: string;
    defaultModel?: string;
  } = {}) {
    this.serverUrl = options.host || 'http://localhost:11434';
    this.defaultModel = options.defaultModel || 'codellama:latest';

    // Initialize Ollama client
    this.client = new Ollama({
      host: this.serverUrl,
    });

    logger.debug(`Ollama client initialized: ${this.serverUrl}`);
  }

  /**
   * Check if Ollama server is running and accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      logger.debug('Checking Ollama connection...');

      // Try to list models as a health check
      await this.client.list();

      logger.success('Ollama server is running');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Ollama server');
      logger.debug(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Check if a specific model is available
   */
  async checkModel(modelName?: string): Promise<boolean> {
    const model = modelName || this.defaultModel;

    try {
      logger.debug(`Checking if model ${model} is available...`);

      const models = await this.client.list();
      const available = models.models.some((m) => m.name === model);

      if (available) {
        logger.success(`Model ${model} is available`);
      } else {
        logger.warn(`Model ${model} is not available`);
      }

      return available;
    } catch (error) {
      logger.error(`Failed to check model ${model}`);
      logger.debug(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * List all available models
   */
  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.list();
      return models.models.map((m) => m.name);
    } catch (error) {
      logger.error('Failed to list models');
      logger.debug(error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    try {
      logger.debug(`Generating with model ${model}...`);

      const response = await this.client.generate({
        model,
        prompt,
        system: options.system,
        options: {
          temperature: options.temperature ?? 0.3, // Lower for more consistent docs
          num_predict: options.maxTokens ?? 512,
          stop: options.stop,
        },
      });

      const duration = Date.now() - startTime;

      logger.debug(`Generation complete in ${duration}ms`);

      return {
        text: response.response,
        model,
        duration,
        tokens: response.eval_count,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Generation failed after ${duration}ms`);
      logger.errorWithStack('Error:', error as Error);
      throw error;
    }
  }

  /**
   * Generate text with streaming (for interactive use)
   */
  async *generateStream(
    prompt: string,
    options: GenerationOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.defaultModel;

    try {
      logger.debug(`Streaming generation with model ${model}...`);

      const stream = await this.client.generate({
        model,
        prompt,
        system: options.system,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 512,
          stop: options.stop,
        },
      });

      for await (const chunk of stream) {
        yield chunk.response;
      }
    } catch (error) {
      logger.error('Streaming generation failed');
      logger.errorWithStack('Error:', error as Error);
      throw error;
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      logger.info(`Pulling model ${modelName}...`);

      await this.client.pull({
        model: modelName,
        stream: false,
      });

      logger.success(`Model ${modelName} pulled successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to pull model ${modelName}`);
      logger.errorWithStack('Error:', error as Error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName?: string): Promise<any> {
    const model = modelName || this.defaultModel;

    try {
      const info = await this.client.show({ model });
      return info;
    } catch (error) {
      logger.error(`Failed to get info for model ${model}`);
      logger.debug(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Get default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Set default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
    logger.debug(`Default model set to ${model}`);
  }
}

/**
 * Create Ollama client with default settings
 */
export function createOllamaClient(options?: {
  host?: string;
  defaultModel?: string;
}): OllamaClient {
  return new OllamaClient(options);
}
