import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UnitAttackedEvent } from '../../domain/events/unit-attacked.event';
import { GameFinishedEvent } from '../../domain/events/game-finished.event';
import { GameGateway } from './game.gateway';

@Injectable()
@EventsHandler(UnitAttackedEvent)
export class UnitAttackedEventHandler implements IEventHandler<UnitAttackedEvent> {
  constructor(private readonly gateway: GameGateway) {}

  handle(event: UnitAttackedEvent): void {
    const attackData = {
      target: event.target.toPlainObject(),
      trigger: event.attacker.toPlainObject(),
      attackPower: event.damage
    };

    this.gateway.emitAttack(attackData);
  }
}

@Injectable()
@EventsHandler(GameFinishedEvent)
export class GameFinishedEventHandler implements IEventHandler<GameFinishedEvent> {
  constructor(private readonly gateway: GameGateway) {}

  handle(event: GameFinishedEvent): void {
    this.gateway.emitGameOver();
  }
}
