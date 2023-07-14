import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameState } from "../state/game.state";
import { GameOverCommand } from "../../../websocket/business /command/game-over";

@CommandHandler(GameOverCommand)
export class GameOverCommandHandler implements ICommandHandler<GameOverCommand> {
  constructor(
    private readonly game: GameState
  ) {
  }

  execute(): Promise<GameState> {
    this.game.endGame()

    return Promise.resolve(this.game);
  }
}