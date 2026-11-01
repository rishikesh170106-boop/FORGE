import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string {
  let dbUrl = process.env.DATABASE_URL;

  // On Vercel / serverless runtimes, the project directory is read-only.
  // SQLite requires write access to create lock/journal files, so we copy
  // the pre-seeded SQLite database to the writable /tmp partition.
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const tmpDb = path.join('/tmp', 'communityhero.db');
    try {
      if (!fs.existsSync(tmpDb)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'communityhero.db'),
          path.join(process.cwd(), 'communityhero.db'),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            fs.copyFileSync(candidate, tmpDb);
            break;
          }
        }
      }
      return `file:${tmpDb}`;
    } catch (e) {
      console.warn('[PRISMA] Failed to initialize /tmp db copy, falling back:', e);
    }
  }

  if (!dbUrl || dbUrl.startsWith('file:.')) {
    const prismaDb = path.join(process.cwd(), 'prisma', 'communityhero.db');
    const rootDb = path.join(process.cwd(), 'communityhero.db');
    const targetDb = fs.existsSync(prismaDb) ? prismaDb : rootDb;
    dbUrl = `file:${targetDb}`;
  }
  return dbUrl;
}

const activeDbUrl = getDatabaseUrl();
process.env.DATABASE_URL = activeDbUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
