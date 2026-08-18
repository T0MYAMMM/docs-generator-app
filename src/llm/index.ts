/**
 * LLM Module - Local LLM integration via Ollama
 *
 * Provides AI-powered documentation enhancement using CodeLlama.
 */

// Export Ollama client
export { OllamaClient, createOllamaClient } from './ollama-client.js';
export type { GenerationOptions, GenerationResult } from './ollama-client.js';

// Export LLM service
export { LLMService, createLLMService } from './llm-service.js';
export type { LLMServiceOptions } from './llm-service.js';

// Export documentation enhancer
export { DocEnhancer, createDocEnhancer } from './doc-enhancer.js';
export type { EnhancementOptions, EnhancementResult } from './doc-enhancer.js';

// Export prompts
export {
  SYSTEM_PROMPT,
  generatePromptForSymbol,
  generatePromptForType,
  parseDescription,
  generateBatchPrompt,
} from './prompts.js';
