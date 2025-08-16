import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GameRestartCommand } from '../commands/game-restart.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { UnitFactoryService } from '../../domain/services/unit-factory.service';

@Injectable()
@CommandHandler(GameRestartCommand)
export class GameRestartHandler implements ICommandHandler<GameRestartCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    private readonly unitFactory: UnitFactoryService
  ) {}

  async execute(command: GameRestartCommand): Promise<any> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }

    const newVillains = this.unitFactory.createVillains();
    game.restart(newVillains);
    
    await this.gameRepository.save(game);
    
    return game.toPlainObject();
  }
}
