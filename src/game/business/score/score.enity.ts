export class Score {
  public triggerId: string;
  public targetId: string;
  public triggerHit: number;
  public targetHealth: number;

  constructor(
    triggerId: string,
    targetId: string,
    triggerHit: number,
    targetHealth: number,
  ) {
    this.triggerId = triggerId;
    this.targetId = targetId;
    this.targetHealth = targetHealth;
    this.triggerHit = triggerHit
  }
}