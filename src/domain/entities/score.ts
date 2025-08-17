export class Score {
  constructor(
    private readonly triggerId: string,
    private readonly targetId: string,
    private readonly damage: number,
    private readonly targetHealthAfterAttack: number,
    private readonly timestamp: Date = new Date()
  ) {
    if (damage < 0) {
      throw new Error('Damage cannot be negative');
    }
    if (targetHealthAfterAttack < 0) {
      throw new Error('Target health after attack cannot be negative');
    }
  }

  getTriggerId(): string {
    return this.triggerId;
  }

  getTargetId(): string {
    return this.targetId;
  }

  getDamage(): number {
    return this.damage;
  }

  getTargetHealthAfterAttack(): number {
    return this.targetHealthAfterAttack;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  wasTargetKilled(): boolean {
    return this.targetHealthAfterAttack === 0;
  }

  // For compatibility with existing code
  toPlainObject() {
    return {
      triggerId: this.triggerId,
      targetId: this.targetId,
      triggerHit: this.damage,
      targetHealth: this.targetHealthAfterAttack
    };
  }
}
