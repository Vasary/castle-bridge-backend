import { Unit } from "../../../unit/entity/unit.enity";

export const getHit = (unit: Unit) => {
  return Math.floor(unit.power * (Math.random() * 2))
}