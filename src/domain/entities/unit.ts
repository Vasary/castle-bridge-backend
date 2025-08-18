import { UnitId } from '../value-objects/unit-id';
import { UnitName } from '../value-objects/unit-name';
import { Health } from '../value-objects/health';
import { Power } from '../value-objects/power';
import { Avatar } from '../value-objects/avatar';
import { AttackSpeed } from '../value-objects/attack-speed';
import { GAME_CONSTANTS } from '../../shared/constants/game.constants';

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
    private readonly attackSpeed: AttackSpeed,
    private health: Health,
    private readonly type: UnitType,
    private lastAttackTime: Date = new Date(0)
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

  getAttackSpeed(): AttackSpeed {
    return this.attackSpeed;
  }

  getHealth(): Health {
    return this.health;
  }

  getType(): UnitType {
    return this.type;
  }

  getLastAttackTime(): Date {
    return this.lastAttackTime;
  }

  canAttack(): boolean {
    const now = new Date();
    const timeSinceLastAttack = now.getTime() - this.lastAttackTime.getTime();
    return timeSinceLastAttack >= this.attackSpeed.getCooldownMs();
  }

  getTimeUntilNextAttack(): number {
    const now = new Date();
    const timeSinceLastAttack = now.getTime() - this.lastAttackTime.getTime();
    const cooldownRemaining = this.attackSpeed.getCooldownMs() - timeSinceLastAttack;
    return Math.max(0, cooldownRemaining);
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
    const now = new Date();
    const timeSinceLastAttack = now.getTime() - this.lastAttackTime.getTime();

    // Atomic check and update - no race condition window
    if (timeSinceLastAttack < this.attackSpeed.getCooldownMs()) {
      const cooldownRemaining = this.attackSpeed.getCooldownMs() - timeSinceLastAttack;
      const cooldownSeconds = Math.ceil(cooldownRemaining / GAME_CONSTANTS.ATTACK_COOLDOWN_CHECK_PRECISION_MS);
      throw new Error(`Unit must wait ${cooldownSeconds} seconds before next attack`);
    }

    // Atomically update the last attack time
    this.lastAttackTime = now;
    return this.power.calculateAttackDamage();
  }

  equals(other: Unit): boolean {
    return this.id.equals(other.id);
  }

  // Factory methods
  static createHero(id: UnitId, name: UnitName, avatar: Avatar, power: Power, attackSpeed: AttackSpeed): Unit {
    return new Unit(id, name, avatar, power, attackSpeed, Health.createFull(), UnitType.HERO);
  }

  static createVillain(id: UnitId, name: UnitName, avatar: Avatar, power: Power, attackSpeed: AttackSpeed): Unit {
    return new Unit(id, name, avatar, power, attackSpeed, Health.createFull(), UnitType.VILLAIN);
  }

  // For serialization/compatibility with existing code
  toPlainObject() {
    return {
      id: this.id.getValue(),
      title: this.name.getValue(),
      avatar: this.avatar.getValue(),
      power: this.power.getValue(),
      attackSpeed: this.attackSpeed.getCooldownMs(),
      health: this.health.getValue(),
      type: this.type,
      canAttack: this.canAttack(),
      timeUntilNextAttack: this.getTimeUntilNextAttack()
    };
  }
}
