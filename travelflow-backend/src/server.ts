import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { env } from "./config/env";

async function main() {
  await prisma.$connect();
  console.log("PostgreSQL connected via Prisma");

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`TravelFlow API listening on http://localhost:${env.port}/api/${env.apiVersion}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
