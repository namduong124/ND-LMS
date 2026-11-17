import http from 'http';
import mongoose from 'mongoose';
import { app } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { startDeadlineScheduler, stopDeadlineScheduler } from './services/deadline-scheduler.service';
import { initSocketServer } from './services/socket.service';

const start = async () => {
  await connectDb();
  startDeadlineScheduler();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);
  const server = httpServer.listen(env.port, () => {
    console.log(`Backend running at http://localhost:${env.port}`);
  });

  // Close the HTTP server and the DB connection so `tsx watch` restarts and
  // container stops never leave a dangling port or connection behind.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    stopDeadlineScheduler();
    server.close(() => {
      void mongoose.disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
