import { Injectable, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventBus } from '@nestjs/cqrs';
import { AiPort } from '../../application/ports/ai.port';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService } from '../../domain/services/combat.service';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';

@Injectable()
export class AiAdapter implements AiPort {
  private isAiRunning = false;

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly combatService: CombatService,
    private readonly eventBus: EventBus
  ) {}

  startAi(): void {
    this.isAiRunning = true;
  }

  stopAi(): void {
    this.isAiRunning = false;
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

      const attackResult = this.combatService.executeAttack(villain, hero);
      game.addScore(attackResult.score);

      // Publish attack event
      this.eventBus.publish(new UnitAttackedEvent(
        attackResult.attacker,
        attackResult.target,
        attackResult.damage
      ));

      // Check if game should end
      if (game.shouldGameEnd()) {
        game.finish();
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
