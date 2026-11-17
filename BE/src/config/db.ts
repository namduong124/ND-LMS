import mongoose from 'mongoose';
import tls from 'tls';
import { env } from './env';

// Atlas M0 clusters on AWS AP-EAST-1 often suffer from TLS 1.3 packet drops / ECONNRESET
// through certain ISPs. Limiting default TLS max version to TLSv1.2 fixes the handshake.
tls.DEFAULT_MAX_VERSION = 'TLSv1.2';

export const connectDb = async (retries = 3, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.warn(
        `[Database] Lỗi kết nối MongoDB (thử lại lần ${attempt}/${retries} sau ${delayMs / 1000}s):`,
        (error as Error).message
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

