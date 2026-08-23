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

const profiles = [
  {
    uid: "C2eTjsuan2NZBF6JRfqjytq3suA2",
    email: "cnag63@gmail.com",
  },
  {
    uid: "syZ9n3GQrNPbq67RyJEtQCXHbc23",
    email: "email@example.com",
  },
];

async function main() {
  for (const profile of profiles) {
    const ref = db.collection("users").doc(profile.uid);
    const snapshot = await ref.get();

    if (snapshot.exists) {
      console.log("Already exists:", profile.email);
      continue;
    }

    await ref.set({
      email: profile.email,
      role: "student",
      subscription: "free",
      createdAt: FieldValue.serverTimestamp(),
      trialStartedAt: FieldValue.serverTimestamp(),
    });

    console.log("Created profile:", profile.email);
  }

  console.log("");
  console.log("User profile repair completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

