import { Injectable } from '@nestjs/common';
import { GameState } from './game.state';
import { createVillains } from "../helper/create-villain";

@Injectable()
export class GameStateFactory {
  createGameStateWithVillains() {
    const game = new GameState();

    game.villains = createVillains();

    return game;
  }
}