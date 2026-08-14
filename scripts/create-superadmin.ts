import { getDb } from "../lib/mongodb";
import { hashPassword } from "../lib/password";
import type { ObjectId } from "mongodb";

async function main() {
  const username = process.env.SUPERADMIN_USERNAME || "superadmin";
  const email =
    (process.env.SUPERADMIN_EMAIL || "superadmin@tertiaryguide.com").toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Set SUPERADMIN_PASSWORD or ADMIN_PASSWORD in environment variables",
    );
  }

  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne<{
    _id: ObjectId;
    username: string;
    email?: string;
    role?: string;
  }>({
    $or: [{ username }, { email }],
  });

  const passwordHash = await hashPassword(password);
  const now = new Date();

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          username,
          email,
          role: "superadmin",
          passwordHash,
          updatedAt: now,
        },
      },
    );
    console.log(
      existing.role === "superadmin"
        ? "Updated existing superadmin:"
        : "Promoted existing user to superadmin:",
      username,
    );
    return;
  }

  await users.insertOne({
    username,
    email,
    passwordHash,
    role: "superadmin",
    createdAt: now,
    updatedAt: now,
  });

  console.log("Superadmin created:", { username, email });
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
