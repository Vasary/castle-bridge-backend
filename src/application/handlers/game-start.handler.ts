import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameRepository } from '../../domain/repositories/game.repository';
import { GameStartCommand } from '../commands/game-start.command';
import { AiPort } from '../ports/ai.port';

@Injectable()
@CommandHandler(GameStartCommand)
export class GameStartHandler implements ICommandHandler<GameStartCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('AiPort') private readonly aiPort: AiPort
  ) {}

  async execute(command: GameStartCommand): Promise<any> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }

    game.start();
    await this.gameRepository.save(game);

    // Start AI when game starts
    this.aiPort.startAi();

    return game.toPlainObject();
  }
}
