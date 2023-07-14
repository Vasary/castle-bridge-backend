import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Unit } from "../../../unit/entity/unit.enity";
import { UnitFactory } from "../../../unit/entity/unit.entity.factory";
import { GameState } from "../state/game.state";
import { PlayerJoinCommand } from "../../../websocket/business /command/player-join";

@CommandHandler(PlayerJoinCommand)
export class PlayerJoinCommandHandler implements ICommandHandler<PlayerJoinCommand> {
    constructor(
        private readonly game: GameState,
        private readonly unitFactory: UnitFactory
    ) {
    }

    execute(command: PlayerJoinCommand): Promise<Unit> {
        const hero = this.unitFactory.createHero(command.id, command.nickname);
        this.game.addHero(hero);

        return Promise.resolve(hero);
    }
}
