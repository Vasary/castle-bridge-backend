export class Power {
  private static readonly MIN_POWER = 1;
  private static readonly MAX_POWER = 20;

  constructor(private readonly value: number) {
    if (value < Power.MIN_POWER || value > Power.MAX_POWER) {
      throw new Error(`Power must be between ${Power.MIN_POWER} and ${Power.MAX_POWER}`);
    }
  }

  getValue(): number {
    return this.value;
  }

  calculateAttackDamage(): number {
    // Random damage between 0 and 2 * power
    return Math.floor(this.value * (Math.random() * 2));
  }

  equals(other: Power): boolean {
    return this.value === other.value;
  }

  static createRandom(min: number = 5, max: number = 12): Power {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Power(value);
  }
}
