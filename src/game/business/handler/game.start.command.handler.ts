import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameState } from "../state/game.state";
import { GameStartCommand } from "../../../websocket/business /command/game-start";

@CommandHandler(GameStartCommand)
export class GameStartCommandHandler implements ICommandHandler<GameStartCommand> {
  constructor(
    private readonly game: GameState
  ) {
  }

  execute(): Promise<GameState> {
    this.game.startGame()

    return Promise.resolve(this.game);
  }
}