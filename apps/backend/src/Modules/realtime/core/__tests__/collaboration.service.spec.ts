import { CollaborationService } from '../collaboration.service';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  pipeline: jest.fn(),
  scan: jest.fn(),
};

const mockAwarenessService = {
  setAwareness: jest.fn().mockResolvedValue({}),
  listAwareness: jest.fn().mockResolvedValue([]),
  removeAwareness: jest.fn().mockResolvedValue(true),
};

jest.mock('src/common/redis/redis.service', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockReturnValue(mockRedis),
  })),
}));

jest.mock('../awareness.service', () => ({
  AwarenessService: jest.fn().mockImplementation(() => mockAwarenessService),
}));

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRedis.pipeline.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      hset: jest.fn().mockReturnThis(),
      hdel: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
    });

    service = new CollaborationService(
      mockAwarenessService as any,
      { getClient: jest.fn().mockReturnValue(mockRedis) } as any,
    );
  });

  describe('joinFile', () => {
    it('should join a file with a new name when no one else is present', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.joinFile(
        'file1',
        'project1',
        'socket1',
        'user1',
        'Test User',
      );

      expect(result.viewer.userName).toBe('Test User');
      expect(result.left).toEqual([]);
    });

    it('should assign a suffixed name when the original is taken', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.hgetall.mockResolvedValue({
        socket1: JSON.stringify({
          socketId: 'socket1',
          userId: 'user2',
          userName: 'Test User',
          fileId: 'file1',
          projectId: 'project1',
        }),
      });

      const result = await service.joinFile(
        'file1',
        'project1',
        'socket2',
        'user1',
        'Test User',
      );

      expect(result.viewer.userName).toBe('Test User 1');
    });

    it('should assign Test User 2 when Test User and Test User 1 are taken', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.hgetall.mockResolvedValue({
        socket1: JSON.stringify({
          socketId: 'socket1',
          userId: 'user2',
          userName: 'Test User',
          fileId: 'file1',
          projectId: 'project1',
        }),
        socket2: JSON.stringify({
          socketId: 'socket2',
          userId: 'user3',
          userName: 'Test User 1',
          fileId: 'file1',
          projectId: 'project1',
        }),
      });

      const result = await service.joinFile(
        'file1',
        'project1',
        'socket3',
        'user1',
        'Test User',
      );

      expect(result.viewer.userName).toBe('Test User 2');
    });

    it('should return previous viewer as left when socket was already joined', async () => {
      const prevViewer = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Old User',
        fileId: 'oldFile',
        projectId: 'oldProject',
      });
      mockRedis.get.mockResolvedValue(prevViewer);
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.joinFile(
        'file1',
        'project1',
        'socket1',
        'user1',
        'Test User',
      );

      expect(result.left).toHaveLength(1);
      expect(result.left[0].userId).toBe('user1');
    });
  });

  describe('leaveFile', () => {
    it('should leave a file and clean up Redis entries', async () => {
      const viewer = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
        fileId: 'file1',
        projectId: 'project1',
      });
      mockRedis.get.mockResolvedValue(viewer);

      const result = await service.leaveFile('file1', 'socket1');

      expect(result).toBeTruthy();
      expect(result!.socketId).toBe('socket1');
    });

    it('should return null when socket does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.leaveFile('file1', 'socket1');

      expect(result).toBeNull();
    });

    it('should return null when fileId does not match', async () => {
      const viewer = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
        fileId: 'differentFile',
        projectId: 'project1',
      });
      mockRedis.get.mockResolvedValue(viewer);

      const result = await service.leaveFile('file1', 'socket1');

      expect(result).toBeNull();
    });
  });

  describe('leaveSocket', () => {
    it('should remove socket and return viewer', async () => {
      const viewer = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'Test User',
        fileId: 'file1',
        projectId: 'project1',
      });
      mockRedis.get.mockResolvedValue(viewer);

      const result = await service.leaveSocket('socket1');

      expect(result).toHaveLength(1);
      expect(result[0].socketId).toBe('socket1');
    });

    it('should return empty array when socket does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.leaveSocket('socket1');

      expect(result).toEqual([]);
    });
  });

  describe('listProjectViewers', () => {
    it('should return all viewers for a project', async () => {
      const viewer1 = JSON.stringify({
        socketId: 'socket1',
        userId: 'user1',
        userName: 'User 1',
        fileId: 'file1',
        projectId: 'project1',
      });
      const viewer2 = JSON.stringify({
        socketId: 'socket2',
        userId: 'user2',
        userName: 'User 2',
        fileId: 'file1',
        projectId: 'project1',
      });
      mockRedis.hgetall.mockResolvedValue({
        socket1: viewer1,
        socket2: viewer2,
      });

      const result = await service.listProjectViewers('project1');

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no viewers exist', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.listProjectViewers('project1');

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedis.hgetall.mockResolvedValue({
        socket1: 'invalid-json',
      });

      const result = await service.listProjectViewers('project1');

      expect(result).toEqual([]);
    });
  });

  describe('setAwareness', () => {
    it('should call awarenessService.setAwareness', async () => {
      const state = {
        socketId: 'socket1',
        userId: 'user1',
        userName: 'User 1',
      };

      const result = await service.setAwareness('file1', state);

      expect(result).toBeDefined();
    });
  });

  describe('listAwareness', () => {
    it('should call awarenessService.listAwareness', async () => {
      const result = await service.listAwareness('file1');

      expect(result).toBeDefined();
    });
  });

  describe('removeAwareness', () => {
    it('should call awarenessService.removeAwareness', async () => {
      const result = await service.removeAwareness('file1', 'socket1');

      expect(result).toBe(true);
    });
  });
});
