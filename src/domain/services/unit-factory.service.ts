import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Unit } from '../entities/unit';
import { Avatar } from '../value-objects/avatar';
import { Power } from '../value-objects/power';
import { UnitId } from '../value-objects/unit-id';
import { UnitName } from '../value-objects/unit-name';

@Injectable()
export class UnitFactoryService {
  createHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom()
    );
  }

  createVillain(name?: string): Unit {
    return Unit.createVillain(
      new UnitId(uuidv4()),
      new UnitName(name || faker.person.firstName()),
      Avatar.createRandom(),
      Power.createRandom()
    );
  }

  createVillains(count?: number): Unit[] {
    const villainCount = count || Math.floor(Math.random() * 3) + 2;
    const villains: Unit[] = [];

    for (let i = 0; i < villainCount; i++) {
      villains.push(this.createVillain());
    }

    return villains;
  }

  private generateRandomVillainName(): string {
    const names = [
      'Dark Lord', 'Shadow Warrior', 'Evil Sorcerer', 'Black Knight',
      'Demon King', 'Wicked Witch', 'Fallen Angel', 'Death Bringer',
      'Soul Reaper', 'Chaos Master', 'Void Walker', 'Nightmare'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }
}
