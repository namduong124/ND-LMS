import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { adminRouter } from './routes/admin.route';
import { assignmentRouter } from './routes/assignment.route';
import { authRouter } from './routes/auth.route';
import { chatRouter } from './routes/chat.route';
import { classRouter } from './routes/class.route';
import { courseRouter } from './routes/course.route';
import { departmentRouter } from './routes/department.route';
import { noteRouter } from './routes/note.route';
import { notificationRouter } from './routes/notification.route';
import { profileRouter } from './routes/profile.route';
import { scheduleRouter } from './routes/schedule.route';
import { submissionRouter } from './routes/submission.route';

export const app = express();

const isTest = env.nodeEnv === 'test';

if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (origin === env.clientUrl || origin.includes('localhost')) {
        return callback(null, true);
      }
      try {
        const url = new URL(origin);
        if (url.hostname.endsWith('.onrender.com')) {
          return callback(null, true);
        }
      } catch {
        // ignore url parsing error
      }
      return callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json());
if (!isTest) app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, skip: () => isTest }));

// Stricter limit for credential and OTP endpoints. `/me` is read on every page
// load, so it is left to the global limiter.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' },
  skip: (req) => isTest || req.path === '/me'
});

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/courses', courseRouter);
app.use('/api/classes', classRouter);
app.use('/api/schedules', scheduleRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/notes', noteRouter);
app.use('/api/notifications', notificationRouter);

app.use(notFoundHandler);
app.use(errorMiddleware);
