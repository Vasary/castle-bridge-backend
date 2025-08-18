import { faker } from '@faker-js/faker';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Unit } from '../entities/unit';
import { Avatar } from '../value-objects/avatar';
import { Power } from '../value-objects/power';
import { UnitId } from '../value-objects/unit-id';
import { UnitName } from '../value-objects/unit-name';
import { AttackSpeed } from '../value-objects/attack-speed';

@Injectable()
export class UnitFactoryService {
  createHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom(),
      AttackSpeed.createRandom(800, 2000) // Heroes: 0.8-2.0 seconds
    );
  }

  createVillain(name?: string): Unit {
    return Unit.createVillain(
      new UnitId(uuidv4()),
      new UnitName(name || this.generateRandomVillainName()),
      Avatar.createRandom(),
      Power.createRandom(),
      AttackSpeed.createRandom(1200, 3000)
    );
  }

  // Create specialized unit types
  createFastHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom(3, 8), // Lower power for balance
      AttackSpeed.createFast()
    );
  }

  createTankHero(id: string, name: string): Unit {
    return Unit.createHero(
      new UnitId(id),
      new UnitName(name),
      Avatar.createRandom(),
      Power.createRandom(8, 15), // Higher power
      AttackSpeed.createSlow()
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
      'Antharas', 'Valakas', 'Baium', 'Zaken', 'Orfen',
      'Core', 'Queen Ant', 'Beleth', 'Frintezza', 'Sailren',
      'Lindvior', 'Tiat', 'Ekimus', 'Tauti', 'Octavis',
      'Istina', 'Balok', 'Trasken', 'Baylor', 'Helios',
      'Kelbim', 'Spezion', 'Embryo', 'Ramona', 'Anakim'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }
}
