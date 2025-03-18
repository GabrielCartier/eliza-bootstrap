import {
    type Content,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    elizaLogger,
    generateMessageResponse,
    getEmbeddingZeroVector,
    stringToUuid,
  } from '@elizaos/core';
  import { messageHandlerTemplate } from '../templates/base-templates';
  import type { MessageRequest } from '../types/requests/message-request';
  
  export class MessageService {
    private readonly agents: Map<string, IAgentRuntime>;
  
    constructor(agents: Map<string, IAgentRuntime>) {
      this.agents = agents;
    }
  
    public async handleMessage(request: MessageRequest): Promise<Response> {
      try {
        elizaLogger.info('[MessageService] Starting message handling');
        const { agentId } = request;
  
        const agent = this.agents.get(agentId);
        if (!agent) {
          elizaLogger.error(
            `[MessageService] Agent not found for ID/name: ${agentId}`,
          );
          return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
  
        const roomId = stringToUuid(request.roomId ?? `default-room-${agentId}`);
        const userId =
          request.userId as `${string}-${string}-${string}-${string}-${string}`;
  
        await agent.ensureConnection(
          userId,
          roomId,
          request.userName,
          request.name,
          'direct',
        );
  
        const text = request.text;
        if (!text) {
          return Response.json([]);
        }
  
        const messageId = stringToUuid(Date.now().toString());
        const content: Content = {
          text,
          attachments: [],
          source: 'direct',
          inReplyTo: undefined,
        };
        const userMessage = {
          content,
          userId,
          roomId,
          agentId: agent.agentId,
        };
        const memory: Memory = {
          id: stringToUuid(`${messageId}-${userId}`),
          ...userMessage,
          agentId: agent.agentId,
          userId,
          roomId,
          content,
        };
        await agent.messageManager.addEmbeddingToMemory(memory);
        await agent.messageManager.createMemory(memory);
  
        let state: State | undefined;
        try {
          state = await agent.composeState(userMessage, {
            agentName: agent.character.name,
          });
        } catch (error) {
          elizaLogger.error('[MessageService] Error composing state:', error);
          return Response.json(
            { error: 'Failed to compose state' },
            { status: 500 },
          );
        }
  
        if (!state) {
          return Response.json(
            { error: 'Failed to compose state' },
            { status: 500 },
          );
        }
  
        const context = composeContext({
          state,
          template: messageHandlerTemplate,
        });
  
        const response = await generateMessageResponse({
          runtime: agent,
          context,
          modelClass: ModelClass.LARGE,
        });
  
        if (!response) {
          return Response.json(
            { error: 'No response generated' },
            { status: 500 },
          );
        }
  
        // save response to memory
        const responseMessage: Memory = {
          id: stringToUuid(`${messageId}-${agent.agentId}`),
          ...userMessage,
          userId: agent.agentId,
          content: response,
          embedding: getEmbeddingZeroVector(),
          createdAt: Date.now(),
        };
        await agent.messageManager.createMemory(responseMessage);
  
        state = await agent.updateRecentMessageState(state);
  
        let message = null as Content | null;
        await agent.processActions(
          memory,
          [responseMessage],
          state,
          async (newMessages) => {
            message = newMessages;
            return [memory];
          },
        );
  
        await agent.evaluate(memory, state);
  
        const responseContent = message ? [message] : [response];
        return Response.json(responseContent);
      } catch (error) {
        elizaLogger.error('[MessageService] Error in handleMessage:', error);
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          { status: 500 },
        );
      }
    }
  }
  