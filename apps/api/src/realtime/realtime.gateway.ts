import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

type PingMessage = {
  ts?: number;
};

type SubscribeMessageBody = {
  channel?: string;
  params?: Record<string, unknown>;
};

@WebSocketGateway({
  path: '/ws',
  cors: true,
})
export class RealtimeGateway {
  @WebSocketServer()
  server?: Server;

  handleConnection(client: Socket): void {
    client.emit('connection:established', {
      type: 'connection:established',
      data: { clientId: client.id },
      ts: Date.now(),
    });
  }

  @SubscribeMessage('ping')
  ping(@MessageBody() body: PingMessage) {
    return {
      type: 'pong',
      data: { ts: body.ts ?? Date.now() },
      ts: Date.now(),
    };
  }

  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribeMessageBody) {
    const channel = body.channel ?? 'default';
    void client.join(channel);

    return {
      type: 'subscription:created',
      data: { channel, params: body.params ?? {} },
      ts: Date.now(),
    };
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribeMessageBody) {
    const channel = body.channel ?? 'default';
    void client.leave(channel);

    return {
      type: 'subscription:removed',
      data: { channel },
      ts: Date.now(),
    };
  }

  publish(channel: string, type: string, data: unknown): void {
    this.server?.to(channel).emit(type, {
      type,
      data,
      ts: Date.now(),
    });
  }
}

