import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GameStateQuery } from '../queries/game-state.query';
import { GameRepository } from '../../domain/repositories/game.repository';

@Injectable()
@QueryHandler(GameStateQuery)
export class GameStateHandler implements IQueryHandler<GameStateQuery> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository
  ) {}

  async execute(query: GameStateQuery): Promise<any> {
    const game = await this.gameRepository.findCurrent();
    if (!game) {
      throw new Error('No active game found');
    }
    
    return game.toPlainObject();
  }
}
