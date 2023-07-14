import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameState } from "../state/game.state";
import { GameStartCommand } from "../../../websocket/business /command/game-start";
import { GameRestartCommand } from "../../../websocket/business /command/game-restart";
import { GameStateFactory } from "../state/game.state.factory";

@CommandHandler(GameRestartCommand)
export class GameRestartCommandHandler implements ICommandHandler<GameRestartCommand> {
  constructor(
    private game: GameState
  ) {
  }

  execute(): Promise<GameState> {
    this.game.restartGame();

    return Promise.resolve(this.game);
  }
}