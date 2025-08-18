import { Injectable } from '@nestjs/common';
import { Unit } from '../entities/unit';
import { Score } from '../entities/score';
import { GAME_CONSTANTS } from '../../shared/constants/game.constants';
import { ICombatService, IAttackResult } from '../../shared/interfaces/attack.interface';

// Keep the original interface for backward compatibility
export interface AttackResult extends IAttackResult {}

@Injectable()
export class CombatService implements ICombatService {
  executeAttack(attacker: Unit, target: Unit): IAttackResult {
    if (!attacker.isAlive()) {
      throw new Error(GAME_CONSTANTS.ERRORS.DEAD_UNITS_CANNOT_ATTACK);
    }

    if (!target.isAlive()) {
      throw new Error(GAME_CONSTANTS.ERRORS.CANNOT_ATTACK_DEAD_UNITS);
    }

    if (!attacker.canAttack()) {
      throw new Error(`Unit must wait ${attacker.getTimeUntilNextAttack()}ms before next attack`);
    }

    const damage = attacker.attack();
    target.takeDamage(damage);

    const score = this.createScore(attacker, target, damage);

    return {
      attacker,
      target,
      damage,
      score,
      wasBlocked: false
    };
  }

  private createScore(attacker: Unit, target: Unit, damage: number): Score {
    return new Score(
      attacker.getName().getValue(),
      target.getName().getValue(),
      damage,
      target.getHealth().getValue()
    );
  }

  canExecuteAttack(attacker: Unit, target: Unit): boolean {
    return attacker.isAlive() &&
           target.isAlive() &&
           attacker.canAttack();
  }

  getAttackCooldownInfo(unit: Unit): { canAttack: boolean; timeRemaining: number } {
    return {
      canAttack: unit.canAttack(),
      timeRemaining: unit.getTimeUntilNextAttack()
    };
  }
}
