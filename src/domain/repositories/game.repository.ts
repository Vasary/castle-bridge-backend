import { Game } from '../aggregates/game';

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(id: string): Promise<Game | null>;
  findCurrent(): Promise<Game | null>;
}
