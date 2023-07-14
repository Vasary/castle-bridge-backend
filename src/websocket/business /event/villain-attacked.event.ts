import { AttackResultDto } from "../../../shared/dto/attack.result.dto";

export class VillainAttackedEvent {
  constructor(public readonly attackResult: AttackResultDto) {
  }
}