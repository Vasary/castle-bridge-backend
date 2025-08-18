import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PlayerAttackCommand } from '../commands/player-attack.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService } from '../../domain/services/combat.service';
import { UnitId } from '../../domain/value-objects/unit-id';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';
import { MutexService } from '../../shared/services/mutex.service';
import { GAME_CONSTANTS } from '../../shared/constants/game.constants';
import { IAttackResult, AttackExecutionResult } from '../../shared/interfaces/attack.interface';

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

  async execute(command: PlayerAttackCommand): Promise<AttackExecutionResult> {
    // Use mutex to prevent concurrent attacks from the same player
    const lockKey = `${GAME_CONSTANTS.MUTEX_KEYS.PLAYER_ATTACK_PREFIX}${command.playerId}`;

    return this.mutexService.withLock(lockKey, async () => {
      const game = await this.gameRepository.findCurrent();
      if (!game) {
        return { error: GAME_CONSTANTS.ERRORS.NO_ACTIVE_GAME };
      }

      const gameVersion = game.getVersion();
      const hero = game.getHero(new UnitId(command.playerId));
      if (!hero) {
        return { error: GAME_CONSTANTS.ERRORS.HERO_NOT_FOUND };
      }

      try {
        const target = game.getRandomAliveVillain();
        const attackResult = await this.executeAttackSequence(hero, target, game, gameVersion);

        await this.gameRepository.save(game);

        return this.buildAttackResponse(game, attackResult, hero);
      } catch (error) {
        return this.handleAttackError(error, game, gameVersion);
      }
    });
  }

  private async executeAttackSequence(hero: any, target: any, game: any, gameVersion: number): Promise<IAttackResult> {
    const targetHealthBefore = target.getHealth().getValue();

    // Execute attack with atomic cooldown check
    const attackResult = this.combatService.executeAttack(hero, target);

    // Check version before modifying game state
    game.checkVersion(gameVersion);
    game.addScore(attackResult.score);

    this.logAttackResult(hero, target, attackResult, targetHealthBefore);
    this.publishAttackEvent(attackResult);
    this.checkAndHandleGameEnd(game);

    return attackResult;
  }

  private logAttackResult(hero: any, target: any, attackResult: IAttackResult, targetHealthBefore: number): void {
    const targetHealthAfter = target.getHealth().getValue();
    const isKilled = targetHealthAfter === 0;
    const killStatus = isKilled ? '💀 KILLED' : `❤️ ${targetHealthAfter}HP`;
    const nextAttackIn = hero.getTimeUntilNextAttack();

    this.logger.log(
      `${GAME_CONSTANTS.LOGS.HERO_ATTACK}: ${hero.getName().getValue()} ➤ ${target.getName().getValue()} | ` +
      `Damage: ${attackResult.damage} | ${targetHealthBefore}HP ➤ ${killStatus} | ` +
      `Next attack in: ${Math.ceil(nextAttackIn / GAME_CONSTANTS.ATTACK_COOLDOWN_CHECK_PRECISION_MS)}s`
    );
  }

  private publishAttackEvent(attackResult: IAttackResult): void {
    this.eventBus.publish(new UnitAttackedEvent(
      attackResult.attacker,
      attackResult.target,
      attackResult.damage
    ));
  }

  private checkAndHandleGameEnd(game: any): void {
    if (game.shouldGameEnd()) {
      game.finish();
      const aliveHeroes = game.getAliveHeroes().length;
      const aliveVillains = game.getAliveVillains().length;

      this.logger.log(
        `${GAME_CONSTANTS.LOGS.GAME_OVER}: Heroes: ${aliveHeroes} | ` +
        `Villains: ${aliveVillains} | Total Scores: ${game.getScores().length}`
      );

      this.eventBus.publish(new GameFinishedEvent(game));
    }
  }

  private buildAttackResponse(game: any, attackResult: IAttackResult, hero: any): AttackExecutionResult {
    return {
      gameState: game.toPlainObject(),
      attackData: {
        target: attackResult.target.toPlainObject(),
        trigger: attackResult.attacker.toPlainObject(),
        attackPower: attackResult.damage,
        nextAttackAvailable: new Date(Date.now() + hero.getTimeUntilNextAttack()).toISOString()
      }
    };
  }

  private async handleAttackError(error: any, game: any, gameVersion: number): Promise<AttackExecutionResult> {
    if (error.message.includes('must wait')) {
      return { error: error.message }; // Return cooldown errors to client
    }

    if (error.message.includes(GAME_CONSTANTS.ERRORS.OPTIMISTIC_LOCK_FAILURE_PREFIX)) {
      return { error: GAME_CONSTANTS.ERRORS.ATTACK_CONCURRENT_MODIFICATION };
    }

    // Handle game over scenario
    await this.handleGameOverError(game, gameVersion);
    return { error: error.message };
  }

  private async handleGameOverError(game: any, gameVersion: number): Promise<void> {
    try {
      game.checkVersion(gameVersion);
      game.finish();
      this.logger.log(`${GAME_CONSTANTS.LOGS.GAME_OVER}: No more villains alive!`);
      this.eventBus.publish(new GameFinishedEvent(game));
      await this.gameRepository.save(game);
    } catch (versionError) {
      // Game state was modified by another operation, ignore version error
    }
  }
}
