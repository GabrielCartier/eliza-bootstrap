import { elizaLogger } from '@elizaos/core';
import { type Elysia, t } from 'elysia';
import type { MessageService } from '../services/message-service';
import { messageRequestSchema } from '../types/requests/message-request';
import { errorResponseSchema } from '../types/responses/error-response';
import { messageResponseSchema } from '../types/responses/message-response';

export class MessageController {
  private readonly messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }

  public setupRoutes(app: Elysia): void {
    app.post(
      '/message',
      async ({ body }) => {
        try {
          elizaLogger.info(
            `[MessageController] Message endpoint called for agent ${body.agentId}`,
          );
          return await this.messageService.handleMessage(body);
        } catch (error) {
          elizaLogger.error(
            '[MessageController] Error processing message:',
            error,
          );
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
            { status: 500 },
          );
        }
      },
      {
        body: messageRequestSchema,
        response: {
          200: t.Array(messageResponseSchema),
          500: errorResponseSchema,
        },
      },
    );
  }
}
