import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Unit } from '../entities/unit';
import { Avatar } from '../value-objects/avatar';
import { Power } from '../value-objects/power';
import { UnitId } from '../value-objects/unit-id';
import { UnitName } from '../value-objects/unit-name';
import { AttackSpeed } from '../value-objects/attack-speed';
import { GAME_CONSTANTS } from '../../shared/constants/game.constants';

@Injectable()
export class UnitFactoryService {
  createHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom(),
      AttackSpeed.createRandom(
        GAME_CONSTANTS.UNIT_FACTORY.HERO_ATTACK_SPEED_MIN,
        GAME_CONSTANTS.UNIT_FACTORY.HERO_ATTACK_SPEED_MAX
      )
    );
  }

  createVillain(name?: string): Unit {
    return Unit.createVillain(
      new UnitId(uuidv4()),
      new UnitName(name || this.generateRandomVillainName()),
      Avatar.createRandom(),
      Power.createRandom(),
      AttackSpeed.createRandom(
        GAME_CONSTANTS.UNIT_FACTORY.VILLAIN_ATTACK_SPEED_MIN,
        GAME_CONSTANTS.UNIT_FACTORY.VILLAIN_ATTACK_SPEED_MAX
      )
    );
  }

  // Create specialized unit types
  createFastHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom(
        GAME_CONSTANTS.UNIT_FACTORY.FAST_HERO_POWER_MIN,
        GAME_CONSTANTS.UNIT_FACTORY.FAST_HERO_POWER_MAX
      ),
      AttackSpeed.createFast()
    );
  }

  createTankHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom(
        GAME_CONSTANTS.UNIT_FACTORY.TANK_HERO_POWER_MIN,
        GAME_CONSTANTS.UNIT_FACTORY.TANK_HERO_POWER_MAX
      ),
      AttackSpeed.createSlow()
    );
  }

  createVillains(count?: number): Unit[] {
    const villainCount = count || this.getRandomVillainCount();
    const villains: Unit[] = [];

    for (let i = 0; i < villainCount; i++) {
      villains.push(this.createVillain());
    }

    return villains;
  }

  private generateRandomVillainName(): string {
    const names = GAME_CONSTANTS.UNIT_FACTORY.VILLAIN_NAMES;
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomVillainCount(): number {
    const min = GAME_CONSTANTS.UNIT_FACTORY.DEFAULT_VILLAIN_COUNT_MIN;
    const max = GAME_CONSTANTS.UNIT_FACTORY.DEFAULT_VILLAIN_COUNT_MAX;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
