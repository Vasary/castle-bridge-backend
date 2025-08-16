import { DomainEvent } from './domain-event';
import { Unit } from '../entities/unit';

export class UnitAttackedEvent extends DomainEvent {
  constructor(
    public readonly attacker: Unit,
    public readonly target: Unit,
    public readonly damage: number
  ) {
    super();
  }

  getEventName(): string {
    return 'UnitAttacked';
  }
}
