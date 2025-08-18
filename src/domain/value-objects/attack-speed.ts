export class AttackSpeed {
  private static readonly MIN_SPEED = 500;  // 0.5 seconds minimum
  private static readonly MAX_SPEED = 5000; // 5 seconds maximum

  constructor(private readonly cooldownMs: number) {
    if (cooldownMs < AttackSpeed.MIN_SPEED || cooldownMs > AttackSpeed.MAX_SPEED) {
      throw new Error(`Attack speed must be between ${AttackSpeed.MIN_SPEED}ms and ${AttackSpeed.MAX_SPEED}ms`);
    }
  }

  getCooldownMs(): number {
    return this.cooldownMs;
  }

  getCooldownSeconds(): number {
    return this.cooldownMs / 1000;
  }

  equals(other: AttackSpeed): boolean {
    return this.cooldownMs === other.cooldownMs;
  }

  static createFast(): AttackSpeed {
    return new AttackSpeed(800); // 0.8 seconds
  }

  static createMedium(): AttackSpeed {
    return new AttackSpeed(1500); // 1.5 seconds
  }

  static createSlow(): AttackSpeed {
    return new AttackSpeed(2500); // 2.5 seconds
  }

  static createRandom(min: number = 1000, max: number = 3000): AttackSpeed {
    const cooldown = Math.floor(Math.random() * (max - min + 1)) + min;
    return new AttackSpeed(cooldown);
  }
}
