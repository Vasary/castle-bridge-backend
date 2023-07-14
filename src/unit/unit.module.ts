import { Module } from '@nestjs/common';
import { UnitFactory } from "./entity/unit.entity.factory";
@Module({
  providers: [UnitFactory],
  exports: [UnitFactory]
})
export class UnitModule {}