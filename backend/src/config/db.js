const { PrismaClient } = require("@prisma/client");

// Reuse a single PrismaClient instance across the app (and across
// nodemon hot-reloads in dev) instead of opening a new connection pool
// on every import.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
