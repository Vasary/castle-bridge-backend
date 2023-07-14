import { Injectable } from "@nestjs/common";

@Injectable()
export class Unit {
  public id: string;
  public title: string;
  public health: number;
  public power: number;
  public avatar: string;
  constructor(
    id: string,
    nickname: string,
    avatar: string,
    power: number
  ) {
    this.health = 100;
    this.power =  power;
    this.title = nickname;
    this.id = id;
    this.avatar = avatar;
  }

  public applyDamage(attackValue: number) {
    const healthValue = this.health - attackValue;

    if (healthValue < 0) {
      this.health = 0;
    }else{
      this.health = healthValue;
    }
  }
}