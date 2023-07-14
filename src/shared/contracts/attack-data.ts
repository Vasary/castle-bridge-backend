import { Unit } from "../../unit/entity/unit.enity";

export interface AttackData {
  trigger: Unit,
  target: Unit,
  attackPower: number,
}