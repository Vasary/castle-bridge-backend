import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer} from "@nestjs/websockets";
import {Server, Socket} from 'socket.io';
import {ServerToClientEvents} from '../../shared/contracts/server-to-client.event';
import {ClientToServerEvents} from '../../shared/contracts/client-to-server.event';
import {PlayerJoinInterface} from '../../shared/contracts/player-join.interface';
import {CommandBus, QueryBus} from "@nestjs/cqrs";
import {PlayerJoinCommand} from "../business /command/player-join";
import {PlayerAttackCommand} from "../business /command/player-attack";
import {PlayerLeaveCommand} from "../business /command/player-leave";
import {Injectable} from "@nestjs/common";
import {GameStateQuery} from "../business /query/game-state.query";
import {AttackResultDto} from "../../shared/dto/attack.result.dto";
import {GameOverCommand} from "../business /command/game-over";
import {GameStartCommand} from "../business /command/game-start";
import { GameRestartCommand } from "../business /command/game-restart";

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class WebSocketGameGateway {
  private clientToHeroId: Map<string, string> = new Map();

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus
  ) {
  }

  @WebSocketServer() server: Server = new Server<ServerToClientEvents, ClientToServerEvents>();

  @SubscribeMessage('player.join')
  async playerJoinHandler(@MessageBody() message: string, @ConnectedSocket() client: Socket,): Promise<PlayerJoinInterface> {
    const payload: PlayerJoinInterface = JSON.parse(message);

    const player = await this.commandBus.execute(
      new PlayerJoinCommand(payload.id, payload.nickname),
    );

    this.clientToHeroId.set(client.id, payload.id);

    let gameState = await this.queryBus.execute(
      new GameStateQuery(),
    );

    if(!gameState.isStarted){
      gameState = await this.commandBus.execute(
        new GameStartCommand(),
      )
    }

    if(gameState.isOver) {
      this.server.emit('game.over', gameState.scores);
    } else {
      client.emit('player.join', player)
    }

    this.server.emit('game.state', gameState);

    return payload;
  }

  @SubscribeMessage('unit.attack')
  async heroAttackHandler(@ConnectedSocket() client: Socket) {

    const totalAttackData = await this.commandBus.execute(
      new PlayerAttackCommand(this.getHeroIdForClient(client)),
    );

    this.server.emit('game.state', totalAttackData.gameState);
    this.server.emit('unit.attack', totalAttackData.attackData);
  }

  async handleConnection(client: Socket) {
    const gameState = await this.queryBus.execute(
        new GameStateQuery(),
    );

    client.emit('game.state', gameState)

    if(gameState.isOver) {
      client.emit('game.over', gameState.scores);
    }
  }

  @SubscribeMessage('game.restart')
  async gameRestartHandler(@ConnectedSocket() client: Socket) {

    const gameState = await this.commandBus.execute(
      new GameRestartCommand(),
    );

    this.server.emit('game.restarted', gameState);
  }

  async villainAttack(attackResult: AttackResultDto){
    this.server.emit('unit.attack', attackResult.attackData);
    this.server.emit('game.state', attackResult.gameState);
  }

  async gameOver(){
    const gameState = await this.commandBus.execute(new GameOverCommand())
    this.server.emit('game.over', gameState.scores);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    await this.commandBus.execute(
      new PlayerLeaveCommand(this.getHeroIdForClient(client)),
    );

    this.clientToHeroId.delete(client.id);

    this.server.emit('game.state', await this.queryBus.execute(new GameStateQuery()));
  }

  private getHeroIdForClient(client: Socket): string {
    return this.clientToHeroId.get(client.id);
  }
}
