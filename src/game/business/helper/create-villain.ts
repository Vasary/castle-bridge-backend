import { UnitFactory } from "../../../unit/entity/unit.entity.factory";
import { Unit } from "../../../unit/entity/unit.enity";
export const createVillains = () => {
  const unitFactory = new UnitFactory()

  const villains: Unit[] = []

  const iterations = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < iterations; i++) {
    villains.push(unitFactory.createVillain());
  }

  return villains;
}