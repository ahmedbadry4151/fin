import { existsSync } from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "./client";
import { seedDatabase } from "./seed";

if (!process.env.DATABASE_URL && existsSync(path.resolve(process.cwd(), ".env"))) {
  process.loadEnvFile(path.resolve(process.cwd(), ".env"));
}

async function main() {
  const db = getDb();
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  console.log("Applying migrations from", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("Seeding database...");
  const result = await seedDatabase(db);
  console.log("Done:", result);
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});
