 import { Test, TestingModule } from '@nestjs/testing';
import { PlayerAttackHandler } from '../application/handlers/player-attack.handler';
import { PlayerAttackCommand } from '../application/commands/player-attack.command';
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

describe('Race Condition Scenarios', () => {
  let playerAttackHandler: PlayerAttackHandler;
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
        PlayerAttackHandler,
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

    playerAttackHandler = module.get<PlayerAttackHandler>(PlayerAttackHandler);
    gameRepository = module.get<InMemoryGameRepository>(InMemoryGameRepository);
    unitFactory = module.get<UnitFactoryService>(UnitFactoryService);
    mutexService = module.get<MutexService>(MutexService);
    eventBus = module.get<EventBus>(EventBus);
  });

  afterEach(() => {
    // Clear any remaining locks
    mutexService.clearAllLocks();
  });

  describe('Multiple Players Attacking Simultaneously', () => {
    let game: Game;
    let hero1: Unit;
    let hero2: Unit;
    let hero3: Unit;

    beforeEach(async () => {
      // Set up game with multiple heroes and villains
      const villains = unitFactory.createVillains();
      game = new Game(villains);

      hero1 = Unit.createHero(
        new UnitId('player-1'),
        new UnitName('Hero 1'),
        new Avatar('🦸'),
        new Power(10),
        new AttackSpeed(500) // Short cooldown for testing
      );

      hero2 = Unit.createHero(
        new UnitId('player-2'),
        new UnitName('Hero 2'),
        new Avatar('🦹'),
        new Power(15),
        new AttackSpeed(600)
      );

      hero3 = Unit.createHero(
        new UnitId('player-3'),
        new UnitName('Hero 3'),
        new Avatar('🧙'),
        new Power(12),
        new AttackSpeed(550)
      );

      game.addHero(hero1);
      game.addHero(hero2);
      game.addHero(hero3);
      game.start();
      await gameRepository.save(game);
    });

    it('should handle concurrent attacks from different players', async () => {
      const commands = [
        new PlayerAttackCommand('player-1'),
        new PlayerAttackCommand('player-2'),
        new PlayerAttackCommand('player-3'),
      ];

      // Execute all attacks simultaneously
      const results = await Promise.allSettled(
        commands.map(cmd => playerAttackHandler.execute(cmd))
      );

      // All attacks should succeed (different players, different locks)
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBe(3);
      expect(failed.length).toBe(0);

      // Verify game state was updated correctly
      const updatedGame = await gameRepository.findCurrent();
      expect(updatedGame!.getScores().length).toBe(3);
    });

    it('should prevent same player from attacking multiple times concurrently', async () => {
      const commands = [
        new PlayerAttackCommand('player-1'),
        new PlayerAttackCommand('player-1'),
        new PlayerAttackCommand('player-1'),
      ];

      // Execute all attacks simultaneously
      const results = await Promise.allSettled(
        commands.map(cmd => playerAttackHandler.execute(cmd))
      );

      // Only one should succeed due to mutex lock
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);

      // Failed attacks should be due to cooldown
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toContain('must wait');
        }
      });
    });

    it('should handle mixed concurrent attacks (same and different players)', async () => {
      const commands = [
        new PlayerAttackCommand('player-1'),
        new PlayerAttackCommand('player-1'), // Duplicate
        new PlayerAttackCommand('player-2'),
        new PlayerAttackCommand('player-3'),
        new PlayerAttackCommand('player-2'), // Duplicate
      ];

      const results = await Promise.allSettled(
        commands.map(cmd => playerAttackHandler.execute(cmd))
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Should have 3 successful (one per unique player) and 2 failed (duplicates)
      expect(successful.length).toBe(3);
      expect(failed.length).toBe(2);
    });
  });

  describe('Game State Consistency Under Load', () => {
    let game: Game;

    beforeEach(async () => {
      const villains = unitFactory.createVillains();
      game = new Game(villains);

      // Add multiple heroes
      for (let i = 1; i <= 10; i++) {
        const hero = Unit.createHero(
          new UnitId(`player-${i}`),
          new UnitName(`Hero ${i}`),
          new Avatar('🦸'),
          new Power(10),
          new AttackSpeed(500) // Short cooldown
        );
        game.addHero(hero);
      }

      game.start();
      await gameRepository.save(game);
    });

    it('should maintain game state consistency under high concurrent load', async () => {
      const attackPromises = [];

      // Create 50 attack attempts from 10 different players
      for (let round = 0; round < 5; round++) {
        for (let player = 1; player <= 10; player++) {
          attackPromises.push(
            playerAttackHandler.execute(new PlayerAttackCommand(`player-${player}`))
              .catch(error => ({ error: error.message }))
          );
        }
        // Small delay between rounds to allow some attacks to succeed
        await new Promise(resolve => setTimeout(resolve, 60));
      }

      const results = await Promise.allSettled(attackPromises);

      // Verify final game state is consistent
      const finalGame = await gameRepository.findCurrent();
      const scores = finalGame!.getScores();
      const aliveVillains = finalGame!.getAliveVillains();

      // Should have some scores (successful attacks)
      expect(scores.length).toBeGreaterThan(0);

      // Game state should be consistent
      expect(finalGame!.getVersion()).toBeGreaterThan(0);

      // If all villains are dead, game should be finished
      if (aliveVillains.length === 0) {
        expect(finalGame!.isFinished()).toBe(true);
      }
    });

    it('should handle version conflicts gracefully', async () => {
      // Mock game repository to simulate version conflicts
      const originalSave = gameRepository.save.bind(gameRepository);
      let saveCallCount = 0;

      jest.spyOn(gameRepository, 'save').mockImplementation(async (gameToSave) => {
        saveCallCount++;
        // Simulate version conflict on every 3rd save
        if (saveCallCount % 3 === 0) {
          // Modify game version to simulate concurrent modification
          (gameToSave as any).version += 1;
        }
        return originalSave(gameToSave);
      });

      const attackPromises = [];
      for (let i = 1; i <= 5; i++) {
        attackPromises.push(
          playerAttackHandler.execute(new PlayerAttackCommand(`player-${i}`))
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.allSettled(attackPromises);

      // Some attacks should succeed, some might fail due to version conflicts
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Cleanup Under Concurrent Access', () => {
    it('should handle mutex cleanup when operations throw errors', async () => {
      // Mock combat service to throw errors randomly
      const combatService = new CombatService();
      const originalExecuteAttack = combatService.executeAttack.bind(combatService);

      jest.spyOn(combatService, 'executeAttack').mockImplementation((attacker, target) => {
        if (Math.random() < 0.5) {
          throw new Error('Random combat error');
        }
        return originalExecuteAttack(attacker, target);
      });

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

      // Execute multiple attacks that might fail
      const attackPromises = [];
      for (let i = 0; i < 10; i++) {
        attackPromises.push(
          playerAttackHandler.execute(new PlayerAttackCommand('player-1'))
            .catch(error => ({ error: error.message }))
        );
        await new Promise(resolve => setTimeout(resolve, 60)); // Allow cooldown
      }

      await Promise.allSettled(attackPromises);

      // Mutex should not be permanently locked
      expect(mutexService.isLocked('player-attack-player-1')).toBe(false);
    });

    it('should handle rapid lock acquisition and release', async () => {
      const lockKey = 'test-rapid-lock';
      const results: number[] = [];

      const rapidOperations = [];
      for (let i = 0; i < 20; i++) {
        rapidOperations.push(
          mutexService.withLock(lockKey, async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            results.push(i);
            return i;
          })
        );
      }

      await Promise.all(rapidOperations);

      // All operations should complete
      expect(results).toHaveLength(20);

      // Lock should be released
      expect(mutexService.isLocked(lockKey)).toBe(false);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle attacks when no villains are alive', async () => {
      // Create game with no villains
      const game = new Game([]);
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

      const command = new PlayerAttackCommand('player-1');

      await expect(playerAttackHandler.execute(command))
        .rejects.toThrow('No alive villains available');

      // Game should be finished
      const updatedGame = await gameRepository.findCurrent();
      expect(updatedGame!.isFinished()).toBe(true);
    });

    it('should handle attacks from non-existent players', async () => {
      const villains = unitFactory.createVillains();
      const game = new Game(villains);
      game.start();
      await gameRepository.save(game);

      const command = new PlayerAttackCommand('non-existent-player');

      await expect(playerAttackHandler.execute(command))
        .rejects.toThrow('Hero not found');
    });

    it('should handle repository failures gracefully', async () => {
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

      // Mock repository to fail on save
      jest.spyOn(gameRepository, 'save').mockRejectedValueOnce(new Error('Database error'));

      const command = new PlayerAttackCommand('player-1');

      await expect(playerAttackHandler.execute(command))
        .rejects.toThrow('Database error');
    });
  });
});
