import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { PlayerAttackCommand } from '../commands/player-attack.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { CombatService, AttackResult } from '../../domain/services/combat.service';
import { UnitId } from '../../domain/value-objects/unit-id';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';

@Injectable()
@CommandHandler(PlayerAttackCommand)
export class PlayerAttackHandler implements ICommandHandler<PlayerAttackCommand> {
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
      const attackResult = this.combatService.executeAttack(hero, target);
      
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
      this.eventBus.publish(new GameFinishedEvent(game));
      await this.gameRepository.save(game);
      throw error;
    }
  }
}
