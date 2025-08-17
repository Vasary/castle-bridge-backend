import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GameOverCommand } from '../commands/game-over.command';
import { GameRepository } from '../../domain/repositories/game.repository';

@Injectable()
@CommandHandler(GameOverCommand)
export class GameOverHandler implements ICommandHandler<GameOverCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository
  ) {}

  async execute(command: GameOverCommand): Promise<any> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }

    game.finish();
    await this.gameRepository.save(game);
    
    return game.toPlainObject();
  }
}
