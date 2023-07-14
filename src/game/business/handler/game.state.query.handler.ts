import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GameState } from "../state/game.state";
import { GameStateQuery } from "../../../websocket/business /query/game-state.query";

@QueryHandler(GameStateQuery)
export class GameStateQueryHandler implements IQueryHandler<GameStateQuery> {
  constructor(
    private readonly game: GameState
  ) {}

  execute(): Promise<GameState> {
    return Promise.resolve(this.game);
  }
}