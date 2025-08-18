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

  @WebSocketServer()
  server: Server = new Server<ServerToClientEvents, ClientToServerEvents>();

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

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
      await this.commandBus.execute(new PlayerLeaveCommand(heroId));
      this.clientToHeroId.delete(client.id);

      this.logger.log(`🚪 PLAYER LEFT: ${heroId} (${client.id}) | Remaining connections: ${this.server.engine.clientsCount - 1}`);

      const gameState = await this.queryBus.execute(new GameStateQuery());
      this.server.emit('game.state', gameState);
    } else {
      this.logger.log(`🔌 CLIENT DISCONNECTED: ${client.id} | Remaining connections: ${this.server.engine.clientsCount - 1}`);
    }
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
}
