import { AttackData } from "../contracts/attack-data";

export class AttackResultDto {
  gameState: any;
  attackData: AttackData & {
    nextAttackAvailable?: string; // ISO timestamp when next attack is available
  };
}
