import { GameState } from "../../game/business/state/game.state";
import { AttackData } from "../contracts/attack-data";

export class AttackResultDto {
  gameState: GameState;
  attackData: AttackData;
}