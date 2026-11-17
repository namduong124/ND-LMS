import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { JwtPayload, verifyToken } from '../utils/jwt';

let io: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

export const initSocketServer = (httpServer: http.Server): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      const token =
        socket.handshake.auth?.token ||
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

      if (!token) {
        return next(new Error('Authentication error: Token is required'));
      }

      const decoded = verifyToken(token);
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (user?.sub) {
      socket.join(user.sub);
    }
    if (user?.role) {
      socket.join(`role:${user.role}`);
    }

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => io;

export const setIO = (testIO: SocketIOServer | null) => {
  io = testIO;
};

export const emitToUser = (userId: string | Types.ObjectId, event: string, data: unknown) => {
  if (io) {
    io.to(userId.toString()).emit(event, data);
  }
};

export const emitToRole = (role: string, event: string, data: unknown) => {
  if (io) {
    const room = role.startsWith('role:') ? role : `role:${role}`;
    io.to(room).emit(event, data);
  }
};

export const emitToAll = (event: string, data: unknown) => {
  if (io) {
    io.emit(event, data);
  }
};
