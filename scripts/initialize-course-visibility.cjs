const fs = require("fs");

const envText = fs.readFileSync(".env.local", "utf8");

function getEnv(name) {
  const regex = new RegExp("^" + name + '=(.*)$', "m");
  const match = envText.match(regex);

  if (!match) {
    throw new Error("Missing " + name + " in .env.local");
  }

  let value = match[1].trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  return value.replace(/\\n/g, "\n");
}

const { cert, getApps, initializeApp } =
  require("firebase-admin/app");

const { getFirestore, FieldValue } =
  require("firebase-admin/firestore");

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: getEnv("FIREBASE_ADMIN_PROJECT_ID"),
          clientEmail: getEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
          privateKey: getEnv("FIREBASE_ADMIN_PRIVATE_KEY"),
        }),
      });

const db = getFirestore(app);

const courses = [
  {
    id: "gds-mts",
    title: "GDS → MTS",
    fee: 299,
  },
  {
    id: "gds-postman",
    title: "GDS → Postman / Mail Guard",
    fee: 499,
  },
  {
    id: "postal-assistant",
    title: "Postal Assistant / Sorting Assistant",
    fee: 599,
  },
  {
    id: "inspector-posts",
    title: "Inspector Posts",
    fee: 799,
  },
  {
    id: "pss-group-b",
    title: "PSS Group B",
    fee: 999,
  },
];

async function main() {
  console.log("");
  console.log("Initializing IndiaPostExam course visibility...");
  console.log("");

  for (const course of courses) {
    const ref = db.collection("courses").doc(course.id);

    await ref.set(
      {
        courseId: course.id,
        title: course.title,
        fee: course.fee,
        published: true,
        enrollmentOpen: true,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `✓ ${course.id} -> published=true, enrollmentOpen=true`
    );
  }

  console.log("");
  console.log("All five courses are now published.");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("ERROR:");
    console.error(error);
    console.error("");
    process.exit(1);
  });
