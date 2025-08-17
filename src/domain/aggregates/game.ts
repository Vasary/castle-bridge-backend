import { Unit, UnitType } from '../entities/unit';
import { Score } from '../entities/score';
import { UnitId } from '../value-objects/unit-id';

export enum GameStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished'
}

export class Game {
  private heroes: Map<string, Unit> = new Map();
  private villains: Map<string, Unit> = new Map();
  private scores: Score[] = [];
  private status: GameStatus = GameStatus.NOT_STARTED;

  constructor(villains: Unit[] = []) {
    villains.forEach(villain => {
      this.villains.set(villain.getId().getValue(), villain);
    });
  }

  getStatus(): GameStatus {
    return this.status;
  }

  isStarted(): boolean {
    return this.status !== GameStatus.NOT_STARTED;
  }

  isFinished(): boolean {
    return this.status === GameStatus.FINISHED;
  }

  start(): void {
    if (this.status !== GameStatus.NOT_STARTED) {
      throw new Error('Game has already been started');
    }
    this.status = GameStatus.IN_PROGRESS;
  }

  finish(): void {
    this.status = GameStatus.FINISHED;
  }

  restart(newVillains: Unit[]): void {
    this.heroes.clear();
    this.villains.clear();
    this.scores = [];
    this.status = GameStatus.NOT_STARTED;
    
    newVillains.forEach(villain => {
      this.villains.set(villain.getId().getValue(), villain);
    });
  }

  addHero(hero: Unit): void {
    if (hero.getType() !== UnitType.HERO) {
      throw new Error('Only heroes can be added as heroes');
    }
    this.heroes.set(hero.getId().getValue(), hero);
  }

  removeHero(heroId: UnitId): void {
    this.heroes.delete(heroId.getValue());
  }

  getHero(heroId: UnitId): Unit | undefined {
    return this.heroes.get(heroId.getValue());
  }

  getHeroes(): Unit[] {
    return Array.from(this.heroes.values());
  }

  getVillains(): Unit[] {
    return Array.from(this.villains.values());
  }

  getAliveHeroes(): Unit[] {
    return this.getHeroes().filter(hero => hero.isAlive());
  }

  getAliveVillains(): Unit[] {
    return this.getVillains().filter(villain => villain.isAlive());
  }

  getRandomAliveHero(): Unit {
    const aliveHeroes = this.getAliveHeroes();
    if (aliveHeroes.length === 0) {
      throw new Error('No alive heroes available');
    }
    return aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
  }

  getRandomAliveVillain(): Unit {
    const aliveVillains = this.getAliveVillains();
    if (aliveVillains.length === 0) {
      throw new Error('No alive villains available');
    }
    return aliveVillains[Math.floor(Math.random() * aliveVillains.length)];
  }

  addScore(score: Score): void {
    this.scores.push(score);
  }

  getScores(): Score[] {
    return [...this.scores];
  }

  shouldGameEnd(): boolean {
    return this.getAliveHeroes().length === 0 || this.getAliveVillains().length === 0;
  }

  // For compatibility with existing code
  toPlainObject() {
    return {
      heroes: this.getHeroes().map(hero => hero.toPlainObject()),
      villains: this.getVillains().map(villain => villain.toPlainObject()),
      scores: {
        scores: this.scores.map(score => score.toPlainObject())
      },
      isStarted: this.isStarted(),
      isOver: this.isFinished()
    };
  }
}
