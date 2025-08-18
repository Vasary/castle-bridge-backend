import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

// Application commands and queries
import { PlayerJoinCommand } from '../../application/commands/player-join.command';
import { PlayerAttackCommand } from '../../application/commands/player-attack.command';
import { PlayerLeaveCommand } from '../../application/commands/player-leave.command';
import { GameStartCommand } from '../../application/commands/game-start.command';
import { GameRestartCommand } from '../../application/commands/game-restart.command';
import { GameOverCommand } from '../../application/commands/game-over.command';
import { GameStateQuery } from '../../application/queries/game-state.query';

// Legacy interfaces for compatibility
import { PlayerJoinInterface } from '../../shared/contracts/player-join.interface';
import { ServerToClientEvents } from '../../shared/contracts/server-to-client.event';
import { ClientToServerEvents } from '../../shared/contracts/client-to-server.event';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  private clientToHeroId: Map<string, string> = new Map();
  private readonly MAX_CLIENT_CONNECTIONS = 1000; // Prevent memory leaks
  private cleanupInterval: NodeJS.Timeout;

  @WebSocketServer()
  server: Server = new Server<ServerToClientEvents, ClientToServerEvents>();

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {
    // Set up periodic cleanup of stale connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Clean up every minute
  }

  @SubscribeMessage('player.join')
  async playerJoinHandler(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket
  ): Promise<PlayerJoinInterface> {
    const payload: PlayerJoinInterface = JSON.parse(message);

    const player = await this.commandBus.execute(
      new PlayerJoinCommand(payload.id, payload.nickname)
    );

    this.clientToHeroId.set(client.id, payload.id);

    let gameState = await this.queryBus.execute(new GameStateQuery());

    if (!gameState.isStarted) {
      gameState = await this.commandBus.execute(new GameStartCommand());
    }

    if (gameState.isOver) {
      this.server.emit('game.over', gameState.scores);
    } else {
      client.emit('player.join', player.toPlainObject());
    }

    this.server.emit('game.state', gameState);

    return payload;
  }

  @SubscribeMessage('unit.attack')
  async heroAttackHandler(@ConnectedSocket() client: Socket): Promise<void> {
    const heroId = this.getHeroIdForClient(client);
    if (!heroId) {
      return;
    }

    try {
      await this.commandBus.execute(
        new PlayerAttackCommand(heroId)
      );
      // Attack event and game state will be emitted by UnitAttackedEventHandler
    } catch (error) {
      // Handle attack errors (e.g., no enemies left)
      const gameState = await this.queryBus.execute(new GameStateQuery());
      this.server.emit('game.state', gameState);
    }
  }

  @SubscribeMessage('game.restart')
  async gameRestartHandler(@ConnectedSocket() client: Socket): Promise<void> {
    const gameState = await this.commandBus.execute(new GameRestartCommand());
    this.server.emit('game.restarted', gameState);
  }

  async handleConnection(client: Socket): Promise<void> {
    // Prevent memory exhaustion from too many connections
    if (this.clientToHeroId.size >= this.MAX_CLIENT_CONNECTIONS) {
      this.logger.warn(`Max connections reached (${this.MAX_CLIENT_CONNECTIONS}), rejecting new connection`);
      client.disconnect(true);
      return;
    }

    this.logger.log(`🔌 CLIENT CONNECTED: ${client.id} | Total connections: ${this.server.engine.clientsCount}`);

    const gameState = await this.queryBus.execute(new GameStateQuery());
    client.emit('game.state', gameState);

    if (gameState.isOver) {
      client.emit('game.over', gameState.scores);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const heroId = this.getHeroIdForClient(client);
    if (heroId) {
      try {
        await this.commandBus.execute(new PlayerLeaveCommand(heroId));
        this.logger.log(`🚪 PLAYER LEFT: ${heroId} (${client.id}) | Remaining connections: ${this.server.engine.clientsCount - 1}`);

        const gameState = await this.queryBus.execute(new GameStateQuery());
        this.server.emit('game.state', gameState);
      } catch (error) {
        this.logger.error(`Error handling player leave: ${error.message}`);
      }
    } else {
      this.logger.log(`🔌 CLIENT DISCONNECTED: ${client.id} | Remaining connections: ${this.server.engine.clientsCount - 1}`);
    }

    // Always clean up the mapping to prevent memory leaks
    this.clientToHeroId.delete(client.id);
  }

  // Methods for external use (from event handlers)
  async emitAttack(attackData: any): Promise<void> {
    this.server.emit('unit.attack', attackData);
    const gameState = await this.queryBus.execute(new GameStateQuery());
    this.server.emit('game.state', gameState);
  }

  async emitGameOver(): Promise<void> {
    const gameState = await this.commandBus.execute(new GameOverCommand());
    this.server.emit('game.over', gameState.scores);
  }

  private getHeroIdForClient(client: Socket): string | undefined {
    return this.clientToHeroId.get(client.id);
  }

  private cleanupStaleConnections(): void {
    try {
      const connectedClientIds = new Set(
        Array.from(this.server.sockets.sockets.keys())
      );

      // Remove mappings for clients that are no longer connected
      const staleClientIds: string[] = [];
      for (const [clientId] of this.clientToHeroId) {
        if (!connectedClientIds.has(clientId)) {
          staleClientIds.push(clientId);
        }
      }

      if (staleClientIds.length > 0) {
        staleClientIds.forEach(clientId => {
          this.clientToHeroId.delete(clientId);
        });
        this.logger.log(`🧹 Cleaned up ${staleClientIds.length} stale client connections`);
      }
    } catch (error) {
      this.logger.error(`Error during stale connection cleanup: ${error.message}`);
    }
  }

  // Cleanup method for graceful shutdown
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clientToHeroId.clear();
  }
}
