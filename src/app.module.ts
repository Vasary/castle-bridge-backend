import { Module } from '@nestjs/common';
import { WebSocketModule } from "./websocket/websocket.module";
import { ScheduleModule } from '@nestjs/schedule';
import { GameModule } from "./game/game.module";

@Module({
  imports: [WebSocketModule, GameModule, ScheduleModule.forRoot(),],
  controllers: [],
  providers: [],
})
export class AppModule {}
