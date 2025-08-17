import { DomainEvent } from './domain-event';
import { Game } from '../aggregates/game';

export class GameFinishedEvent extends DomainEvent {
  constructor(public readonly game: Game) {
    super();
  }

  getEventName(): string {
    return 'GameFinished';
  }
}
