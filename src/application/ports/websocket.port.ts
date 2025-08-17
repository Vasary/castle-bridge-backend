import { Game } from '../../domain/aggregates/game';
import { Unit } from '../../domain/entities/unit';

export interface AttackData {
  target: any;
  trigger: any;
  attackPower: number;
}

export interface WebSocketPort {
  emitGameState(game: Game): void;
  emitAttack(attackData: AttackData): void;
  emitGameOver(scores: any): void;
  emitGameRestarted(game: Game): void;
  emitPlayerJoined(player: Unit): void;
}
