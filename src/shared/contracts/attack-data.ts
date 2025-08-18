export interface AttackData {
  trigger: {
    id: string;
    title: string;
    avatar: string;
    power: number;
    attackSpeed: number;
    health: number;
    type: string;
    canAttack: boolean;
    timeUntilNextAttack: number;
  };
  target: {
    id: string;
    title: string;
    avatar: string;
    power: number;
    attackSpeed: number;
    health: number;
    type: string;
    canAttack: boolean;
    timeUntilNextAttack: number;
  };
  attackPower: number;
  nextAttackAvailable?: string; // ISO timestamp when attacker can attack again
}
