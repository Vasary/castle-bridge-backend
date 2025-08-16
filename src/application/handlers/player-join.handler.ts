import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { PlayerJoinCommand } from '../commands/player-join.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { UnitFactoryService } from '../../domain/services/unit-factory.service';
import { Unit } from '../../domain/entities/unit';

@Injectable()
@CommandHandler(PlayerJoinCommand)
export class PlayerJoinHandler implements ICommandHandler<PlayerJoinCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly unitFactory: UnitFactoryService
  ) {}

  async execute(command: PlayerJoinCommand): Promise<Unit> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }

    const hero = this.unitFactory.createHero(command.playerId, command.playerName);
    game.addHero(hero);
    
    await this.gameRepository.save(game);
    
    return hero;
  }
}
