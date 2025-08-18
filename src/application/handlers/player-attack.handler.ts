import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PlayerAttackCommand } from '../commands/player-attack.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService, AttackResult } from '../../domain/services/combat.service';
import { UnitId } from '../../domain/value-objects/unit-id';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';
import { MutexService } from '../../shared/services/mutex.service';

@Injectable()
@CommandHandler(PlayerAttackCommand)
export class PlayerAttackHandler implements ICommandHandler<PlayerAttackCommand> {
  private readonly logger = new Logger(PlayerAttackHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly combatService: CombatService,
    private readonly eventBus: EventBus,
    private readonly mutexService: MutexService
  ) {}

  async execute(command: PlayerAttackCommand): Promise<any> {
    // Use mutex to prevent concurrent attacks from the same player
    const lockKey = `player-attack-${command.playerId}`;

    return this.mutexService.withLock(lockKey, async () => {
      const game = await this.gameRepository.findCurrent();
      if (!game) {
        throw new Error('No active game found');
      }

      const gameVersion = game.getVersion();
      const hero = game.getHero(new UnitId(command.playerId));
      if (!hero) {
        throw new Error('Hero not found');
      }

      try {
        const target = game.getRandomAliveVillain();
        const targetHealthBefore = target.getHealth().getValue();

        // Execute attack with atomic cooldown check
        const attackResult = this.combatService.executeAttack(hero, target);

        // Check version before modifying game state
        game.checkVersion(gameVersion);
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

        if (error.message.includes('Optimistic lock failure')) {
          throw new Error('Attack failed due to concurrent modification. Please try again.');
        }

        // No alive villains - game over
        try {
          game.checkVersion(gameVersion);
          game.finish();
          this.logger.log(`🏁 GAME OVER: No more villains alive!`);
          this.eventBus.publish(new GameFinishedEvent(game));
          await this.gameRepository.save(game);
        } catch (versionError) {
          // Game state was modified by another operation, just throw the original error
        }
        throw error;
      }
    });
  }
}
