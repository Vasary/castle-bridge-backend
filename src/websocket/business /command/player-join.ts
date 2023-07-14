export class PlayerJoinCommand {
  constructor(
    public readonly id: string,
    public readonly nickname: string
  ) {}
}
