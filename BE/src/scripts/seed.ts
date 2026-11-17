/**
 * Creates ready-to-use demo accounts. Safe to run many times: existing
 * accounts are left untouched. Run with `npm run seed`.
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../utils/hash';

export const DEMO_ACCOUNTS = [
  { email: 'admin@example.com', password: 'admin1234', displayName: 'Demo Admin', role: 'admin' },
  { email: 'teacher01@example.com', password: 'teacher1234', displayName: 'GV Nguyễn Văn A', role: 'teacher' },
  { email: 'teacher02@example.com', password: 'teacher1234', displayName: 'GV Trần Thị B', role: 'teacher' },
  { email: 'demo@example.com', password: 'demo1234', displayName: 'Demo Student', role: 'student' }
] as const;

/** Extra regular student accounts so tables have enough rows to search and paginate. */
export const DEMO_STUDENTS = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    email: `student${number}@example.com`,
    password: 'student1234',
    displayName: `Student ${number}`,
    role: 'student',
    // A few unverified accounts make the "verified" filter visible in the demo.
    isEmailVerified: index % 4 !== 3
  } as const;
});

export const seedDemoAccounts = async () => {
  const created: string[] = [];
  const accounts = [...DEMO_ACCOUNTS.map((account) => ({ ...account, isEmailVerified: true })), ...DEMO_STUDENTS];
  for (const account of accounts) {
    const exists = await UserModel.exists({ email: account.email });
    if (exists) continue;

    await UserModel.create({
      email: account.email,
      password: await hashPassword(account.password),
      displayName: account.displayName,
      role: account.role,
      isEmailVerified: account.isEmailVerified
    });
    created.push(account.email);
  }
  return created;
};

const run = async () => {
  // The demo admin has a public password: never create it on a real deployment.
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed demo accounts when NODE_ENV=production.');
  await connectDb();
  const created = await seedDemoAccounts();
  console.log(created.length ? `Created: ${created.join(', ')}` : 'Demo accounts already exist.');
  for (const account of DEMO_ACCOUNTS) console.log(`  ${account.email} / ${account.password}`);
  console.log(`  + ${DEMO_STUDENTS.length} students: student01..${DEMO_STUDENTS.length}@example.com / student1234`);
  await mongoose.disconnect();
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
