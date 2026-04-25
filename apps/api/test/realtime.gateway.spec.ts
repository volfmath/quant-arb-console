import { describe, expect, it, vi } from 'vitest';
import { RealtimeGateway } from '../src/realtime/realtime.gateway';

describe('RealtimeGateway', () => {
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

