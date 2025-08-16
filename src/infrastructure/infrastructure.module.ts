import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApplicationModule } from '../application/application.module';

// Infrastructure adapters
import { GameGateway } from './websocket/game.gateway';
import { WebSocketAdapter } from './websocket/websocket.adapter';

// Event handlers
import { GameFinishedEventHandler, UnitAttackedEventHandler } from './websocket/event-handlers';

@Module({
  imports: [
    CqrsModule,
    ApplicationModule
  ],
  providers: [
    // Adapters
    WebSocketAdapter,

    // Gateway
    GameGateway,

    // Event handlers
    UnitAttackedEventHandler,
    GameFinishedEventHandler
  ],
  exports: [
    GameGateway,
    WebSocketAdapter
  ]
})
export class InfrastructureModule {}
