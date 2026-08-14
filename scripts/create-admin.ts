import { getDb } from "../lib/mongodb";
import { hashPassword } from "../lib/password";

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  if (!password) {
    throw new Error("ADMIN_PASSWORD must be set in environment variables");
  }

  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne({
    username,
    role: { $in: ["admin", "superadmin"] },
  });
  if (existing) {
    console.log("Admin user already exists:", username);
    return;
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  await users.insertOne({
    username,
    email: email.toLowerCase(),
    passwordHash,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  });

  console.log("Admin user created:", { username, email });
}

main()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
