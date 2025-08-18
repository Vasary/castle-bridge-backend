import { Unit } from '../../domain/entities/unit';
import { Score } from '../../domain/entities/score';

export interface IAttackResult {
  readonly attacker: Unit;
  readonly target: Unit;
  readonly damage: number;
  readonly score: Score;
  readonly wasBlocked: boolean;
}

export interface IAttackResponse {
  readonly gameState: any;
  readonly attackData: {
    readonly target: any;
    readonly trigger: any;
    readonly attackPower: number;
    readonly nextAttackAvailable: string;
  };
}

export interface IAttackError {
  readonly error: string;
}

export type AttackExecutionResult = IAttackResponse | IAttackError;

export interface ICombatService {
  executeAttack(attacker: Unit, target: Unit): IAttackResult;
  canExecuteAttack(attacker: Unit, target: Unit): boolean;
  getAttackCooldownInfo(unit: Unit): { canAttack: boolean; timeRemaining: number };
}
