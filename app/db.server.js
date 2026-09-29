import { PrismaClient } from "@prisma/client";

// Ensure fresh PrismaClient is instantiated when schema or client updates
if (globalThis.prisma) {
  try {
    globalThis.prisma.$disconnect();
  } catch {}
  delete globalThis.prisma;
}

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
