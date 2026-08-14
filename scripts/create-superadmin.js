// Plain Node.js script to create a superadmin user
// Usage (from project root):
//   node scripts/create-superadmin.js

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not set in environment variables");
  process.exit(1);
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nTertiaryGuide superadmin creation");
  console.log("----------------------------------");

  const username =
    (await askQuestion(rl, "Superadmin username (e.g. superadmin): ")) ||
    "superadmin";
  const email =
    (await askQuestion(
      rl,
      "Superadmin email (e.g. superadmin@tertiaryguide.com): ",
    )) || "superadmin@tertiaryguide.com";
  const normalizedEmail = email.toLowerCase();

  let password = "";
  let confirm = "";

  while (true) {
    password = await askQuestion(rl, "Superadmin password: ");
    confirm = await askQuestion(rl, "Confirm password: ");

    if (!password) {
      console.log("Password cannot be empty. Please try again.\n");
      continue;
    }

    if (password.length < 8) {
      console.log("Password must be at least 8 characters. Please try again.\n");
      continue;
    }

    if (password !== confirm) {
      console.log("Passwords do not match. Please try again.\n");
      continue;
    }

    break;
  }

  rl.close();

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const users = db.collection("users");

    const existing = await users.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            username,
            email: normalizedEmail,
            passwordHash,
            role: "superadmin",
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
      email: normalizedEmail,
      passwordHash,
      role: "superadmin",
      createdAt: now,
      updatedAt: now,
    });

    console.log("Superadmin created:", { username, email });
  } finally {
    await client.close();
  }
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
