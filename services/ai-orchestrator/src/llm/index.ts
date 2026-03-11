/**
 * Atlas One — LLM Integration Layer
 *
 * Provides a unified interface to multiple LLM providers (Anthropic, OpenAI).
 * Supports structured output, tool calling, and streaming.
 */

export { LLMClient, createLLMClient, type LLMConfig } from './client.js';
export { type ChatMessage, type ChatCompletion, type ToolCall, type LLMProvider } from './types.js';
