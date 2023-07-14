import { Score } from "./score.enity";


export class Scores{
  public scores: Score[];

  constructor() {
    this.scores = [];
  }

  addScore(score: Score){
    this.scores.push(score);
  }
}