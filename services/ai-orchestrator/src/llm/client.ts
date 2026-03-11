import type {
  ChatCompletion,
  ChatCompletionOptions,
  ChatMessage,
  LLMProvider,
  ToolCall,
} from './types.js';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

interface AnthropicMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: string }>;
}

interface AnthropicResponse {
  id: string;
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  stop_reason: string;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: Array<{
        id: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletion> {
    const start = Date.now();

    if (this.config.provider === 'anthropic') {
      return this.chatAnthropic(options, start);
    }
    return this.chatOpenAI(options, start);
  }

  // ── Anthropic Claude API ──────────────────────────────────────

  private async chatAnthropic(
    options: ChatCompletionOptions,
    startTime: number,
  ): Promise<ChatCompletion> {
    const baseUrl = this.config.baseUrl ?? 'https://api.anthropic.com';
    const messages: AnthropicMessage[] = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: m.tool_call_id ?? '',
              content: m.content,
            }],
          };
        }
        return { role: m.role, content: m.content };
      });

    const systemPrompt = options.systemPrompt ??
      options.messages.find((m) => m.role === 'system')?.content;

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: options.maxTokens ?? 4096,
      messages,
    };

    if (systemPrompt) body['system'] = systemPrompt;
    if (options.temperature !== undefined) body['temperature'] = options.temperature;

    if (options.tools?.length) {
      body['tools'] = options.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await this.fetchWithRetry(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as AnthropicResponse;

    const textContent = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');

    const toolCalls: ToolCall[] = data.content
      .filter((c) => c.type === 'tool_use')
      .map((c) => ({
        id: c.id ?? '',
        name: c.name ?? '',
        arguments: (c.input as Record<string, unknown>) ?? {},
      }));

    return {
      id: data.id,
      content: textContent || null,
      toolCalls,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      model: data.model,
      latencyMs: Date.now() - startTime,
    };
  }

  // ── OpenAI API ────────────────────────────────────────────────

  private async chatOpenAI(
    options: ChatCompletionOptions,
    startTime: number,
  ): Promise<ChatCompletion> {
    const baseUrl = this.config.baseUrl ?? 'https://api.openai.com';
    const messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }> =
      options.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name && { name: m.name }),
        ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
      }));

    if (options.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.temperature !== undefined) body['temperature'] = options.temperature;

    if (options.tools?.length) {
      body['tools'] = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    if (options.responseFormat === 'json') {
      body['response_format'] = { type: 'json_object' };
    }

    const response = await this.fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as OpenAIResponse;
    const choice = data.choices[0];

    const toolCalls: ToolCall[] = (choice?.message.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      id: data.id,
      content: choice?.message.content ?? null,
      toolCalls,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      model: data.model,
      latencyMs: Date.now() - startTime,
    };
  }

  // ── Retry Logic ───────────────────────────────────────────────

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries: number = this.config.maxRetries ?? 3,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.config.timeout ?? 60_000,
        );

        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) return response;

        // Retry on rate limit (429) and server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter
            ? Number(retryAfter) * 1000
            : Math.min(1000 * Math.pow(2, attempt), 30_000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error
        const errorBody = await response.text();
        throw new Error(`LLM API error ${String(response.status)}: ${errorBody}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 30_000)),
          );
        }
      }
    }

    throw lastError ?? new Error('LLM request failed after retries');
  }
}

// ── Factory ─────────────────────────────────────────────────────

export function createLLMClient(config?: Partial<LLMConfig>): LLMClient {
  const provider = (config?.provider ?? process.env['LLM_PROVIDER'] ?? 'anthropic') as LLMProvider;

  const apiKeyEnv = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
  const modelEnv = provider === 'anthropic' ? 'ANTHROPIC_MODEL' : 'OPENAI_MODEL';

  const apiKey = config?.apiKey ?? process.env[apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${apiKeyEnv} environment variable is required for ${provider} provider`);
  }

  const model = config?.model ?? process.env[modelEnv] ?? (
    provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'
  );

  return new LLMClient({
    provider,
    apiKey,
    model,
    baseUrl: config?.baseUrl,
    maxRetries: config?.maxRetries ?? 3,
    timeout: config?.timeout ?? 60_000,
  });
}
