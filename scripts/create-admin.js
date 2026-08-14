// Plain Node.js script to create an admin user
// Usage (from project root):
//   node scripts/create-admin.js

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

  console.log("\nTertiaryGuide admin creation");
  console.log("--------------------------------");

  const username =
    (await askQuestion(rl, "Admin username (e.g. admin): ")) || "admin";
  const email =
    (await askQuestion(rl, "Admin email (e.g. admin@example.com): ")) ||
    "admin@example.com";

  let password = "";
  let confirm = "";

  // Simple password + confirm loop
  // (Note: echo is not disabled, but acceptable for local admin setup.)
  while (true) {
    password = await askQuestion(rl, "Admin password: ");
    confirm = await askQuestion(rl, "Confirm password: ");

    if (!password) {
      console.log("Password cannot be empty. Please try again.\n");
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
      username,
      role: { $in: ["admin", "superadmin"] },
    });
    if (existing) {
      console.log("Admin user already exists:", username);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
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
