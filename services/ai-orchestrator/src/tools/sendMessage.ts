/**
 * Atlas One -- sendMessage Tool
 *
 * Sends messages to partners (venues, hosts, airlines) or users through
 * the platform messaging system. Used for notifications, dispute
 * communications, and claim submissions.
 *
 * Design invariant: Mutation tool -- rate-limited at 10 calls per minute.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = rateLimitMap.get(userId);

  if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= RATE_LIMIT_MAX_CALLS) {
    return false;
  }

  state.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export const sendMessageTool: ToolDefinition = {
  name: 'sendMessage',

  description:
    'Send a message to a partner (venue, host, airline) or user through the ' +
    'platform messaging system. Supports structured message types for ' +
    'notifications, disputes, claims, and general communication.',

  parameters: {
    type: 'object',
    required: ['recipientType', 'messageType'],
    properties: {
      recipientType: {
        type: 'string',
        enum: ['user', 'partner', 'insurance_provider', 'support_team'],
        description: 'Type of message recipient.',
      },
      recipientId: {
        type: 'string',
        description: 'Specific recipient identifier. Required for partner messages.',
      },
      messageType: {
        type: 'string',
        enum: [
          'refund_confirmation',
          'booking_confirmation',
          'cancellation_notice',
          'modification_notice',
          'dispute_notification',
          'claim_submission',
          'damage_claim_notification',
          'status_update',
          'general',
        ],
        description: 'Structured message type.',
      },
      subject: {
        type: 'string',
        description: 'Message subject line.',
      },
      body: {
        type: 'string',
        description: 'Message body text. Used for general message types.',
      },
      templateData: {
        type: 'object',
        description: 'Structured data for template-based messages. Contents vary by messageType.',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        description: 'Message delivery priority.',
      },
      channel: {
        type: 'string',
        enum: ['in_app', 'email', 'sms', 'push'],
        default: 'in_app',
        description: 'Delivery channel.',
      },
    },
  },

  /**
   * Validate message parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['recipientType']) errors.push('recipientType is required.');
    if (!params['messageType']) errors.push('messageType is required.');

    // Partner messages require a recipientId.
    if (params['recipientType'] === 'partner' && !params['recipientId']) {
      errors.push('recipientId is required for partner messages.');
    }

    // General messages require a body.
    if (params['messageType'] === 'general' && !params['body']) {
      errors.push('body is required for general messages.');
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 10 message calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute message delivery via the Messaging Service.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call the Messaging Service API.

    return {
      traceId: context.traceId,
      messageId: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      recipientType: params['recipientType'],
      messageType: params['messageType'],
      channel: params['channel'] ?? 'in_app',
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
  },
};
