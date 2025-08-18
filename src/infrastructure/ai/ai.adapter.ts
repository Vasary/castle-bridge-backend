import { Injectable, Inject, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventBus } from '@nestjs/cqrs';
import { AiPort } from '../../application/ports/ai.port';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService } from '../../domain/services/combat.service';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';
import { MutexService } from '../../shared/services/mutex.service';

@Injectable()
export class AiAdapter implements AiPort {
  private readonly logger = new Logger(AiAdapter.name);
  private isAiRunning = false;
  private aiIntervalId: NodeJS.Timeout | null = null;

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly combatService: CombatService,
    private readonly eventBus: EventBus,
    private readonly mutexService: MutexService
  ) {}

  startAi(): void {
    // If already running, don't create another interval
    if (this.isAiRunning && this.aiIntervalId) {
      return;
    }

    // Stop any existing interval before starting a new one
    this.stopAi();

    this.isAiRunning = true;
    this.logger.log(`🤖 AI STARTED: Villains will attack when their cooldowns allow`);

    this.aiIntervalId = setInterval(() => this.executeAiAction(), 200);
  }

  stopAi(): void {
    this.isAiRunning = false;
    if (this.aiIntervalId) {
      clearInterval(this.aiIntervalId);
      this.aiIntervalId = null;
    }
    this.logger.log(`🤖 AI STOPPED: Villains will no longer attack automatically`);
  }

  isRunning(): boolean {
    return this.isAiRunning;
  }

  async executeAiAction(): Promise<void> {
    if (!this.isAiRunning) {
      return;
    }

    // Use mutex to prevent concurrent AI attacks and conflicts with player attacks
    return this.mutexService.withLock('ai-attack', async () => {
      try {
        const game = await this.gameRepository.findCurrent();
        if (!game || !game.isStarted() || game.isFinished()) {
          return;
        }

        const gameVersion = game.getVersion();
        const aliveVillains = game.getAliveVillains();
        const aliveHeroes = game.getAliveHeroes();

        if (aliveVillains.length === 0 || aliveHeroes.length === 0) {
          return;
        }

        const readyVillains = aliveVillains.filter(villain => villain.canAttack());

        if (readyVillains.length === 0) {
          return;
        }

        const villain = readyVillains[Math.floor(Math.random() * readyVillains.length)];
        const hero = game.getRandomAliveHero();
        const heroHealthBefore = hero.getHealth().getValue();

        // Execute attack with atomic cooldown check
        const attackResult = this.combatService.executeAttack(villain, hero);

        // Check version before modifying game state
        game.checkVersion(gameVersion);
        game.addScore(attackResult.score);

        const heroHealthAfter = hero.getHealth().getValue();
        const isKilled = heroHealthAfter === 0;
        const killStatus = isKilled ? '💀 KILLED' : `❤️ ${heroHealthAfter}HP`;
        const nextAttackIn = villain.getTimeUntilNextAttack();

        this.logger.log(`🤖 AI ATTACK: ${villain.getName().getValue()} ➤ ${hero.getName().getValue()} | Damage: ${attackResult.damage} | ${heroHealthBefore}HP ➤ ${killStatus} | Next attack in: ${Math.ceil(nextAttackIn / 1000)}s`);

        // Publish attack event
        this.eventBus.publish(new UnitAttackedEvent(
          attackResult.attacker,
          attackResult.target,
          attackResult.damage
        ));

        // Check if game should end
        if (game.shouldGameEnd()) {
          game.finish();
          const aliveHeroesCount = game.getAliveHeroes().length;
          const aliveVillainsCount = game.getAliveVillains().length;
          this.logger.log(`🏁 GAME OVER: Heroes: ${aliveHeroesCount} | Villains: ${aliveVillainsCount} | Total Scores: ${game.getScores().length}`);
          this.eventBus.publish(new GameFinishedEvent(game));
        }

        await this.gameRepository.save(game);
      } catch (error) {
        if (error.message.includes('must wait')) {
          return; // Cooldown error, just skip this AI action
        }

        if (error.message.includes('Optimistic lock failure')) {
          this.logger.debug('AI attack skipped due to concurrent modification');
          return; // Version conflict, skip this AI action
        }

        // Handle other errors by ending the game
        try {
          const game = await this.gameRepository.findCurrent();
          if (game) {
            const gameVersion = game.getVersion();
            game.checkVersion(gameVersion);
            game.finish();
            this.eventBus.publish(new GameFinishedEvent(game));
            await this.gameRepository.save(game);
          }
        } catch (versionError) {
          // Game state was modified by another operation, just log the error
          this.logger.error(`AI error handling failed due to concurrent modification: ${error.message}`);
        }
      }
    });
  }
}
