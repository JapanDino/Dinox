import { PrismaClient } from "@prisma/client";

declare global {
  var __dinoxPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__dinoxPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__dinoxPrisma = prisma;
}
