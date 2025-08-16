import { UnitId } from '../value-objects/unit-id';
import { UnitName } from '../value-objects/unit-name';
import { Health } from '../value-objects/health';
import { Power } from '../value-objects/power';
import { Avatar } from '../value-objects/avatar';

export enum UnitType {
  HERO = 'hero',
  VILLAIN = 'villain'
}

export class Unit {
  constructor(
    private readonly id: UnitId,
    private readonly name: UnitName,
    private readonly avatar: Avatar,
    private readonly power: Power,
    private health: Health,
    private readonly type: UnitType
  ) {}

  getId(): UnitId {
    return this.id;
  }

  getName(): UnitName {
    return this.name;
  }

  getAvatar(): Avatar {
    return this.avatar;
  }

  getPower(): Power {
    return this.power;
  }

  getHealth(): Health {
    return this.health;
  }

  getType(): UnitType {
    return this.type;
  }

  isAlive(): boolean {
    return this.health.isAlive();
  }

  isDead(): boolean {
    return this.health.isDead();
  }

  takeDamage(damage: number): void {
    this.health = this.health.takeDamage(damage);
  }

  attack(): number {
    return this.power.calculateAttackDamage();
  }

  equals(other: Unit): boolean {
    return this.id.equals(other.id);
  }

  // Factory methods
  static createHero(id: UnitId, name: UnitName, avatar: Avatar, power: Power): Unit {
    return new Unit(id, name, avatar, power, Health.createFull(), UnitType.HERO);
  }

  static createVillain(id: UnitId, name: UnitName, avatar: Avatar, power: Power): Unit {
    return new Unit(id, name, avatar, power, Health.createFull(), UnitType.VILLAIN);
  }

  // For serialization/compatibility with existing code
  toPlainObject() {
    return {
      id: this.id.getValue(),
      title: this.name.getValue(),
      avatar: this.avatar.getValue(),
      power: this.power.getValue(),
      health: this.health.getValue(),
      type: this.type
    };
  }
}
