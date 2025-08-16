export class PlayerJoinCommand {
  constructor(
    public readonly playerId: string,
    public readonly playerName: string
  ) {}
}
