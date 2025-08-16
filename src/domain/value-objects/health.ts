export class Health {
  private static readonly MAX_HEALTH = 100;
  private static readonly MIN_HEALTH = 0;

  constructor(private readonly value: number) {
    if (value < Health.MIN_HEALTH || value > Health.MAX_HEALTH) {
      throw new Error(`Health must be between ${Health.MIN_HEALTH} and ${Health.MAX_HEALTH}`);
    }
  }

  getValue(): number {
    return this.value;
  }

  isAlive(): boolean {
    return this.value > 0;
  }

  isDead(): boolean {
    return this.value === 0;
  }

  takeDamage(damage: number): Health {
    const newValue = Math.max(Health.MIN_HEALTH, this.value - damage);
    return new Health(newValue);
  }

  equals(other: Health): boolean {
    return this.value === other.value;
  }

  static createFull(): Health {
    return new Health(Health.MAX_HEALTH);
  }

  static createDead(): Health {
    return new Health(Health.MIN_HEALTH);
  }
}
