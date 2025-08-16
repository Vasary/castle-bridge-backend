import { Module } from '@nestjs/common';
import { UnitFactoryService } from './services/unit-factory.service';
import { CombatService } from './services/combat.service';

@Module({
  providers: [
    UnitFactoryService,
    CombatService
  ],
  exports: [
    UnitFactoryService,
    CombatService
  ]
})
export class DomainModule {}
