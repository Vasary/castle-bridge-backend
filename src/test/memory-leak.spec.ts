import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from '../infrastructure/websocket/game.gateway';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Socket } from 'socket.io';

describe('Memory Leak Prevention Tests', () => {
  let gateway: GameGateway;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn().mockResolvedValue({ toPlainObject: () => ({}) }),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              isStarted: true,
              isOver: false,
              scores: [],
            }),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);

    // Mock socket
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    // Mock server
    (gateway as any).server = {
      engine: { clientsCount: 1 },
      emit: jest.fn(),
      sockets: {
        sockets: new Map([['test-socket-id', mockSocket]]),
      },
    };
  });

  describe('Client Connection Management', () => {
    it('should reject connections when max limit is reached', async () => {
      // Set clientToHeroId to max capacity
      const clientToHeroId = (gateway as any).clientToHeroId;
      const maxConnections = (gateway as any).MAX_CLIENT_CONNECTIONS;

      // Fill up to max capacity
      for (let i = 0; i < maxConnections; i++) {
        clientToHeroId.set(`client-${i}`, `hero-${i}`);
      }

      // Try to add one more connection
      const newSocket = {
        id: 'overflow-socket',
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(newSocket as unknown as Socket);

      // Should disconnect the new socket
      expect(newSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should clean up client mappings on disconnect', async () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add a client mapping
      clientToHeroId.set('test-socket-id', 'hero-1');
      expect(clientToHeroId.has('test-socket-id')).toBe(true);

      // Simulate disconnect
      await gateway.handleDisconnect(mockSocket as Socket);

      // Mapping should be cleaned up
      expect(clientToHeroId.has('test-socket-id')).toBe(false);
    });

    it('should clean up mappings even when player leave command fails', async () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add a client mapping
      clientToHeroId.set('test-socket-id', 'hero-1');

      // Mock command bus to throw error
      jest.spyOn(commandBus, 'execute').mockRejectedValueOnce(new Error('Command failed'));

      // Simulate disconnect
      await gateway.handleDisconnect(mockSocket as Socket);

      // Mapping should still be cleaned up despite the error
      expect(clientToHeroId.has('test-socket-id')).toBe(false);
    });
  });

  describe('Stale Connection Cleanup', () => {
    it('should identify and clean up stale connections', () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add some client mappings
      clientToHeroId.set('active-client', 'hero-1');
      clientToHeroId.set('stale-client-1', 'hero-2');
      clientToHeroId.set('stale-client-2', 'hero-3');

      // Mock server with only one active socket
      (gateway as any).server.sockets.sockets = new Map([
        ['active-client', mockSocket],
      ]);

      // Run cleanup
      (gateway as any).cleanupStaleConnections();

      // Only active client should remain
      expect(clientToHeroId.has('active-client')).toBe(true);
      expect(clientToHeroId.has('stale-client-1')).toBe(false);
      expect(clientToHeroId.has('stale-client-2')).toBe(false);
      expect(clientToHeroId.size).toBe(1);
    });

    it('should handle cleanup when no stale connections exist', () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add active client mapping
      clientToHeroId.set('active-client', 'hero-1');

      // Mock server with matching active socket
      (gateway as any).server.sockets.sockets = new Map([
        ['active-client', mockSocket],
      ]);

      const initialSize = clientToHeroId.size;

      // Run cleanup
      (gateway as any).cleanupStaleConnections();

      // Size should remain the same
      expect(clientToHeroId.size).toBe(initialSize);
      expect(clientToHeroId.has('active-client')).toBe(true);
    });
  });

  describe('Module Lifecycle', () => {
    it('should clean up resources on module destroy', () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add some mappings
      clientToHeroId.set('client-1', 'hero-1');
      clientToHeroId.set('client-2', 'hero-2');

      // Set up cleanup interval
      const mockInterval = setInterval(() => {}, 1000);
      (gateway as any).cleanupInterval = mockInterval;

      // Call destroy
      gateway.onModuleDestroy();

      // All mappings should be cleared
      expect(clientToHeroId.size).toBe(0);

      // Interval should be cleared (we can't directly test this, but the method should not throw)
      expect(() => gateway.onModuleDestroy()).not.toThrow();
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should not grow client mappings indefinitely', async () => {
      const clientToHeroId = (gateway as any).clientToHeroId;
      const initialSize = clientToHeroId.size;

      // Simulate many connections and disconnections
      for (let i = 0; i < 100; i++) {
        const socketId = `temp-socket-${i}`;
        const tempSocket = {
          id: socketId,
          emit: jest.fn(),
          disconnect: jest.fn(),
        };

        // Add mapping (simulating connection)
        clientToHeroId.set(socketId, `hero-${i}`);

        // Remove mapping (simulating disconnection)
        await gateway.handleDisconnect(tempSocket as unknown as Socket);
      }

      // Size should not have grown significantly
      expect(clientToHeroId.size).toBeLessThanOrEqual(initialSize + 1);
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Simulate rapid connect/disconnect cycles
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const socketId = `rapid-socket-${i}`;
        const tempSocket = {
          id: socketId,
          emit: jest.fn(),
          disconnect: jest.fn(),
        };

        // Add mapping
        clientToHeroId.set(socketId, `hero-${i}`);

        // Queue disconnect
        promises.push(gateway.handleDisconnect(tempSocket as unknown as Socket));
      }

      await Promise.all(promises);

      // All temporary mappings should be cleaned up
      for (let i = 0; i < 50; i++) {
        expect(clientToHeroId.has(`rapid-socket-${i}`)).toBe(false);
      }
    });
  });

  describe('Error Handling in Cleanup', () => {
    it('should handle errors during stale connection cleanup gracefully', () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add client mapping
      clientToHeroId.set('test-client', 'hero-1');

      // Mock server.sockets.sockets to throw error
      (gateway as any).server.sockets = {
        get sockets() {
          throw new Error('Socket access error');
        }
      };

      // Cleanup should not throw
      expect(() => {
        (gateway as any).cleanupStaleConnections();
      }).not.toThrow();
    });

    it('should continue cleanup even if individual operations fail', async () => {
      const clientToHeroId = (gateway as any).clientToHeroId;

      // Add multiple client mappings
      clientToHeroId.set('client-1', 'hero-1');
      clientToHeroId.set('client-2', 'hero-2');
      clientToHeroId.set('client-3', 'hero-3');

      // Mock command bus to fail for one client
      let callCount = 0;
      jest.spyOn(commandBus, 'execute').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return Promise.resolve({ toPlainObject: () => ({}) });
      });

      const socket1 = { id: 'client-1', emit: jest.fn(), disconnect: jest.fn() };
      const socket2 = { id: 'client-2', emit: jest.fn(), disconnect: jest.fn() };
      const socket3 = { id: 'client-3', emit: jest.fn(), disconnect: jest.fn() };

      // All disconnects should complete without throwing
      await expect(gateway.handleDisconnect(socket1 as unknown as Socket)).resolves.not.toThrow();
      await expect(gateway.handleDisconnect(socket2 as unknown as Socket)).resolves.not.toThrow();
      await expect(gateway.handleDisconnect(socket3 as unknown as Socket)).resolves.not.toThrow();

      // All mappings should be cleaned up
      expect(clientToHeroId.size).toBe(0);
    });
  });
});
