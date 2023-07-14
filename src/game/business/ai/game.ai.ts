import { Inject, Injectable } from "@nestjs/common";
import { GameState } from "../state/game.state";
import { Interval } from "@nestjs/schedule";
import { getHit } from "../helper/hit-calculator.helper";
import { EventBus } from "@nestjs/cqrs";
import { VillainAttackedEvent } from "../../../websocket/business /event/villain-attacked.event";
import { Unit } from "../../../unit/entity/unit.enity";
import { GameOverEvent } from "../../../websocket/business /event/game-over.event";
import { AttackResultDto } from "../../../shared/dto/attack.result.dto";

@Injectable()
export class GameAi {
  constructor(
    private readonly publisher: EventBus,
    @Inject(GameState) private gameState: GameState
  ) {}

  @Interval(1000)
  async executeAction() {
    if(this.gameState.isStarted && !this.gameState.isOver){
      let hero: Unit

      try {
        hero = this.getAliveHero();
      } catch (err) {
        this.publisher.publish(new GameOverEvent(this.gameState));

        return;
      }

      const villain: Unit = this.getEnemy();
      const attackPower: number = this.calculateAttackPower(villain);

      this.applyVillainAttackToHero(hero, attackPower);
      const attackResult = this.updateAttackResult(villain, hero, attackPower);

      this.publisher.publish(new VillainAttackedEvent(attackResult));
    }
  }

  getEnemy(): Unit {
    return this.gameState.getEnemy();
  }

  getAliveHero(): Unit {
    return this.gameState.getAliveHero();
  }

  calculateAttackPower(villain: Unit): number {
    return getHit(villain);
  }

  applyVillainAttackToHero(hero: Unit, attackPower: number): void {
    hero.applyDamage(attackPower);
  }

  updateAttackResult(villain: Unit, hero: Unit, attackPower: number): AttackResultDto {
    const attackResult: AttackResultDto = new AttackResultDto();
    attackResult.gameState = this.gameState;
    attackResult.attackData = {
      trigger: villain,
      target: hero,
      attackPower: attackPower
    };

    return attackResult;
  }
}
