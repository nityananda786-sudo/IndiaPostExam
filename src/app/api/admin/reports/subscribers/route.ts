import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAdmin(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  const token =
    authorization
      .substring("Bearer ".length)
      .trim();

  if (!token) {
    throw new Error("Unauthorized.");
  }

  const decoded =
    await adminAuth.verifyIdToken(token);

  const userSnap =
    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

  if (!userSnap.exists) {
    throw new Error("User profile not found.");
  }

  const userData =
    userSnap.data() || {};

  if (userData.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return decoded;
}

function normalizeCourseKey(
  value: unknown
): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getDateValue(
  value: any
): Date | null {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return date instanceof Date &&
      !Number.isNaN(date.getTime())
      ? date
      : null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
}

function getIndiaYearMonth(
  date: Date
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
      }
    );

  const parts =
    formatter.formatToParts(date);

  return {
    year: Number(
      parts.find(
        (part) =>
          part.type === "year"
      )?.value
    ),
    month: Number(
      parts.find(
        (part) =>
          part.type === "month"
      )?.value
    ),
  };
}

function courseDisplayName(
  purchase: FirebaseFirestore.DocumentData
): string {
  const id =
    normalizeCourseKey(
      purchase.courseId
    );

  const names: Record<
    string,
    string
  > = {
    gdsmts: "GDS to MTS",
    gdstomts: "GDS to MTS",
    gdspostman:
      "GDS to Postman / Mail Guard",
    postman:
      "GDS to Postman / Mail Guard",
    postalassistant:
      "Postal Assistant / Sorting Assistant",
    pa:
      "Postal Assistant / Sorting Assistant",
    inspectorposts:
      "Inspector Posts",
    inspector:
      "Inspector Posts",
    pssgroupb:
      "PSS Group B",
  };

  return (
    names[id] ||
    String(
      purchase.courseName ??
        purchase.courseId ??
        "Unknown Course"
    )
  );
}

function getUserName(
  data: FirebaseFirestore.DocumentData
): string {
  return String(
    data.name ??
      data.fullName ??
      data.displayName ??
      data.userName ??
      data.username ??
      ""
  ).trim();
}

export async function GET(
  request: NextRequest
) {
  try {
    await verifyAdmin(request);

    const now = new Date();

    const {
      year: currentYear,
      month: currentMonth,
    } =
      getIndiaYearMonth(now);

    let previousYear =
      currentYear;

    let previousMonth =
      currentMonth - 1;

    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear--;
    }

    const purchasesSnapshot =
      await adminDb
        .collection("purchases")
        .where(
          "status",
          "==",
          "paid"
        )
        .get();

    /*
     * courseKey ->
     * {
     *   previous: Set<uid>,
     *   current: Set<uid>,
     *   courseId,
     *   courseName
     * }
     */
    const courseMap: Record<
      string,
      {
        courseId: string;
        courseName: string;
        previous: Set<string>;
        current: Set<string>;
      }
    > = {};

    purchasesSnapshot.docs.forEach(
      (purchaseDoc) => {
        const purchase =
          purchaseDoc.data();

        const uid =
          String(
            purchase.uid ?? ""
          ).trim();

        if (!uid) {
          return;
        }

        const purchasedAt =
          getDateValue(
            purchase.purchasedAt
          );

        if (!purchasedAt) {
          return;
        }

        const {
          year,
          month,
        } =
          getIndiaYearMonth(
            purchasedAt
          );

        const courseId =
          String(
            purchase.courseId ??
              ""
          ).trim();

        const key =
          normalizeCourseKey(
            courseId ||
              purchase.courseName
          );

        if (!key) {
          return;
        }

        if (!courseMap[key]) {
          courseMap[key] = {
            courseId,
            courseName:
              courseDisplayName(
                purchase
              ),
            previous:
              new Set<string>(),
            current:
              new Set<string>(),
          };
        }

        if (
          year === currentYear &&
          month === currentMonth
        ) {
          courseMap[key]
            .current
            .add(uid);
        }

        if (
          year === previousYear &&
          month === previousMonth
        ) {
          courseMap[key]
            .previous
            .add(uid);
        }
      }
    );

    /*
     * Collect all subscriber UIDs first.
     * This avoids reading the same user repeatedly.
     */
    const allUids =
      new Set<string>();

    Object.values(
      courseMap
    ).forEach((course) => {
      course.previous.forEach(
        (uid) =>
          allUids.add(uid)
      );

      course.current.forEach(
        (uid) =>
          allUids.add(uid)
      );
    });

    const userMap =
      new Map<
        string,
        {
          name: string;
          email: string;
        }
      >();

    /*
     * Firestore getAll() allows us to
     * retrieve the user documents efficiently.
     */
    const userRefs =
      Array.from(allUids).map(
        (uid) =>
          adminDb
            .collection("users")
            .doc(uid)
      );

    if (userRefs.length > 0) {
      const userDocs =
        await adminDb.getAll(
          ...userRefs
        );

      userDocs.forEach(
        (userDoc) => {
          if (!userDoc.exists) {
            return;
          }

          const data =
            userDoc.data() || {};

          userMap.set(
            userDoc.id,
            {
              name:
                getUserName(data) ||
                "—",
              email:
                String(
                  data.email ?? ""
                ).trim() ||
                "—",
            }
          );
        }
      );
    }

    const courses =
      Object.values(
        courseMap
      )
        .map((course) => {
          const previousSubscribers =
            Array.from(
              course.previous
            )
              .map((uid) =>
                userMap.get(uid)
              )
              .filter(
                (
                  user
                ): user is {
                  name: string;
                  email: string;
                } =>
                  Boolean(user)
              )
              .sort(
                (a, b) =>
                  a.name.localeCompare(
                    b.name
                  )
              );

          const currentSubscribers =
            Array.from(
              course.current
            )
              .map((uid) =>
                userMap.get(uid)
              )
              .filter(
                (
                  user
                ): user is {
                  name: string;
                  email: string;
                } =>
                  Boolean(user)
              )
              .sort(
                (a, b) =>
                  a.name.localeCompare(
                    b.name
                  )
              );

          return {
            courseId:
              course.courseId,

            courseName:
              course.courseName,

            previousMonth:
              previousSubscribers.length,

            currentMonth:
              currentSubscribers.length,

            previousSubscribers,

            currentSubscribers,
          };
        })
        .sort((a, b) =>
          a.courseName.localeCompare(
            b.courseName
          )
        );

    return NextResponse.json({
      success: true,

      currentMonth: {
        year: currentYear,
        month: currentMonth,
      },

      previousMonth: {
        year: previousYear,
        month: previousMonth,
      },

      courses,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/reports/subscribers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load subscriber report.",
      },
      { status: 500 }
    );
  }
}
