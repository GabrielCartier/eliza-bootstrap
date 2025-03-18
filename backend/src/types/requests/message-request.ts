import { t } from 'elysia';

export const messageRequestSchema = t.Object({
  userId: t.String(),
  agentId: t.String(),
  text: t.String(),
  roomId: t.Optional(t.String()),
  userName: t.Optional(t.String()),
  name: t.Optional(t.String()),
});

export type MessageRequest = typeof messageRequestSchema.static;