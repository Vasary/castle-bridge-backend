import { Injectable } from '@nestjs/common';
import { WebSocketPort, AttackData } from '../../application/ports/websocket.port';
import { Game } from '../../domain/aggregates/game';
import { Unit } from '../../domain/entities/unit';

@Injectable()
export class WebSocketAdapter implements WebSocketPort {
  private gateway: any; // Will be injected

  setGateway(gateway: any): void {
    this.gateway = gateway;
  }

  emitGameState(game: Game): void {
    if (this.gateway) {
      this.gateway.server.emit('game.state', game.toPlainObject());
    }
  }

  emitAttack(attackData: AttackData): void {
    if (this.gateway) {
      this.gateway.server.emit('unit.attack', attackData);
    }
  }

  emitGameOver(scores: any): void {
    if (this.gateway) {
      this.gateway.server.emit('game.over', scores);
    }
  }

  emitGameRestarted(game: Game): void {
    if (this.gateway) {
      this.gateway.server.emit('game.restarted', game.toPlainObject());
    }
  }

  emitPlayerJoined(player: Unit): void {
    // This is handled differently in the gateway
  }
}
