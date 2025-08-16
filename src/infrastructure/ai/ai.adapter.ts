import { Injectable, Inject, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventBus } from '@nestjs/cqrs';
import { AiPort } from '../../application/ports/ai.port';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService } from '../../domain/services/combat.service';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';

@Injectable()
export class AiAdapter implements AiPort {
  private readonly logger = new Logger(AiAdapter.name);
  private isAiRunning = false;

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly combatService: CombatService,
    private readonly eventBus: EventBus
  ) {}

  startAi(): void {
    this.isAiRunning = true;
    this.logger.log(`🤖 AI STARTED: Villains will now attack heroes automatically every 1 second`);
  }

  stopAi(): void {
    this.isAiRunning = false;
    this.logger.log(`🤖 AI STOPPED: Villains will no longer attack automatically`);
  }

  isRunning(): boolean {
    return this.isAiRunning;
  }

  @Interval(1000)
  async executeAiAction(): Promise<void> {
    if (!this.isAiRunning) {
      return;
    }

    try {
      const game = await this.gameRepository.findCurrent();
      if (!game || !game.isStarted() || game.isFinished()) {
        return;
      }

      const hero = game.getRandomAliveHero();
      const villain = game.getRandomAliveVillain();
      const heroHealthBefore = hero.getHealth().getValue();

      const attackResult = this.combatService.executeAttack(villain, hero);
      game.addScore(attackResult.score);

      // Log the AI attack with detailed information
      const heroHealthAfter = hero.getHealth().getValue();
      const isKilled = heroHealthAfter === 0;
      const killStatus = isKilled ? '💀 KILLED' : `❤️ ${heroHealthAfter}HP`;

      this.logger.log(`🤖 AI ATTACK: ${villain.getName().getValue()} ➤ ${hero.getName().getValue()} | Damage: ${attackResult.damage} | ${heroHealthBefore}HP ➤ ${killStatus}`);

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
    } catch (error) {
      // Handle case where no heroes or villains are alive
      const game = await this.gameRepository.findCurrent();
      if (game) {
        game.finish();
        this.eventBus.publish(new GameFinishedEvent(game));
        await this.gameRepository.save(game);
      }
    }
  }
}
