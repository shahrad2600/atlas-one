import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateBody, validateQuery, validateParams, uuidSchema, paginationSchema } from '@atlas/validation';
import {
  findNotificationById,
  findNotificationsByUserId,
  markNotificationRead,
  markAllNotificationsRead,
  findThreadById,
  findThreadsByUserId,
  isThreadParticipant,
  findMessagesByThread,
  createMessage,
  createThread,
  addParticipant,
  createMessageInTx,
  transaction,
  getPool,
} from '../db/index.js';

// ── Validation Schemas ──────────────────────────────────────────────

const notificationIdParamsSchema = z.object({
  notificationId: uuidSchema,
});

const threadIdParamsSchema = z.object({
  threadId: uuidSchema,
});

const listNotificationsQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  type: z.enum(['push', 'sms', 'email', 'whatsapp', 'in_app']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const listThreadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createThreadBodySchema = z.object({
  participantIds: z.array(uuidSchema).min(1).max(50),
  subject: z.string().min(1).max(200).optional(),
  initialMessage: z.string().min(1).max(5000),
  threadType: z.enum(['user_partner', 'user_concierge', 'group_trip', 'system']).default('user_partner'),
  tripId: uuidSchema.optional(),
});

const sendMessageBodySchema = z.object({
  body: z.string().min(1).max(5000),
  contentType: z.enum(['text', 'image', 'file', 'system_event', 'card']).default('text'),
});

// ── Helper: get authenticated user ID ───────────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Route Registration ──────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status endpoint ─────────────────────────────────────────────
  server.get('/api/v1/messaging/status', async () => ({
    service: 'messaging-service',
    routes: ['notifications', 'threads', 'messages'],
  }));

  // ════════════════════════════════════════════════════════════════
  //  NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/messaging/notifications -- List user's notifications
  server.get(
    '/api/v1/messaging/notifications',
    { preValidation: [validateQuery(listNotificationsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { unread, type, limit, offset } =
        request.query as z.infer<typeof listNotificationsQuerySchema>;

      const { data, total } = await findNotificationsByUserId(userId, {
        unreadOnly: unread,
        type,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // GET /api/v1/messaging/notifications/:notificationId -- Get notification
  server.get(
    '/api/v1/messaging/notifications/:notificationId',
    { preValidation: [validateParams(notificationIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { notificationId } = request.params as z.infer<typeof notificationIdParamsSchema>;

      const notification = await findNotificationById(notificationId);
      if (!notification) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Notification not found',
          },
        });
      }

      // Ownership check
      if (notification.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this notification',
          },
        });
      }

      // Mark as read on access
      if (!notification.read_at) {
        await markNotificationRead(notificationId);
        notification.read_at = new Date().toISOString();
        notification.status = 'read';
      }

      return reply.send(notification);
    },
  );

  // POST /api/v1/messaging/notifications/:notificationId/read -- Mark as read
  server.post(
    '/api/v1/messaging/notifications/:notificationId/read',
    { preValidation: [validateParams(notificationIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { notificationId } = request.params as z.infer<typeof notificationIdParamsSchema>;

      const notification = await findNotificationById(notificationId);
      if (!notification) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Notification not found',
          },
        });
      }

      // Ownership check
      if (notification.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this notification',
          },
        });
      }

      await markNotificationRead(notificationId);

      return reply.code(204).send();
    },
  );

  // POST /api/v1/messaging/notifications/read-all -- Mark all as read
  server.post(
    '/api/v1/messaging/notifications/read-all',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const count = await markAllNotificationsRead(userId);

      return reply.send({ updated: count });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  THREADS
  // ════════════════════════════════════════════════════════════════

  // GET /api/v1/messaging/threads -- List user's message threads
  server.get(
    '/api/v1/messaging/threads',
    { preValidation: [validateQuery(listThreadsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { limit, offset } = request.query as z.infer<typeof listThreadsQuerySchema>;

      const { data, total } = await findThreadsByUserId(userId, { limit, offset });

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // GET /api/v1/messaging/threads/:threadId -- Get thread messages
  server.get(
    '/api/v1/messaging/threads/:threadId',
    {
      preValidation: [
        validateParams(threadIdParamsSchema),
        validateQuery(listMessagesQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { threadId } = request.params as z.infer<typeof threadIdParamsSchema>;
      const { limit, offset } = request.query as z.infer<typeof listMessagesQuerySchema>;

      // Verify thread exists
      const thread = await findThreadById(threadId);
      if (!thread) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
          },
        });
      }

      // Participant access check
      const isParticipant = await isThreadParticipant(threadId, userId);
      if (!isParticipant) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a participant in this thread',
          },
        });
      }

      const { data: messages, total } = await findMessagesByThread(threadId, { limit, offset });

      return reply.send({
        thread,
        messages,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // POST /api/v1/messaging/threads -- Create new thread
  server.post(
    '/api/v1/messaging/threads',
    { preValidation: [validateBody(createThreadBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createThreadBodySchema>;

      const pool = getPool();

      const result = await transaction(pool, async (client) => {
        // Create the thread
        const thread = await createThread(client, {
          threadType: body.threadType,
          subject: body.subject ?? null,
          tripId: body.tripId ?? null,
        });

        // Add the creating user as a participant
        await addParticipant(client, {
          threadId: thread.thread_id,
          participantType: 'user',
          participantRefId: userId,
          displayName: null,
        });

        // Add all other participants
        for (const participantId of body.participantIds) {
          if (participantId !== userId) {
            await addParticipant(client, {
              threadId: thread.thread_id,
              participantType: 'user',
              participantRefId: participantId,
              displayName: null,
            });
          }
        }

        // Create the initial message
        const message = await createMessageInTx(client, {
          threadId: thread.thread_id,
          senderId: userId,
          senderType: 'user',
          body: body.initialMessage,
          contentType: 'text',
        });

        return { thread, message };
      });

      request.log.info(
        { userId, threadId: result.thread.thread_id },
        'Thread created',
      );

      return reply.code(201).send(result);
    },
  );

  // POST /api/v1/messaging/threads/:threadId/messages -- Send message
  server.post(
    '/api/v1/messaging/threads/:threadId/messages',
    {
      preValidation: [
        validateParams(threadIdParamsSchema),
        validateBody(sendMessageBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { threadId } = request.params as z.infer<typeof threadIdParamsSchema>;
      const body = request.body as z.infer<typeof sendMessageBodySchema>;

      // Verify thread exists
      const thread = await findThreadById(threadId);
      if (!thread) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Thread not found',
          },
        });
      }

      // Participant access check
      const isParticipant = await isThreadParticipant(threadId, userId);
      if (!isParticipant) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a participant in this thread',
          },
        });
      }

      // Cannot send messages to closed/archived threads
      if (thread.status === 'closed' || thread.status === 'archived') {
        return reply.code(409).send({
          error: {
            code: 'THREAD_CLOSED',
            message: 'Cannot send messages to a closed or archived thread',
          },
        });
      }

      const message = await createMessage({
        threadId,
        senderId: userId,
        senderType: 'user',
        body: body.body,
        contentType: body.contentType,
      });

      request.log.info(
        { userId, threadId, messageId: message.message_id },
        'Message sent',
      );

      return reply.code(201).send(message);
    },
  );
}
