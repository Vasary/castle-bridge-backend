
import { Scores } from "../../game/business/score/scores";
import { Unit } from "../../unit/entity/unit.enity";

export interface GameStateInterface {
  heroes: Unit[];
  villains: Unit[];
  scores: Scores
}