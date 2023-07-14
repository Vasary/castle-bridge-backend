import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GameState } from "../state/game.state";
import { PlayerLeaveCommand } from "../../../websocket/business /command/player-leave";

@CommandHandler(PlayerLeaveCommand)
export class PlayerLeaveCommandHandler implements ICommandHandler<PlayerLeaveCommand> {
  constructor(private readonly game: GameState) {}
  execute(command: PlayerLeaveCommand): Promise<void> {
    this.game.deleteHero(command.heroId);

    return Promise.resolve()
  }
}
