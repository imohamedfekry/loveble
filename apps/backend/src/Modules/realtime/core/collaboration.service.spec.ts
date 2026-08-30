import { CollaborationService } from './collaboration.service';

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    service = new CollaborationService();
  });

  it('creates a document once and ignores later initial content', () => {
    const first = service.getDocument('file-1', 'hello');
    const second = service.getDocument('file-1', 'ignored');

    expect(first).toBe(second);
    expect(second.document).toBe('hello');
    expect(second.version).toBe(0);
  });

  it('accepts updates only when the client version matches', () => {
    service.getDocument('file-1', 'hello');

    const accepted = service.pushUpdates(
      'file-1',
      0,
      [{ clientID: 'a', changes: [5, [0, '!']] }],
      'hello!',
    );

    expect(accepted).toMatchObject({
      accepted: true,
      fromVersion: 0,
      version: 1,
      document: 'hello!',
    });
    expect(accepted?.updates).toHaveLength(1);

    const rejected = service.pushUpdates(
      'file-1',
      0,
      [{ clientID: 'b', changes: [5, [0, '?']] }],
      'hello?',
    );

    expect(rejected).toMatchObject({
      accepted: false,
      fromVersion: 0,
      version: 1,
      document: 'hello!',
    });
    expect(rejected?.updates).toHaveLength(1);
    expect(rejected?.updates[0].clientID).toBe('a');
  });

  it('returns missed updates from the requested version', () => {
    service.getDocument('file-1', '');
    service.pushUpdates(
      'file-1',
      0,
      [{ clientID: 'a', changes: [0, [0, 'ab']] }],
      'ab',
    );
    service.pushUpdates(
      'file-1',
      1,
      [{ clientID: 'b', changes: [2, [0, 'c']] }],
      'abc',
    );

    expect(service.getUpdatesSince('file-1', 0)).toHaveLength(2);
    expect(service.getUpdatesSince('file-1', 1)).toHaveLength(1);
    expect(service.getUpdatesSince('file-1', 2)).toHaveLength(0);
  });

  it('rejects malformed updates without advancing version', () => {
    service.getDocument('file-1', 'doc');

    const result = service.pushUpdates('file-1', 0, [
      { clientID: 'a', changes: null },
    ] as any);

    expect(result?.accepted).toBe(false);
    expect(service.getSnapshot('file-1', 'doc').version).toBe(0);
  });

  it('returns null when pushing to an unknown file', () => {
    expect(
      service.pushUpdates('missing', 0, [{ clientID: 'a', changes: [] }]),
    ).toBeNull();
  });

  it('does not apply a client that is ahead of the authority', () => {
    service.getDocument('file-1', 'doc');

    const result = service.pushUpdates(
      'file-1',
      4,
      [{ clientID: 'a', changes: [3, [0, '!']] }],
      'doc!',
    );

    expect(result).toMatchObject({
      accepted: false,
      fromVersion: 0,
      version: 0,
      updates: [],
      document: 'doc',
    });
  });

  it('stores, merges, and removes awareness peers', () => {
    service.setAwareness('file-1', {
      socketId: 's1',
      userId: 'u1',
      userName: 'Ada',
      selection: { anchor: 1, head: 3 },
    });

    service.setAwareness('file-1', {
      socketId: 's1',
      userId: 'u1',
      userName: 'Ada',
      mouse: { x: 0.2, y: 0.4 },
    });

    service.setAwareness('file-1', {
      socketId: 's2',
      userId: 'u2',
      userName: 'Grace',
      mouse: { x: 0.8, y: 0.1 },
    });

    expect(service.listAwareness('file-1', 's2')).toEqual([
      {
        socketId: 's1',
        userId: 'u1',
        userName: 'Ada',
        selection: [{ anchor: 1, head: 3 }],
        mouse: { x: 0.2, y: 0.4 },
      },
    ]);

    expect(service.removeAwareness('file-1', 's1')).toBe(true);
    expect(service.listAwareness('file-1')).toHaveLength(1);
    expect(service.removeAwareness('file-1', 's2')).toBe(true);
    expect(service.listAwareness('file-1')).toEqual([]);
  });

  it('stores every multi-cursor range', () => {
    service.setAwareness('file-1', {
      socketId: 's1',
      userId: 'u1',
      userName: 'Ada',
      selection: [
        { anchor: 1, head: 4 },
        { anchor: 10, head: 10 },
        { anchor: 20, head: 22 },
      ],
    });

    expect(service.listAwareness('file-1')[0].selection).toEqual([
      { anchor: 1, head: 4 },
      { anchor: 10, head: 10 },
      { anchor: 20, head: 22 },
    ]);
  });

  it('tracks who is viewing which file in a project', () => {
    service.joinFile('file-a', 'project-1', 's1', 'u1', 'Ada');
    service.joinFile('file-b', 'project-1', 's2', 'u2', 'Grace');
    service.joinFile('file-a', 'project-2', 's3', 'u3', 'Linus');

    expect(service.listProjectViewers('project-1')).toEqual([
      expect.objectContaining({ fileId: 'file-a', userName: 'Ada' }),
      expect.objectContaining({ fileId: 'file-b', userName: 'Grace' }),
    ]);

    const switched = service.joinFile('file-b', 'project-1', 's1', 'u1', 'Ada');
    expect(switched.left).toEqual([
      expect.objectContaining({ fileId: 'file-a', socketId: 's1' }),
    ]);
    expect(service.leaveFile('file-b', 's2')?.userName).toBe('Grace');
    expect(service.listProjectViewers('project-1').map((v) => v.socketId)).toEqual([
      's1',
    ]);
  });
});
