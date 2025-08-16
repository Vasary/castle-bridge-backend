import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { DomainModule } from '../domain/domain.module';

// Command Handlers
import { GameOverHandler } from './handlers/game-over.handler';
import { GameRestartHandler } from './handlers/game-restart.handler';
import { GameStartHandler } from './handlers/game-start.handler';
import { PlayerAttackHandler } from './handlers/player-attack.handler';
import { PlayerJoinHandler } from './handlers/player-join.handler';
import { PlayerLeaveHandler } from './handlers/player-leave.handler';

// Query Handlers
import { GameStateHandler } from './handlers/game-state.handler';

// Infrastructure imports
import { AiAdapter } from '../infrastructure/ai/ai.adapter';
import { InMemoryGameRepository } from '../infrastructure/persistence/in-memory-game.repository';

const commandHandlers = [
  PlayerJoinHandler,
  PlayerAttackHandler,
  PlayerLeaveHandler,
  GameStartHandler,
  GameRestartHandler,
  GameOverHandler
];

const queryHandlers = [
  GameStateHandler
];

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    DomainModule
  ],
  providers: [
    // Repository implementations
    {
      provide: 'GameRepository',
      useClass: InMemoryGameRepository
    },

    // Port implementations
    {
      provide: 'AiPort',
      useClass: AiAdapter
    },

    // Adapters
    AiAdapter,

    ...commandHandlers,
    ...queryHandlers
  ],
  exports: [
    'GameRepository',
    'AiPort',
    AiAdapter,
    ...commandHandlers,
    ...queryHandlers
  ]
})
export class ApplicationModule {}
