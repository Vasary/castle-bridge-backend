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

    if (!hero.canAttack()) {
      const timeRemaining = hero.getTimeUntilNextAttack();
      throw new Error(`Hero must wait ${Math.ceil(timeRemaining / 1000)} seconds before next attack`);
    }

    try {
      const target = game.getRandomAliveVillain();
      const targetHealthBefore = target.getHealth().getValue();
      const attackResult = this.combatService.executeAttack(hero, target);

      game.addScore(attackResult.score);

      const targetHealthAfter = target.getHealth().getValue();
      const isKilled = targetHealthAfter === 0;
      const killStatus = isKilled ? '💀 KILLED' : `❤️ ${targetHealthAfter}HP`;
      const nextAttackIn = hero.getTimeUntilNextAttack();

      this.logger.log(`⚔️ HERO ATTACK: ${hero.getName().getValue()} ➤ ${target.getName().getValue()} | Damage: ${attackResult.damage} | ${targetHealthBefore}HP ➤ ${killStatus} | Next attack in: ${Math.ceil(nextAttackIn / 1000)}s`);

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
          attackPower: attackResult.damage,
          nextAttackAvailable: new Date(Date.now() + hero.getTimeUntilNextAttack()).toISOString()
        }
      };
    } catch (error) {
      if (error.message.includes('must wait')) {
        throw error; // Re-throw cooldown errors to client
      }

      // No alive villains - game over
      game.finish();
      this.logger.log(`🏁 GAME OVER: No more villains alive!`);
      this.eventBus.publish(new GameFinishedEvent(game));
      await this.gameRepository.save(game);
      throw error;
    }
  }
}
