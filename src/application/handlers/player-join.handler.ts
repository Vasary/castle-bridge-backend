import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PlayerJoinCommand } from '../commands/player-join.command';
import { GameRepository } from '../../domain/repositories/game.repository';
import { UnitFactoryService } from '../../domain/services/unit-factory.service';
import { Unit } from '../../domain/entities/unit';

@Injectable()
@CommandHandler(PlayerJoinCommand)
export class PlayerJoinHandler implements ICommandHandler<PlayerJoinCommand> {
  private readonly logger = new Logger(PlayerJoinHandler.name);

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

    // Log player join with game state
    const totalHeroes = game.getHeroes().length;
    const totalVillains = game.getVillains().length;
    const aliveVillains = game.getAliveVillains().length;

    this.logger.log(`🦸 PLAYER JOINED: ${command.playerName} (ID: ${command.playerId}) | Power: ${hero.getPower().getValue()} | Heroes: ${totalHeroes} | Villains: ${aliveVillains}/${totalVillains}`);

    return hero;
  }
}
