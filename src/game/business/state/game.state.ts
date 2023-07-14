import { Scores } from "../score/scores";
import { Injectable } from "@nestjs/common";
import { Unit } from "../../../unit/entity/unit.enity";
import { Score } from "../score/score.enity";
import { createVillains } from "../helper/create-villain";

@Injectable()
export class GameState {
  public heroes: Unit[];
  public villains: Unit[];
  public isOver: boolean;
  public scores: Scores;
  public isStarted: boolean;

  constructor() {
    this.villains = [];
    this.heroes = [];
    this.isOver = false;
    this.isStarted = false;
    this.scores = new Scores();
  }

  addVillain(villain: Unit) {
    this.villains.push(villain);
  }

  addHero(hero: Unit) {
    this.heroes.push(hero);
  }

  deleteHero(heroId: string) {
    this.heroes = this.heroes.filter((hero) => hero.id !== heroId);
  }

  getHero(heroId: string): Unit {
    return this.heroes.find((hero) => hero.id === heroId);
  }

  getEnemy(): Unit {
    const aliveVillains = this.getAliveEnemies();

    if (aliveVillains.length === 0) {
      throw Error('All enemies are dead');
    }

    return aliveVillains[Math.floor(Math.random() * aliveVillains.length)];
  }

  getAliveHero(): Unit {
    const alive = this.heroes.filter(e => e.health > 0);

    if (alive.length === 0) {
      throw Error('All heroes are dead');
    }

    return alive[Math.floor(Math.random() * alive.length)];
  }

  private getAliveEnemies(): Unit[] {
    return this.villains.filter(e => e.health > 0);
  }

  addScore(score: Score){
    this.scores.addScore(score);
  }

  endGame() {
    this.isOver = true;
  }

  startGame() {
    this.isStarted = true;
  }

  restartGame(){
    this.isOver = false;
    this.isStarted = false;
    this.heroes = [];
    this.scores = new Scores();
    this.villains = createVillains();
  }
}
