import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WebSocketGameGateway } from "./presentation/websocket.game.gateway";
import { WebSocketSaga } from "./saga/websocket.saga";

@Module({
  imports: [CqrsModule],
  providers: [
    WebSocketGameGateway,
    WebSocketSaga
  ],
  exports: [WebSocketGameGateway]
})
export class WebSocketModule {}