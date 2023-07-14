import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GameState } from "./business/state/game.state";
import { GameStateFactory } from "./business/state/game.state.factory";
import { GameAi } from "./business/ai/game.ai";
import { GameOverCommandHandler } from "./business/handler/game.over.command.handler";
import { GameStartCommandHandler } from "./business/handler/game.start.command.handler";
import { PlayerAttackCommandHandler } from "./business/handler/player.attack.command.handler";
import { PlayerJoinCommandHandler } from "./business/handler/player.join.command.handler";
import { PlayerLeaveCommandHandler } from "./business/handler/player.leave.command.handler";
import { GameStateQueryHandler } from "./business/handler/game.state.query.handler";
import { UnitModule } from "../unit/unit.module";
import { GameRestartCommandHandler } from "./business/handler/game.restart.command.handler";

const commandHandlers = [
  GameOverCommandHandler,
  GameStartCommandHandler,
  PlayerAttackCommandHandler,
  PlayerJoinCommandHandler,
  PlayerLeaveCommandHandler,
  GameRestartCommandHandler
]

const queryHandlers = [
  GameStateQueryHandler
]

@Module({
  imports: [CqrsModule, UnitModule],
  providers: [
    {
      provide: GameState,
      useFactory: (factory: GameStateFactory) => factory.createGameStateWithVillains(),
      inject: [GameStateFactory],
    },
    GameStateFactory,
    GameAi,
    ...commandHandlers,
    ...queryHandlers
  ],
  exports: [
    GameState,
    GameAi,
    ...commandHandlers,
    ...queryHandlers
  ]
})
export class GameModule {}