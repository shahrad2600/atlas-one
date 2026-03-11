/**
 * Atlas One -- Conversation Manager
 *
 * In-memory conversation store for the AI orchestrator.
 * Tracks conversation history, agent routing decisions, and message metadata
 * so that multi-turn interactions maintain context across exchanges.
 *
 * In production this would be backed by PostgreSQL or Redis; the in-memory
 * implementation preserves the same interface for future migration.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single message within a conversation. */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentUsed?: string;
  toolsUsed?: string[];
  suggestions?: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** A conversation session between a user and the AI orchestrator. */
export interface Conversation {
  id: string;
  userId: string;
  tripId?: string;
  messages: ConversationMessage[];
  agentHistory: string[];
  createdAt: string;
  updatedAt: string;
}

/** Options for listing conversations. */
export interface ListConversationsOptions {
  limit: number;
  offset: number;
}

/** Paginated result for conversation listings. */
export interface PaginatedConversations {
  data: Omit<Conversation, 'messages'>[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Conversation Manager
// ---------------------------------------------------------------------------

/**
 * In-memory conversation store.
 *
 * Thread-safe for single-process Node.js (no concurrent writes on the
 * same key). For multi-process deployments, swap to a Redis-backed
 * implementation with the same interface.
 */
export class ConversationManager {
  /** Conversations indexed by conversation ID. */
  private conversations: Map<string, Conversation> = new Map();

  /** Secondary index: userId -> Set<conversationId> for fast listing. */
  private userIndex: Map<string, Set<string>> = new Map();

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  /**
   * Create a new conversation.
   *
   * @param userId - The authenticated user who owns the conversation.
   * @param tripId - Optional trip association.
   * @returns The newly created conversation.
   */
  create(userId: string, tripId?: string): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: generateId('conv'),
      userId,
      tripId,
      messages: [],
      agentHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, conversation);

    // Update user index.
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(conversation.id);

    return conversation;
  }

  // -------------------------------------------------------------------------
  // Get
  // -------------------------------------------------------------------------

  /**
   * Retrieve a conversation by ID.
   *
   * @param conversationId - The conversation to look up.
   * @returns The conversation, or null if not found.
   */
  get(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) ?? null;
  }

  // -------------------------------------------------------------------------
  // Add Message
  // -------------------------------------------------------------------------

  /**
   * Append a message to an existing conversation.
   *
   * @param conversationId - The target conversation.
   * @param message - The message to add (without ID/timestamp -- those are generated).
   * @returns The complete message with generated fields.
   * @throws Error if the conversation does not exist.
   */
  addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>,
  ): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const fullMessage: ConversationMessage = {
      ...message,
      id: generateId('msg'),
      timestamp: new Date().toISOString(),
    };

    conversation.messages.push(fullMessage);
    conversation.updatedAt = fullMessage.timestamp;

    // Track agent usage.
    if (message.agentUsed && !conversation.agentHistory.includes(message.agentUsed)) {
      conversation.agentHistory.push(message.agentUsed);
    }

    return fullMessage;
  }

  // -------------------------------------------------------------------------
  // List
  // -------------------------------------------------------------------------

  /**
   * List conversations for a given user with pagination.
   *
   * Returns conversation metadata (without full message history) to keep
   * the listing lightweight. Sorted by most recently updated first.
   *
   * @param userId - The user whose conversations to list.
   * @param options - Pagination options.
   * @returns Paginated conversation list.
   */
  list(userId: string, options: ListConversationsOptions): PaginatedConversations {
    const conversationIds = this.userIndex.get(userId);
    if (!conversationIds || conversationIds.size === 0) {
      return { data: [], total: 0, limit: options.limit, offset: options.offset, hasMore: false };
    }

    // Collect and sort by updatedAt descending.
    const conversations = Array.from(conversationIds)
      .map((id) => this.conversations.get(id))
      .filter((c): c is Conversation => c !== undefined)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = conversations.length;
    const page = conversations.slice(options.offset, options.offset + options.limit);

    // Strip message bodies for the listing.
    const data = page.map((c) => ({
      id: c.id,
      userId: c.userId,
      tripId: c.tripId,
      agentHistory: c.agentHistory,
      messageCount: c.messages.length,
      lastMessage: c.messages.length > 0
        ? c.messages[c.messages.length - 1].content.slice(0, 100)
        : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      data: data as unknown as Omit<Conversation, 'messages'>[],
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    };
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  /**
   * Delete a conversation.
   *
   * @param conversationId - The conversation to delete.
   * @param userId - The owner (for authorization check).
   * @returns True if deleted, false if not found or not owned.
   */
  delete(conversationId: string, userId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    if (conversation.userId !== userId) {
      return false;
    }

    this.conversations.delete(conversationId);

    // Clean user index.
    const userConvs = this.userIndex.get(userId);
    if (userConvs) {
      userConvs.delete(conversationId);
      if (userConvs.size === 0) {
        this.userIndex.delete(userId);
      }
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // Stats (for health/debug endpoints)
  // -------------------------------------------------------------------------

  /**
   * Return summary stats about the conversation store.
   */
  stats(): { totalConversations: number; totalUsers: number } {
    return {
      totalConversations: this.conversations.size,
      totalUsers: this.userIndex.size,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton (shared across the service lifecycle)
// ---------------------------------------------------------------------------

let _instance: ConversationManager | null = null;

/**
 * Get (or create) the singleton ConversationManager instance.
 */
export function getConversationManager(): ConversationManager {
  if (!_instance) {
    _instance = new ConversationManager();
  }
  return _instance;
}
