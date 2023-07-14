import { v4 as uuidv4 } from "uuid";
import { Injectable } from "@nestjs/common";
import { Unit } from "./unit.enity";
import { faker } from '@faker-js/faker';

@Injectable()
export class UnitFactory {
  private maxPower = 12;
  private minPower = 5

  createVillain() {
    return new Unit(uuidv4(), faker.person.firstName(), this.getRandomAvatar(), this.getRandomPowerValue())
  }

  private getRandomPowerValue() {
    return Math.floor(Math.random() * (this.maxPower - this.minPower + 1)) + 5;
  }

  private getRandomAvatar() {
    return `${Math.floor(Math.random() * 6) + 1}.png`;
  }

  createHero(id: string, nickname: string) {
    return new Unit(id, nickname, this.getRandomAvatar(), this.getRandomPowerValue());
  }
}
