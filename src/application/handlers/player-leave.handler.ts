import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { PlayerLeaveCommand } from '../commands/player-leave.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { UnitId } from '../../domain/value-objects/unit-id';

@Injectable()
@CommandHandler(PlayerLeaveCommand)
export class PlayerLeaveHandler implements ICommandHandler<PlayerLeaveCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository
  ) {}

  async execute(command: PlayerLeaveCommand): Promise<void> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }

    game.removeHero(new UnitId(command.playerId));
    await this.gameRepository.save(game);
  }
}
