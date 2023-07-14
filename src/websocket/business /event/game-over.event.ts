import { GameState } from "../../../game/business/state/game.state";

export class GameOverEvent {
  constructor(public readonly gameState: GameState) {
  }
}