import bcrypt from "bcrypt";

const pass = process.argv[2];

if (!pass) {
  console.log("❌ Usage: node scripts/hash.js PASSWORD");
  process.exit(0);
}

const run = async () => {
  const hash = await bcrypt.hash(pass, 10);
  console.log("✅ HASH:");
  console.log(hash);
};

run();
