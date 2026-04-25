import { describe, expect, it, vi } from 'vitest';
import { RealtimeGateway } from '../src/realtime/realtime.gateway';

describe('RealtimeGateway', () => {
  it('accepts websocket connections with a valid auth token', async () => {
    const gateway = new RealtimeGateway({
      verifyToken: async () => ({
        id: 'user-1',
        username: 'admin',
        role: 'super_admin',
        permissions: ['dashboard:view'],
      }),
    } as never);
    const client = {
      id: 'socket-1',
      data: {},
      handshake: { auth: { token: 'token' }, headers: {} },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.data).toHaveProperty('user.username', 'admin');
    expect(client.emit).toHaveBeenCalledWith(
      'connection:established',
      expect.objectContaining({ data: expect.objectContaining({ clientId: 'socket-1' }) }),
    );
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects websocket connections without a token', async () => {
    const gateway = new RealtimeGateway({
      verifyToken: async () => {
        throw new Error('should not be called');
      },
    } as never);
    const client = {
      id: 'socket-1',
      data: {},
      handshake: { auth: {}, headers: {} },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.emit).toHaveBeenCalledWith(
      'connection:error',
      expect.objectContaining({ data: { message: 'Missing bearer token' } }),
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('responds to ping with a pong event payload', () => {
    const gateway = new RealtimeGateway();

    expect(gateway.ping({ ts: 123 })).toMatchObject({
      type: 'pong',
      data: { ts: 123 },
    });
  });

  it('tracks subscribe and unsubscribe messages', () => {
    const gateway = new RealtimeGateway();
    const client = {
      join: vi.fn(),
      leave: vi.fn(),
    };

    expect(gateway.subscribe(client as never, { channel: 'tasks' })).toMatchObject({
      type: 'subscription:created',
      data: { channel: 'tasks' },
    });
    expect(client.join).toHaveBeenCalledWith('tasks');

    expect(gateway.unsubscribe(client as never, { channel: 'tasks' })).toMatchObject({
      type: 'subscription:removed',
      data: { channel: 'tasks' },
    });
    expect(client.leave).toHaveBeenCalledWith('tasks');
  });
});
