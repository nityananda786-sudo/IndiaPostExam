const fs = require("fs");
const { cert, initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const env = fs.readFileSync(".env.local", "utf8");

function getEnv(name) {
  const m = env.match(new RegExp("^" + name + "=(.*)$", "m"));
  if (!m) throw new Error("Missing " + name);

  let value = m[1].trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  return value.replace(/\\n/g, "\n");
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: getEnv("FIREBASE_ADMIN_PROJECT_ID"),
        clientEmail: getEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
        privateKey: getEnv("FIREBASE_ADMIN_PRIVATE_KEY"),
      }),
    });

const db = getFirestore(app);

async function main() {
  const uid = "C2eTjsuan2NZBF6JRfqjytq3suA2";
  const email = "cnag63@gmail.com";

  const ref = db.collection("users").doc(uid);
  const existing = await ref.get();

  if (existing.exists) {
    console.log("Profile already exists. No changes made.");
    console.log("UID:", uid);
    return;
  }

  await ref.set({
    email,
    role: "student",
    subscription: "free",
    createdAt: FieldValue.serverTimestamp(),
    trialStartedAt: FieldValue.serverTimestamp(),
  });

  console.log("SUCCESS: User profile created.");
  console.log("Email:", email);
  console.log("UID:", uid);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("ERROR:", error);
    process.exit(1);
  });
