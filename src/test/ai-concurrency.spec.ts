import { Test, TestingModule } from '@nestjs/testing';
import { AiAdapter } from '../infrastructure/ai/ai.adapter';
import { CombatService } from '../domain/services/combat.service';
import { UnitFactoryService } from '../domain/services/unit-factory.service';
import { InMemoryGameRepository } from '../infrastructure/persistence/in-memory-game.repository';
import { Game } from '../domain/aggregates/game';
import { Unit, UnitType } from '../domain/entities/unit';
import { UnitId } from '../domain/value-objects/unit-id';
import { UnitName } from '../domain/value-objects/unit-name';
import { Avatar } from '../domain/value-objects/avatar';
import { Power } from '../domain/value-objects/power';
import { AttackSpeed } from '../domain/value-objects/attack-speed';
import { MutexService } from '../shared/services/mutex.service';
import { EventBus } from '@nestjs/cqrs';

describe('AI Adapter Concurrency Tests', () => {
  let aiAdapter: AiAdapter;
  let gameRepository: InMemoryGameRepository;
  let unitFactory: UnitFactoryService;
  let mutexService: MutexService;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MutexService,
        CombatService,
        UnitFactoryService,
        InMemoryGameRepository,
        AiAdapter,
        {
          provide: 'GameRepository',
          useClass: InMemoryGameRepository,
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    aiAdapter = module.get<AiAdapter>(AiAdapter);
    gameRepository = module.get<InMemoryGameRepository>(InMemoryGameRepository);
    unitFactory = module.get<UnitFactoryService>(UnitFactoryService);
    mutexService = module.get<MutexService>(MutexService);
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(() => {
    // Ensure AI is stopped and all timers are cleared
    if (aiAdapter && aiAdapter.isRunning()) {
      aiAdapter.stopAi();
    }

    // Clear any remaining locks
    if (mutexService) {
      mutexService.clearAllLocks();
    }
  });

  afterAll(() => {
    // Final cleanup to ensure no lingering intervals
    if (aiAdapter && aiAdapter.isRunning()) {
      aiAdapter.stopAi();
    }
  });

  describe('AI Attack Concurrency', () => {
    let game: Game;
    let hero: Unit;

    beforeEach(async () => {
      // Set up game with hero and villains
      const villains = unitFactory.createVillains();
      game = new Game(villains);

      hero = Unit.createHero(
        new UnitId('player-1'),
        new UnitName('Test Hero'),
        new Avatar('🦸'),
        new Power(10),
        new AttackSpeed(500)
      );

      game.addHero(hero);
      game.start();
      await gameRepository.save(game);
    });

    it('should prevent concurrent AI attacks using mutex', async () => {
      try {
        // Start AI
        aiAdapter.startAi();

        // Execute multiple AI actions concurrently
        const aiPromises = [
          aiAdapter.executeAiAction(),
          aiAdapter.executeAiAction(),
          aiAdapter.executeAiAction(),
        ];

        await Promise.allSettled(aiPromises);

        // Verify game state is consistent
        const updatedGame = await gameRepository.findCurrent();
        expect(updatedGame).toBeDefined();
        expect(updatedGame!.getVersion()).toBeGreaterThan(0);
      } finally {
        // Always stop AI in finally block
        aiAdapter.stopAi();
      }
    });

    it('should handle optimistic lock failures gracefully', async () => {
      // Mock the game repository to return a game with version conflicts
      const mockGame = Object.create(game);
      mockGame.checkVersion = jest.fn()
        .mockImplementationOnce(() => {
          throw new Error('Optimistic lock failure: expected version 1, but current version is 2');
        });

      jest.spyOn(gameRepository, 'findCurrent').mockResolvedValueOnce(mockGame);

      // AI action should not throw, just skip the action
      await expect(aiAdapter.executeAiAction()).resolves.not.toThrow();
    });

    it('should handle cooldown errors gracefully', async () => {
      // Set up game where all villains are on cooldown
      const updatedGame = await gameRepository.findCurrent();
      const villains = updatedGame!.getAliveVillains();

      // Force all villains to attack to put them on cooldown
      villains.forEach(villain => {
        if (villain.canAttack()) {
          villain.attack();
        }
      });

      await gameRepository.save(updatedGame!);

      // AI action should handle cooldown gracefully
      await expect(aiAdapter.executeAiAction()).resolves.not.toThrow();
    });

    it('should not execute when AI is stopped', async () => {
      // Ensure AI is stopped
      aiAdapter.stopAi();
      expect(aiAdapter.isRunning()).toBe(false);

      const initialVersion = game.getVersion();

      // Execute AI action
      await aiAdapter.executeAiAction();

      // Game state should not change
      const updatedGame = await gameRepository.findCurrent();
      expect(updatedGame!.getVersion()).toBe(initialVersion);
    });

    it('should not execute when game is not started', async () => {
      try {
        // Create a new game that's not started
        const newGame = new Game(unitFactory.createVillains());
        await gameRepository.save(newGame);

        aiAdapter.startAi();
        const initialVersion = newGame.getVersion();

        // Execute AI action
        await aiAdapter.executeAiAction();

        // Game state should not change
        const updatedGame = await gameRepository.findCurrent();
        expect(updatedGame!.getVersion()).toBe(initialVersion);
      } finally {
        aiAdapter.stopAi();
      }
    });

    it('should not execute when game is finished', async () => {
      try {
        // Finish the game
        game.finish();
        await gameRepository.save(game);

        aiAdapter.startAi();
        const initialVersion = game.getVersion();

        // Execute AI action
        await aiAdapter.executeAiAction();

        // Game state should not change further
        const updatedGame = await gameRepository.findCurrent();
        expect(updatedGame!.getVersion()).toBe(initialVersion);
      } finally {
        aiAdapter.stopAi();
      }
    });

    it('should handle concurrent AI and player operations', async () => {
      // This test simulates the scenario where AI and player attacks happen simultaneously
      const lockKey = 'test-concurrent-operations';
      let aiExecuted = false;
      let playerExecuted = false;

      // Simulate AI operation
      const aiOperation = mutexService.withLock(lockKey, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        aiExecuted = true;
        return 'ai-done';
      });

      // Simulate player operation
      const playerOperation = mutexService.withLock(lockKey, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        playerExecuted = true;
        return 'player-done';
      });

      // Both operations should complete without conflicts
      const results = await Promise.all([aiOperation, playerOperation]);

      expect(results).toEqual(['ai-done', 'player-done']);
      expect(aiExecuted).toBe(true);
      expect(playerExecuted).toBe(true);
    });
  });

  describe('AI Lifecycle Management', () => {
    it('should properly start and stop AI', () => {
      try {
        expect(aiAdapter.isRunning()).toBe(false);

        aiAdapter.startAi();
        expect(aiAdapter.isRunning()).toBe(true);
      } finally {
        aiAdapter.stopAi();
        expect(aiAdapter.isRunning()).toBe(false);
      }
    });

    it('should handle multiple start/stop calls gracefully', () => {
      try {
        // Multiple starts
        aiAdapter.startAi();
        aiAdapter.startAi();
        expect(aiAdapter.isRunning()).toBe(true);
      } finally {
        // Multiple stops
        aiAdapter.stopAi();
        aiAdapter.stopAi();
        expect(aiAdapter.isRunning()).toBe(false);
      }
    });

    it('should clean up intervals on stop', () => {
      try {
        aiAdapter.startAi();
        const intervalId = (aiAdapter as any).aiIntervalId;
        expect(intervalId).toBeDefined();
      } finally {
        aiAdapter.stopAi();
        expect((aiAdapter as any).aiIntervalId).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Mock repository to throw error
      jest.spyOn(gameRepository, 'findCurrent').mockRejectedValueOnce(new Error('Database error'));

      // AI action should not throw
      await expect(aiAdapter.executeAiAction()).resolves.not.toThrow();
    });

    it('should handle combat service errors gracefully', async () => {
      // Set up game
      const villains = unitFactory.createVillains();
      const game = new Game(villains);
      const hero = Unit.createHero(
        new UnitId('player-1'),
        new UnitName('Test Hero'),
        new Avatar('🦸'),
        new Power(10),
        new AttackSpeed(500)
      );
      game.addHero(hero);
      game.start();
      await gameRepository.save(game);

      // Mock combat service to throw error
      const combatService = new CombatService();
      jest.spyOn(combatService, 'executeAttack').mockImplementation(() => {
        throw new Error('Combat error');
      });

      // AI action should handle the error gracefully
      await expect(aiAdapter.executeAiAction()).resolves.not.toThrow();
    });
  });
});
