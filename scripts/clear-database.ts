/**
 * Wipes the entire MongoDB database named in MONGODB_URI (all collections).
 * IRREVERSIBLE. Do not run against production unless you mean it.
 *
 * Usage (PowerShell):
 *   $env:CONFIRM_CLEAR_DATABASE="yes"; $env:MONGODB_URI="your-uri"; npx ts-node scripts/clear-database.ts
 *
 * If MONGODB_URI is already in the environment (e.g. from .env in Next), still set CONFIRM_CLEAR_DATABASE.
 *
 * On Unix:
 *   CONFIRM_CLEAR_DATABASE=yes npx ts-node scripts/clear-database.ts
 */
import { getDb } from "../lib/mongodb";

async function main() {
  if (process.env.CONFIRM_CLEAR_DATABASE !== "yes") {
    console.error(
      "Refusing: set CONFIRM_CLEAR_DATABASE=yes to drop the whole database.",
    );
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const db = await getDb();
  const name = db.databaseName;

  console.log(`Dropping database "${name}"…`);
  await db.dropDatabase();
  console.log(`Database "${name}" was dropped. All collections are gone.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
