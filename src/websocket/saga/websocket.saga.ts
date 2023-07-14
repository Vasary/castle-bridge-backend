import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebSocketGameGateway } from "../presentation/websocket.game.gateway";
import { ofType, Saga } from "@nestjs/cqrs";
import { VillainAttackedEvent } from "../business /event/villain-attacked.event";
import { GameOverEvent } from "../business /event/game-over.event";

@Injectable()
export class WebSocketSaga {
  constructor(private readonly gateway: WebSocketGameGateway) {}

  @Saga()
  enemyAttacked = (events$: Observable<any>): Observable<void> => {
    return events$.pipe(
      ofType(VillainAttackedEvent),
      map((event) => {
        this.gateway.villainAttack(event.attackResult);
      })
    );
  }

  @Saga()
  gameOver = (events$: Observable<any>): Observable<void> => {
    return events$.pipe(
      ofType(GameOverEvent),
      map((event) => {
        this.gateway.gameOver();
      })
    );
  }
}
