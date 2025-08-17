import { Injectable } from '@nestjs/common';
import { GameRepository } from '../../domain/repositories/game.repository';
import { Game } from '../../domain/aggregates/game';
import { UnitFactoryService } from '../../domain/services/unit-factory.service';

@Injectable()
export class InMemoryGameRepository implements GameRepository {
  private currentGame: Game | null = null;

  constructor(private readonly unitFactory: UnitFactoryService) {
    // Initialize with a default game
    this.initializeDefaultGame();
  }

  async save(game: Game): Promise<void> {
    this.currentGame = game;
  }

  async findById(id: string): Promise<Game | null> {
    // For simplicity, we only have one game
    return this.currentGame;
  }

  async findCurrent(): Promise<Game | null> {
    return this.currentGame;
  }

  private initializeDefaultGame(): void {
    const villains = this.unitFactory.createVillains();
    this.currentGame = new Game(villains);
  }
}
