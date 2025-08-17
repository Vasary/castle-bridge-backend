import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PlayerJoinCommand } from '../application/commands/player-join.command';
import { GameStateQuery } from '../application/queries/game-state.query';
import { GameStartCommand } from '../application/commands/game-start.command';
import { PlayerAttackCommand } from '../application/commands/player-attack.command';

describe('Game Integration Tests', () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    commandBus = app.get<CommandBus>(CommandBus);
    queryBus = app.get<QueryBus>(QueryBus);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow a player to join the game', async () => {
    const player = await commandBus.execute(
      new PlayerJoinCommand('test-player-1', 'TestHero')
    );

    expect(player).toBeDefined();
    expect(player.getName().getValue()).toBe('TestHero');
    expect(player.getId().getValue()).toBe('test-player-1');
  });

  it('should start the game and allow attacks', async () => {
    // Join a player
    await commandBus.execute(
      new PlayerJoinCommand('test-player-1', 'TestHero')
    );

    // Start the game
    const gameState = await commandBus.execute(new GameStartCommand());
    expect(gameState.isStarted).toBe(true);

    // Perform an attack
    const attackResult = await commandBus.execute(
      new PlayerAttackCommand('test-player-1')
    );

    expect(attackResult).toBeDefined();
    expect(attackResult.gameState).toBeDefined();
    expect(attackResult.attackData).toBeDefined();
  });

  it('should maintain game state correctly', async () => {
    // Join a player
    await commandBus.execute(
      new PlayerJoinCommand('test-player-1', 'TestHero')
    );

    // Get initial game state
    let gameState = await queryBus.execute(new GameStateQuery());
    expect(gameState.heroes).toHaveLength(1);
    expect(gameState.villains.length).toBeGreaterThan(0);

    // Start the game
    await commandBus.execute(new GameStartCommand());
    gameState = await queryBus.execute(new GameStateQuery());
    expect(gameState.isStarted).toBe(true);
  });
});
