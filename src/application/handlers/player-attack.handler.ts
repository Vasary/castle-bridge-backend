import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PlayerAttackCommand } from '../commands/player-attack.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService, AttackResult } from '../../domain/services/combat.service';
import { UnitId } from '../../domain/value-objects/unit-id';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';

@Injectable()
@CommandHandler(PlayerAttackCommand)
export class PlayerAttackHandler implements ICommandHandler<PlayerAttackCommand> {
  private readonly logger = new Logger(PlayerAttackHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly combatService: CombatService,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: PlayerAttackCommand): Promise<any> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }

    const hero = game.getHero(new UnitId(command.playerId));
    if (!hero) {
      throw new Error('Hero not found');
    }

    try {
      const target = game.getRandomAliveVillain();
      const targetHealthBefore = target.getHealth().getValue();
      const attackResult = this.combatService.executeAttack(hero, target);

      game.addScore(attackResult.score);

      // Log the attack with detailed information
      const targetHealthAfter = target.getHealth().getValue();
      const isKilled = targetHealthAfter === 0;
      const killStatus = isKilled ? '💀 KILLED' : `❤️ ${targetHealthAfter}HP`;

      this.logger.log(`⚔️ HERO ATTACK: ${hero.getName().getValue()} ➤ ${target.getName().getValue()} | Damage: ${attackResult.damage} | ${targetHealthBefore}HP ➤ ${killStatus}`);

      // Publish attack event
      this.eventBus.publish(new UnitAttackedEvent(
        attackResult.attacker,
        attackResult.target,
        attackResult.damage
      ));

      // Check if game should end
      if (game.shouldGameEnd()) {
        game.finish();
        const aliveHeroes = game.getAliveHeroes().length;
        const aliveVillains = game.getAliveVillains().length;
        this.logger.log(`🏁 GAME OVER: Heroes: ${aliveHeroes} | Villains: ${aliveVillains} | Total Scores: ${game.getScores().length}`);
        this.eventBus.publish(new GameFinishedEvent(game));
      }

      await this.gameRepository.save(game);

      return {
        gameState: game.toPlainObject(),
        attackData: {
          target: attackResult.target.toPlainObject(),
          trigger: attackResult.attacker.toPlainObject(),
          attackPower: attackResult.damage
        }
      };
    } catch (error) {
      // No alive villains - game over
      game.finish();
      this.logger.log(`🏁 GAME OVER: No more villains alive!`);
      this.eventBus.publish(new GameFinishedEvent(game));
      await this.gameRepository.save(game);
      throw error;
    }
  }
}
