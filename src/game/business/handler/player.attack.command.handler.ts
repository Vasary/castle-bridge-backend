import { CommandHandler, EventBus, ICommandHandler } from "@nestjs/cqrs";
import { Score } from "../score/score.enity";
import { getHit } from "../helper/hit-calculator.helper";
import { Unit } from "../../../unit/entity/unit.enity";
import { PlayerAttackCommand } from "../../../websocket/business /command/player-attack";
import { GameState } from "../state/game.state";
import { GameOverEvent } from "../../../websocket/business /event/game-over.event";
import { AttackResultDto } from "../../../shared/dto/attack.result.dto";

@CommandHandler(PlayerAttackCommand)
export class PlayerAttackCommandHandler implements ICommandHandler<PlayerAttackCommand> {
    constructor(
      private readonly game: GameState,
      private readonly publisher: EventBus
    ) {}

    async execute(command: PlayerAttackCommand) {
        let enemy: Unit;

        try {
            enemy = this.getEnemy();
        } catch (err) {
            this.publisher.publish(new GameOverEvent(this.game));
        }

        const hero = this.getHero(command.heroId);
        const attackPower = this.calculateAttackPower(hero);

        this.applyHeroAttackToEnemy(enemy, attackPower);

        const score = this.createScore(hero, enemy, attackPower);
        this.game.addScore(score);

        return this.createAttackResult(hero, enemy, attackPower);
    }

    getEnemy(): Unit {
        return this.game.getEnemy();
    }

    getHero(heroId: string): Unit {
        return this.game.getHero(heroId);
    }

    calculateAttackPower(hero: Unit): number {
        return getHit(hero);
    }

    applyHeroAttackToEnemy(enemy: Unit, attackPower: number): void {
        enemy.applyDamage(attackPower);
    }

    createScore(hero: Unit, enemy: Unit, attackPower: number): Score {
        return new Score(hero.title, enemy.title, attackPower, enemy.health);
    }

    createAttackResult(hero: Unit, enemy: Unit, attackPower: number): AttackResultDto {
        const attackResult =  new AttackResultDto()

        attackResult.gameState = this.game;
        attackResult.attackData = {
            target: enemy,
            trigger: hero,
            attackPower: attackPower
        }

        return attackResult;
    }
}
