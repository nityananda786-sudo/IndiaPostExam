const fs = require("fs");
const { cert, initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

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

const auth = getAuth(app);

async function main() {
  let nextPageToken;

  console.log("");
  console.log("Firebase Authentication users:");
  console.log("");

  do {
    const result = await auth.listUsers(1000, nextPageToken);

    result.users.forEach((user) => {
      console.log("UID:", user.uid);
      console.log("Email:", user.email || "");
      console.log("Disabled:", user.disabled);
      console.log("-----------------------------------");
    });

    nextPageToken = result.pageToken;
  } while (nextPageToken);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
