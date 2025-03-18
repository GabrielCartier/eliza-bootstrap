import { type Character, type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { Elysia } from 'elysia';
import { MessageController } from '../controllers/message-controller';
import { MessageService } from '../services/message-service';

export class ApiClient {
  public app: Elysia;
  private agents: Map<string, IAgentRuntime>;
  public server: ReturnType<Elysia['listen']> | null = null;
  public startAgent: ((character: Character) => Promise<IAgentRuntime>) | null =
    null;
  public loadCharacterTryPath: ((path: string) => Promise<Character>) | null =
    null;
  public jsonToCharacter: ((json: unknown) => Character) | null = null;
  private isInitialized = false;
  private messageController: MessageController;

  constructor() {
    this.agents = new Map();
    this.app = new Elysia()
      .onRequest(({ set }) => {
        // Add CORS headers to all responses
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] =
          'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] =
          'Content-Type, Authorization';
      })
      .options('*', () => new Response(null, { status: 204 }));

    const messageService = new MessageService(this.agents);
    this.messageController = new MessageController(messageService);
    this.setupRoutes();

    // Set up lifecycle hooks
    this.app.onStart(({ server }) => {
      elizaLogger.info(`[ApiClient] Running at ${server?.url}`);
      if (!this.isInitialized) {
        this.isInitialized = true;
      }
    });

    this.app.onStop(async () => {
      elizaLogger.info('[ApiClient] Stopping...');
      try {
        // Close all agent connections
        this.agents.clear();
        this.isInitialized = false;
        elizaLogger.info('[ApiClient] Stopped successfully');
      } catch (error) {
        elizaLogger.error('[ApiClient] Error during shutdown:', error);
        throw error;
      }
    });
  }

  private setupRoutes() {
    this.messageController.setupRoutes(this.app);
  }

  // agent/src/index.ts:startAgent calls this
  public registerAgent(runtime: IAgentRuntime) {
    this.agents.set(runtime.agentId, runtime);
  }

  public unregisterAgent(runtime: IAgentRuntime) {
    this.agents.delete(runtime.agentId);
  }

  public start(port: number) {
    elizaLogger.info(`[ApiClient] Starting server on port ${port}`);
    this.server = this.app.listen(port, () => {
      elizaLogger.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`,
      );
    });
  }

  public async stop() {
    elizaLogger.info('[ApiClient] Stop method called');
    if (this.server) {
      elizaLogger.info('[ApiClient] Closing server...');
      // @ts-ignore - Elysia's server type doesn't include close method, but it exists at runtime
      this.server.close(() => {
        elizaLogger.info('[ApiClient] Server closed successfully');
      });
    } else {
      elizaLogger.info('[ApiClient] No server to stop');
    }
  }
}
