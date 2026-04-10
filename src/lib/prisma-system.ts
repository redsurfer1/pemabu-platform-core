/**
 * Unscoped Prisma client for system tables (e.g. NotificationLog) where tenant
 * AsyncLocalStorage context is not set (cron, email wrapper).
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prismaSystem: PrismaClient | undefined };

export function getPrismaSystem(): PrismaClient {
  if (!globalForPrisma.prismaSystem) {
    globalForPrisma.prismaSystem = new PrismaClient();
  }
  return globalForPrisma.prismaSystem;
}
