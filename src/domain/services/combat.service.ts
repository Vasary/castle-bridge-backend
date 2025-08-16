import { Injectable } from '@nestjs/common';
import { Unit } from '../entities/unit';
import { Score } from '../entities/score';

export interface AttackResult {
  attacker: Unit;
  target: Unit;
  damage: number;
  score: Score;
}

@Injectable()
export class CombatService {
  executeAttack(attacker: Unit, target: Unit): AttackResult {
    if (!attacker.isAlive()) {
      throw new Error('Dead units cannot attack');
    }
    
    if (!target.isAlive()) {
      throw new Error('Cannot attack dead units');
    }

    const damage = attacker.attack();
    const targetHealthBefore = target.getHealth().getValue();
    
    target.takeDamage(damage);
    
    const score = new Score(
      attacker.getName().getValue(),
      target.getName().getValue(),
      damage,
      target.getHealth().getValue()
    );

    return {
      attacker,
      target,
      damage,
      score
    };
  }
}
