import { Inject, Optional } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';

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

  constructor(
    @Optional()
    @Inject(AuthService)
    private readonly authService?: AuthService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    if (this.authService) {
      const token = extractToken(client);
      if (!token) {
        rejectConnection(client, 'Missing bearer token');
        return;
      }

      try {
        client.data.user = await this.authService.verifyToken(token);
      } catch {
        rejectConnection(client, 'Invalid bearer token');
        return;
      }
    }

    client.emit('connection:established', {
      type: 'connection:established',
      data: { clientId: client.id, user: client.data.user },
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

function extractToken(client: Socket): string | null {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken;
  }

  const header = client.handshake.headers.authorization;
  if (typeof header !== 'string') {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function rejectConnection(client: Socket, message: string): void {
  client.emit('connection:error', {
    type: 'connection:error',
    data: { message },
    ts: Date.now(),
  });
  client.disconnect(true);
}
