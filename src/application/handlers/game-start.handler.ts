import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameRepository } from '../../domain/repositories/game.repository';
import { GameStartCommand } from '../commands/game-start.command';
import { AiPort } from '../ports/ai.port';

@Injectable()
@CommandHandler(GameStartCommand)
export class GameStartHandler implements ICommandHandler<GameStartCommand> {
  private readonly logger = new Logger(GameStartHandler.name);

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

    // Log game start with current state
    const heroCount = game.getHeroes().length;
    const villainCount = game.getVillains().length;
    this.logger.log(`🎮 GAME STARTED: ${heroCount} heroes vs ${villainCount} villains | Battle begins!`);

    return game.toPlainObject();
  }
}
