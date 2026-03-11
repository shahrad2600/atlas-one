/**
 * Atlas One -- AI Orchestrator Routes
 *
 * HTTP endpoints for the AI chat interface. All chat routes require
 * authentication via JWT. The orchestrator receives user messages,
 * routes them to the appropriate specialist agent, invokes the LLM
 * for response generation, and returns structured responses.
 *
 * Routes:
 *   POST   /api/v1/ai/chat                          - Send a chat message
 *   POST   /api/v1/ai/chat/stream                    - Streaming chat (SSE)
 *   GET    /api/v1/ai/conversations                   - List conversations
 *   GET    /api/v1/ai/conversations/:conversationId   - Get conversation history
 *   DELETE /api/v1/ai/conversations/:conversationId   - Delete conversation
 *   GET    /api/v1/ai/agents                          - List available agents
 *   POST   /api/v1/ai/tools/:toolName/execute         - Execute a tool (admin)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateBody, validateQuery, validateParams } from '@atlas/validation';
import { createLLMClient, type LLMClient } from '../llm/index.js';
import type { ChatMessage, ToolCall, ToolDefinitionLLM } from '../llm/types.js';
import {
  getConversationManager,
  type ConversationMessage,
} from '../conversation.js';
import {
  routeMessage,
  routeMessageAsync,
  refineIntent,
  getAgentSystemPrompt,
  type RouteResult,
} from '../router.js';
import { ToolRegistry } from '../tools/index.js';
import { AgentRegistry } from '../agents/index.js';
import type { AgentContext, ToolAction } from '../agents/base.js';

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const chatBodySchema = z.object({
  message: z.string().min(1).max(10_000),
  tripId: z.string().optional(),
  conversationId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

const streamChatBodySchema = z.object({
  message: z.string().min(1).max(10_000),
  tripId: z.string().optional(),
  conversationId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1),
});

const toolNameParamSchema = z.object({
  toolName: z.string().min(1),
});

const toolExecuteBodySchema = z.object({
  params: z.record(z.unknown()),
  tripId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper: extract authenticated user ID
// ---------------------------------------------------------------------------

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ---------------------------------------------------------------------------
// Helper: check admin role
// ---------------------------------------------------------------------------

function assertAdmin(request: FastifyRequest): void {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  // In production, check user.role === 'admin' from JWT claims.
  // For now, allow all authenticated users (development mode).
}

// ---------------------------------------------------------------------------
// Helper: build LLM tools from the ToolRegistry
// ---------------------------------------------------------------------------

function buildLLMToolDefinitions(toolRegistry: ToolRegistry): ToolDefinitionLLM[] {
  return toolRegistry.getCatalog().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object' as const,
      properties: (tool.parameters['properties'] ?? {}) as Record<string, { type: string; description: string }>,
      required: (tool.parameters['required'] ?? []) as string[],
    },
  }));
}

// ---------------------------------------------------------------------------
// Helper: convert conversation messages to LLM messages
// ---------------------------------------------------------------------------

function toLLMMessages(messages: ConversationMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));
}

// ---------------------------------------------------------------------------
// Helper: build suggestions based on agent and response
// ---------------------------------------------------------------------------

function buildSuggestions(agentName: string, _response: string): string[] {
  switch (agentName) {
    case 'dining-agent':
      return [
        'Show me more options',
        'Filter by cuisine type',
        'Check availability for a different date',
        'Set up a cancellation watch',
      ];
    case 'stay-agent':
      return [
        'Compare these hotels',
        'Show cheaper options',
        'Check availability for different dates',
        'Tell me about the neighborhood',
      ];
    case 'flight-agent':
      return [
        'Show flexible dates',
        'Look for direct flights only',
        'Check business class prices',
        'What is the disruption risk?',
      ];
    case 'budget-agent':
      return [
        'Show spending breakdown',
        'Suggest cost-saving swaps',
        'Check loyalty point options',
        'Set a budget alert',
      ];
    case 'risk-agent':
      return [
        'Show detailed risk assessment',
        'Recommend insurance coverage',
        'Check weather forecast',
        'Create a backup plan',
      ];
    case 'support-agent':
      return [
        'Check refund eligibility',
        'Start a dispute',
        'File an insurance claim',
        'Reschedule my booking',
      ];
    case 'experiences-agent':
      return [
        'Book the top-rated experience',
        'Show family-friendly options',
        'Check availability for tomorrow',
        'Show outdoor activities',
      ];
    default:
      return [
        'Plan a new trip',
        'Help with an existing booking',
        'Check my budget',
        'What should I do today?',
      ];
  }
}

// ---------------------------------------------------------------------------
// Core Chat Handler (shared by sync and stream endpoints)
// ---------------------------------------------------------------------------

interface ChatResult {
  conversationId: string;
  response: {
    message: string;
    agentUsed: string;
    toolsUsed: string[];
    toolActions?: ToolAction[];
    suggestions: string[];
    confidence: number;
    intent: string;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    model: string;
  };
}

async function processChat(
  userId: string,
  body: z.infer<typeof chatBodySchema>,
  llmClient: LLMClient,
  toolRegistry: ToolRegistry,
  agentRegistry: AgentRegistry,
  logger: FastifyRequest['log'],
): Promise<ChatResult> {
  const conversationManager = getConversationManager();

  // ── Resolve or create conversation ───────────────────────────
  let conversationId = body.conversationId;
  let conversation = conversationId
    ? conversationManager.get(conversationId)
    : null;

  if (conversation && conversation.userId !== userId) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  if (!conversation) {
    conversation = conversationManager.create(userId, body.tripId);
    conversationId = conversation.id;
  }

  // ── Record the user message ──────────────────────────────────
  conversationManager.addMessage(conversation.id, {
    role: 'user',
    content: body.message,
  });

  // ── Route to specialist agent ────────────────────────────────
  // Use async routing (LLM-based if available, keyword fallback)
  let routeResult: RouteResult;
  try {
    routeResult = await routeMessageAsync(body.message);
  } catch {
    routeResult = routeMessage(body.message);
  }
  const refinedIntent = refineIntent(routeResult.agentName, body.message);

  logger.info({
    conversationId: conversation.id,
    agent: routeResult.agentName,
    intent: refinedIntent,
    confidence: routeResult.confidence,
    matchedKeywords: routeResult.matchedKeywords,
    classificationMethod: routeResult.classificationMethod,
  }, 'Routed message to agent');

  // ── Try specialist agent process() first ────────────────────
  const specialist = agentRegistry.getAgent(routeResult.agentName);

  if (specialist) {
    try {
      const agentContext: AgentContext = {
        userId,
        conversationId: conversation.id,
        tripId: body.tripId,
        preferences: body.context as Record<string, unknown> | undefined,
      };

      const recentHistory = conversation.messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const agentResponse = await specialist.process(
        body.message,
        agentContext,
        recentHistory,
      );

      // Use the agent's suggestions, or fall back to default suggestions
      const suggestions = agentResponse.suggestions ?? buildSuggestions(routeResult.agentName, agentResponse.message);
      const toolsUsed = (agentResponse.actions ?? [])
        .filter((a) => a.status === 'executed')
        .map((a) => a.tool);

      // Record the assistant message
      conversationManager.addMessage(conversation.id, {
        role: 'assistant',
        content: agentResponse.message,
        agentUsed: routeResult.agentName,
        toolsUsed,
        suggestions,
      });

      return {
        conversationId: conversation.id,
        response: {
          message: agentResponse.message,
          agentUsed: routeResult.agentName,
          toolsUsed,
          toolActions: agentResponse.actions,
          suggestions,
          confidence: agentResponse.confidence,
          intent: refinedIntent,
        },
      };
    } catch (agentError) {
      // Agent processing failed -- fall through to LLM-based processing
      logger.warn({
        agent: routeResult.agentName,
        error: agentError instanceof Error ? agentError.message : 'Unknown error',
      }, 'Agent process() failed, falling back to LLM');
    }
  }

  // ── Fallback: LLM-based processing ──────────────────────────
  const systemPrompt = getAgentSystemPrompt(routeResult.agentName, {
    tripId: body.tripId,
  });

  const recentMessages = conversation.messages.slice(-20);
  const llmMessages: ChatMessage[] = toLLMMessages(recentMessages);
  const llmTools = buildLLMToolDefinitions(toolRegistry);

  let responseText: string;
  let toolsUsed: string[] = [];

  try {
    const completion = await llmClient.chat({
      systemPrompt,
      messages: llmMessages,
      tools: llmTools,
      temperature: 0.7,
      maxTokens: 2048,
    });

    responseText = completion.content ?? 'I apologize, but I was unable to generate a response. Could you rephrase your question?';

    // ── Handle tool calls ────────────────────────────────────────
    if (completion.toolCalls.length > 0) {
      toolsUsed = completion.toolCalls.map((tc: ToolCall) => tc.name);

      logger.info({
        conversationId: conversation.id,
        toolCalls: completion.toolCalls.map((tc: ToolCall) => ({
          name: tc.name,
          args: Object.keys(tc.arguments),
        })),
      }, 'LLM requested tool calls');

      const toolMessages: ChatMessage[] = [];

      for (const toolCall of completion.toolCalls) {
        try {
          const toolResult = await toolRegistry.invokeTool(
            toolCall.name,
            toolCall.arguments,
            {
              tripId: body.tripId ?? 'no-trip',
              userId,
              traceId: `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            },
            routeResult.agentName,
          );

          toolMessages.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
            name: toolCall.name,
          });
        } catch (toolError) {
          const errMsg = toolError instanceof Error ? toolError.message : 'Tool execution failed';
          logger.warn({ tool: toolCall.name, error: errMsg }, 'Tool execution failed');

          toolMessages.push({
            role: 'tool',
            content: JSON.stringify({ error: errMsg }),
            tool_call_id: toolCall.id,
            name: toolCall.name,
          });
        }
      }

      if (toolMessages.length > 0) {
        const assistantToolMessage: ChatMessage = {
          role: 'assistant',
          content: completion.content ?? '',
        };

        const followUpCompletion = await llmClient.chat({
          systemPrompt,
          messages: [
            ...llmMessages,
            assistantToolMessage,
            ...toolMessages,
          ],
          temperature: 0.7,
          maxTokens: 2048,
        });

        if (followUpCompletion.content) {
          responseText = followUpCompletion.content;
        }
      }
    }

    const suggestions = buildSuggestions(routeResult.agentName, responseText);

    conversationManager.addMessage(conversation.id, {
      role: 'assistant',
      content: responseText,
      agentUsed: routeResult.agentName,
      toolsUsed,
      suggestions,
    });

    return {
      conversationId: conversation.id,
      response: {
        message: responseText,
        agentUsed: routeResult.agentName,
        toolsUsed,
        suggestions,
        confidence: routeResult.confidence,
        intent: refinedIntent,
      },
      usage: {
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
        totalTokens: completion.usage.totalTokens,
        latencyMs: completion.latencyMs,
        model: completion.model,
      },
    };
  } catch (llmError) {
    const errMsg = llmError instanceof Error ? llmError.message : 'Unknown error';
    logger.error({ err: llmError, conversationId: conversation.id }, 'LLM call failed');

    const fallbackResponse = generateFallbackResponse(routeResult.agentName, body.message);

    conversationManager.addMessage(conversation.id, {
      role: 'assistant',
      content: fallbackResponse,
      agentUsed: routeResult.agentName,
      metadata: { fallback: true, error: errMsg },
    });

    return {
      conversationId: conversation.id,
      response: {
        message: fallbackResponse,
        agentUsed: routeResult.agentName,
        toolsUsed: [],
        suggestions: buildSuggestions(routeResult.agentName, fallbackResponse),
        confidence: routeResult.confidence,
        intent: refinedIntent,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Fallback Response Generator
// ---------------------------------------------------------------------------

function generateFallbackResponse(agentName: string, message: string): string {
  const base = 'I am currently experiencing a temporary issue connecting to my AI backend. ';

  switch (agentName) {
    case 'dining-agent':
      return base + 'For your dining request, I can help once the connection is restored. In the meantime, you can browse restaurants in the Dining section of the app.';
    case 'stay-agent':
      return base + 'For accommodation searches, please try again in a moment. You can also browse stays directly in the Stays section.';
    case 'flight-agent':
      return base + 'For flight searches, please try again shortly. You can also search flights directly in the Flights section.';
    case 'budget-agent':
      return base + 'For budget analysis, please try again in a moment. Your spending data is always available in the Budget section.';
    case 'risk-agent':
      return base + 'For risk assessments, please try again shortly. Current travel advisories are available in the Alerts section.';
    case 'support-agent':
      return base + 'For support issues, please try again or contact our support team directly at support@atlasone.com.';
    case 'experiences-agent':
      return base + 'For experience searches, please try again in a moment. You can also browse experiences in the Explore section.';
    default:
      return base + 'Please try your request again in a moment. I\'ll be back to help with your travel planning shortly.';
  }
}

// ---------------------------------------------------------------------------
// Route Registration
// ---------------------------------------------------------------------------

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // ── Shared dependencies ──────────────────────────────────────
  let llmClient: LLMClient;
  try {
    llmClient = createLLMClient();
  } catch (err) {
    server.log.warn({ err }, 'LLM client initialization failed -- chat endpoints will return fallback responses');
    llmClient = null as unknown as LLMClient;
  }

  const toolRegistry = ToolRegistry.createDefault();
  const agentRegistry = AgentRegistry.createDefault();

  // ────────────────────────────────────────────────────────────
  // POST /api/v1/ai/chat - Send a chat message
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/ai/chat',
    { preValidation: [validateBody(chatBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof chatBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof chatBodySchema>;

      const result = await processChat(userId, body, llmClient, toolRegistry, agentRegistry, request.log);

      return reply.send(result);
    },
  );

  // ────────────────────────────────────────────────────────────
  // POST /api/v1/ai/chat/stream - Streaming chat (SSE)
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/ai/chat/stream',
    { preValidation: [validateBody(streamChatBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof streamChatBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof streamChatBodySchema>;

      // Set SSE headers.
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const sendEvent = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const conversationManager = getConversationManager();

      try {
        // ── Resolve or create conversation ─────────────────────
        let conversationId = body.conversationId;
        let conversation = conversationId
          ? conversationManager.get(conversationId)
          : null;

        if (conversation && conversation.userId !== userId) {
          sendEvent('error', { code: 'NOT_FOUND', message: 'Conversation not found' });
          reply.raw.end();
          return;
        }

        if (!conversation) {
          conversation = conversationManager.create(userId, body.tripId);
          conversationId = conversation.id;
        }

        sendEvent('conversation', { conversationId: conversation.id });

        // ── Record user message ────────────────────────────────
        conversationManager.addMessage(conversation.id, {
          role: 'user',
          content: body.message,
        });

        // ── Route to specialist agent ──────────────────────────
        let routeResult: RouteResult;
        try {
          routeResult = await routeMessageAsync(body.message);
        } catch {
          routeResult = routeMessage(body.message);
        }
        const refinedIntent = refineIntent(routeResult.agentName, body.message);

        sendEvent('routing', {
          agentUsed: routeResult.agentName,
          intent: refinedIntent,
          confidence: routeResult.confidence,
          classificationMethod: routeResult.classificationMethod,
        });

        // ── Try specialist agent process() first ─────────────────
        const specialist = agentRegistry.getAgent(routeResult.agentName);

        if (specialist) {
          try {
            sendEvent('status', { phase: 'agent_processing' });

            const agentContext: AgentContext = {
              userId,
              conversationId: conversation.id,
              tripId: body.tripId,
              preferences: body.context as Record<string, unknown> | undefined,
            };

            const recentHistory = conversation.messages.slice(-20).map((m) => ({
              role: m.role,
              content: m.content,
            }));

            const agentResponse = await specialist.process(
              body.message,
              agentContext,
              recentHistory,
            );

            // Stream tool execution steps
            if (agentResponse.actions && agentResponse.actions.length > 0) {
              sendEvent('status', { phase: 'executing_tools', tools: agentResponse.actions.map((a) => a.tool) });

              for (const action of agentResponse.actions) {
                sendEvent('tool_call', {
                  name: action.tool,
                  params: Object.keys(action.params),
                });
                sendEvent('tool_result', {
                  name: action.tool,
                  status: action.status,
                });
              }
            }

            // Stream response in chunks
            sendEvent('status', { phase: 'responding' });
            const chunks = splitIntoChunks(agentResponse.message);
            for (const chunk of chunks) {
              sendEvent('delta', { content: chunk });
            }

            // Record assistant message
            const suggestions = agentResponse.suggestions ?? buildSuggestions(routeResult.agentName, agentResponse.message);
            const toolsUsed = (agentResponse.actions ?? [])
              .filter((a) => a.status === 'executed')
              .map((a) => a.tool);

            conversationManager.addMessage(conversation.id, {
              role: 'assistant',
              content: agentResponse.message,
              agentUsed: routeResult.agentName,
              toolsUsed,
              suggestions,
            });

            sendEvent('done', {
              conversationId: conversation.id,
              agentUsed: routeResult.agentName,
              toolsUsed,
              toolActions: agentResponse.actions,
              suggestions,
              confidence: agentResponse.confidence,
            });

            reply.raw.end();
            return;
          } catch (agentError) {
            request.log.warn({
              agent: routeResult.agentName,
              error: agentError instanceof Error ? agentError.message : 'Unknown error',
            }, 'Agent process() failed during streaming, falling back to LLM');
            // Fall through to LLM-based processing
          }
        }

        // ── Fallback: LLM-based processing ─────────────────────
        const systemPrompt = getAgentSystemPrompt(routeResult.agentName, {
          tripId: body.tripId,
        });

        const recentMessages = conversation.messages.slice(-20);
        const llmMessages: ChatMessage[] = toLLMMessages(recentMessages);
        const llmTools = buildLLMToolDefinitions(toolRegistry);

        sendEvent('status', { phase: 'thinking' });

        let responseText: string;
        let toolsUsed: string[] = [];

        try {
          const completion = await llmClient.chat({
            systemPrompt,
            messages: llmMessages,
            tools: llmTools,
            temperature: 0.7,
            maxTokens: 2048,
          });

          responseText = completion.content ?? 'I apologize, but I was unable to generate a response.';
          toolsUsed = completion.toolCalls.map((tc: ToolCall) => tc.name);

          if (completion.toolCalls.length > 0) {
            sendEvent('status', { phase: 'executing_tools', tools: toolsUsed });

            const toolMessages: ChatMessage[] = [];

            for (const toolCall of completion.toolCalls) {
              sendEvent('tool_call', { name: toolCall.name, arguments: Object.keys(toolCall.arguments) });

              try {
                const toolResult = await toolRegistry.invokeTool(
                  toolCall.name,
                  toolCall.arguments,
                  {
                    tripId: body.tripId ?? 'no-trip',
                    userId,
                    traceId: `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
                  },
                  routeResult.agentName,
                );

                sendEvent('tool_result', { name: toolCall.name, status: 'success' });

                toolMessages.push({
                  role: 'tool',
                  content: JSON.stringify(toolResult),
                  tool_call_id: toolCall.id,
                  name: toolCall.name,
                });
              } catch (toolError) {
                const errMsg = toolError instanceof Error ? toolError.message : 'Tool execution failed';
                sendEvent('tool_result', { name: toolCall.name, status: 'error', error: errMsg });

                toolMessages.push({
                  role: 'tool',
                  content: JSON.stringify({ error: errMsg }),
                  tool_call_id: toolCall.id,
                  name: toolCall.name,
                });
              }
            }

            if (toolMessages.length > 0) {
              sendEvent('status', { phase: 'synthesizing' });

              const assistantToolMessage: ChatMessage = {
                role: 'assistant',
                content: completion.content ?? '',
              };

              const followUpCompletion = await llmClient.chat({
                systemPrompt,
                messages: [
                  ...llmMessages,
                  assistantToolMessage,
                  ...toolMessages,
                ],
                temperature: 0.7,
                maxTokens: 2048,
              });

              if (followUpCompletion.content) {
                responseText = followUpCompletion.content;
              }
            }
          }

          const chunks = splitIntoChunks(responseText);
          for (const chunk of chunks) {
            sendEvent('delta', { content: chunk });
          }

          const suggestions = buildSuggestions(routeResult.agentName, responseText);

          conversationManager.addMessage(conversation.id, {
            role: 'assistant',
            content: responseText,
            agentUsed: routeResult.agentName,
            toolsUsed,
            suggestions,
          });

          sendEvent('done', {
            conversationId: conversation.id,
            agentUsed: routeResult.agentName,
            toolsUsed,
            suggestions,
            usage: {
              promptTokens: completion.usage.promptTokens,
              completionTokens: completion.usage.completionTokens,
              totalTokens: completion.usage.totalTokens,
              latencyMs: completion.latencyMs,
              model: completion.model,
            },
          });
        } catch (llmError) {
          const errMsg = llmError instanceof Error ? llmError.message : 'Unknown error';
          request.log.error({ err: llmError }, 'LLM call failed during streaming');

          const fallbackResponse = generateFallbackResponse(routeResult.agentName, body.message);

          sendEvent('delta', { content: fallbackResponse });

          conversationManager.addMessage(conversation.id, {
            role: 'assistant',
            content: fallbackResponse,
            agentUsed: routeResult.agentName,
            metadata: { fallback: true, error: errMsg },
          });

          sendEvent('done', {
            conversationId: conversation.id,
            agentUsed: routeResult.agentName,
            toolsUsed: [],
            suggestions: buildSuggestions(routeResult.agentName, fallbackResponse),
            fallback: true,
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        sendEvent('error', { code: 'STREAM_ERROR', message: errMsg });
      } finally {
        reply.raw.end();
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  // GET /api/v1/ai/conversations - List user's conversations
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/ai/conversations',
    { preValidation: [validateQuery(listConversationsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listConversationsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof listConversationsQuerySchema>;

      const conversationManager = getConversationManager();
      const result = conversationManager.list(userId, { limit, offset });

      return reply.send(result);
    },
  );

  // ────────────────────────────────────────────────────────────
  // GET /api/v1/ai/conversations/:conversationId - Get conversation
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/ai/conversations/:conversationId',
    { preValidation: [validateParams(conversationIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { conversationId } = request.params as z.infer<typeof conversationIdParamSchema>;

      const conversationManager = getConversationManager();
      const conversation = conversationManager.get(conversationId);

      if (!conversation) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      if (conversation.userId !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this conversation',
          },
        });
      }

      return reply.send({
        id: conversation.id,
        userId: conversation.userId,
        tripId: conversation.tripId,
        messages: conversation.messages,
        agentHistory: conversation.agentHistory,
        messageCount: conversation.messages.length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // DELETE /api/v1/ai/conversations/:conversationId - Delete
  // ────────────────────────────────────────────────────────────

  server.delete(
    '/api/v1/ai/conversations/:conversationId',
    { preValidation: [validateParams(conversationIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { conversationId } = request.params as z.infer<typeof conversationIdParamSchema>;

      const conversationManager = getConversationManager();
      const conversation = conversationManager.get(conversationId);

      if (!conversation) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      if (conversation.userId !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this conversation',
          },
        });
      }

      conversationManager.delete(conversationId, userId);
      return reply.code(204).send();
    },
  );

  // ────────────────────────────────────────────────────────────
  // GET /api/v1/ai/agents - List available agents
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/ai/agents',
    async (
      _request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      const catalog = agentRegistry.getCatalog();
      const toolCatalog = toolRegistry.getCatalog();

      return reply.send({
        agents: catalog.map((agent) => ({
          name: agent.name,
          description: agent.description,
          tools: agent.tools,
          status: 'active',
        })),
        totalAgents: catalog.length,
        totalTools: toolCatalog.length,
        availableTools: toolCatalog.map((t) => ({
          name: t.name,
          description: t.description,
        })),
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // POST /api/v1/ai/tools/:toolName/execute - Execute a tool (admin)
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/ai/tools/:toolName/execute',
    {
      preValidation: [
        validateParams(toolNameParamSchema),
        validateBody(toolExecuteBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof toolNameParamSchema>;
        Body: z.infer<typeof toolExecuteBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      assertAdmin(request);

      const { toolName } = request.params as z.infer<typeof toolNameParamSchema>;
      const body = request.body as z.infer<typeof toolExecuteBodySchema>;

      // Check if tool exists
      if (!toolRegistry.hasTool(toolName)) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `Tool "${toolName}" not found`,
            availableTools: toolRegistry.listTools(),
          },
        });
      }

      const traceId = `trc_admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        const result = await toolRegistry.invokeTool(
          toolName,
          body.params,
          {
            tripId: body.tripId ?? 'admin-test',
            userId,
            traceId,
          },
          'admin',
        );

        return reply.send({
          toolName,
          traceId,
          status: 'success',
          result,
          executedAt: new Date().toISOString(),
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Tool execution failed';

        return reply.code(400).send({
          error: {
            code: 'TOOL_EXECUTION_FAILED',
            message: errMsg,
            toolName,
            traceId,
          },
        });
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Text Chunking for SSE Streaming
// ---------------------------------------------------------------------------

/**
 * Split a response text into reasonable chunks for streaming.
 *
 * Splits on sentence boundaries to provide a natural reading experience
 * over SSE. Each chunk is at most ~200 characters.
 */
function splitIntoChunks(text: string): string[] {
  if (text.length <= 200) return [text];

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > 200 && current.length > 0) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
