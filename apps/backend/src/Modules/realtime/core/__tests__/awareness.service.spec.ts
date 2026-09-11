import { AwarenessService } from '../awareness.service';
import { RedisService } from 'src/common/redis/redis.service';
import Redis from 'ioredis';

const mockRedis = {
  hget: jest.fn(),
  hgetall: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hlen: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  pipeline: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([]),
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
  }),
  scan: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
} as unknown as Redis;

const mockRedisService = {
  getClient: jest.fn().mockReturnValue(mockRedis),
} as unknown as RedisService;

function createService(): AwarenessService {
  return new AwarenessService(mockRedisService);
}

describe('AwarenessService', () => {
  let service: AwarenessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
  });

  describe('onModuleInit', () => {
    it('should clear stale awareness data on startup', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);
      await service.onModuleInit();
      expect(mockRedis.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'awareness:*',
        'COUNT',
        100,
      );
    });

    it('should delete keys found by scan', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['awareness:file1', 'awareness:file2']])
        .mockResolvedValueOnce(['0', []]);
      await service.onModuleInit();
      expect(mockRedis.del).toHaveBeenCalledWith(
        'awareness:file1',
        'awareness:file2',
      );
    });

    it('should handle scan errors gracefully', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Redis down'));
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('setAwareness', () => {
    it('should set awareness with a generated color', async () => {
      mockRedis.hget.mockResolvedValue(null);
      mockRedis.hgetall.mockResolvedValue({});
      mockRedis.pipeline.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
      });

      const result = await service.setAwareness('file1', {
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
      });

      expect(result.socketId).toBe('socket1');
      expect(result.userId).toBe('user1');
      expect(result.userName).toBe('Test User');
      expect(result.color).toBeDefined();
      expect(result.color).toMatch(/^hsl\(/);
    });

    it('should generate random colors for different users', async () => {
      mockRedis.hget.mockResolvedValue(null);
      mockRedis.hgetall.mockResolvedValue({});
      mockRedis.pipeline.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
      });

      const result1 = await service.setAwareness('file1', {
        socketId: 'socket1',
        userId: 'user1',
        userName: 'User 1',
      });
      const result2 = await service.setAwareness('file1', {
        socketId: 'socket2',
        userId: 'user2',
        userName: 'User 2',
      });

      expect(result1.color).toMatch(/^hsl\(/);
      expect(result2.color).toMatch(/^hsl\(/);
      expect(result1.color).not.toBe(result2.color);
    });

    it('should preserve existing color if set', async () => {
      const existingState = {
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
        color: '#FF0000',
        selection: null,
        mouse: null,
      };
      mockRedis.hget.mockResolvedValue(JSON.stringify(existingState));
      mockRedis.pipeline.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
      });

      const result = await service.setAwareness('file1', {
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
      });

      expect(result.color).toBe('#FF0000');
    });

    it('should set new color when collision detected', async () => {
      mockRedis.hget.mockResolvedValue(null);
      mockRedis.hgetall.mockResolvedValue({
        socket2: JSON.stringify({ userId: 'user1', color: '#FF0000' }),
      });
      mockRedis.pipeline.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
      });

      const result = await service.setAwareness('file1', {
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
      });

      expect(result.color).toBeDefined();
      expect(result.color).toMatch(/^hsl\(/);
      expect(result.color).not.toBe('#FF0000');
    });
  });

  describe('listAwareness', () => {
    it('should return awareness peers sorted by socketId', async () => {
      const state2 = JSON.stringify({
        socketId: 'socket2',
        userId: 'user2',
        userName: 'User 2',
        color: '#00FF00',
        selection: null,
        mouse: null,
      });
      const state1 = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'User 1',
        color: '#FF0000',
        selection: null,
        mouse: null,
      });
      mockRedis.hgetall.mockResolvedValue({
        socket1: state1,
        socket2: state2,
      });

      const result = await service.listAwareness('file1', 'socket1');
      expect(result).toHaveLength(1);
      expect(result[0].socketId).toBe('socket2');
    });

    it('should exclude exceptSocketId', async () => {
      const state = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'User 1',
        color: '#FF0000',
        selection: null,
        mouse: null,
      });
      mockRedis.hgetall.mockResolvedValue({ socket1: state });

      const result = await service.listAwareness('file1', 'socket1');
      expect(result).toHaveLength(0);
    });
  });

  describe('removeAwareness', () => {
    it('should return true and delete key when found', async () => {
      mockRedis.hdel.mockResolvedValue(1);
      mockRedis.hlen.mockResolvedValue(0);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.removeAwareness('file1', 'socket1');
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should return false when not found', async () => {
      mockRedis.hdel.mockResolvedValue(0);
      const result = await service.removeAwareness('file1', 'socket1');
      expect(result).toBe(false);
    });
  });
});
