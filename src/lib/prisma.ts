import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string {
  let dbUrl = process.env.DATABASE_URL;
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
