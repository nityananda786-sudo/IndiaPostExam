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

/*
 * Returns the last instant of the previous
 * calendar month in India Standard Time.
 *
 * Example:
 * Current month = August 2026
 * Result = 31 July 2026 23:59:59.999 IST
 */
function getPreviousMonthEnd(): Date {
  const now = new Date();

  const indiaParts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
      }
    ).formatToParts(now);

  const year = Number(
    indiaParts.find(
      (part) =>
        part.type === "year"
    )?.value
  );

  const month = Number(
    indiaParts.find(
      (part) =>
        part.type === "month"
    )?.value
  );

  /*
   * Date.UTC here creates the equivalent UTC
   * instant for the first day of the current
   * month at 00:00 IST after applying the
   * +05:30 offset.
   *
   * We calculate the previous month end by
   * using the first day of the current month
   * and subtracting 1 millisecond.
   */
  const currentMonthStartUtc =
    Date.UTC(
      year,
      month - 1,
      1,
      0,
      0,
      0,
      0
    );

  /*
   * Convert the IST midnight representation
   * to its actual UTC instant.
   */
  return new Date(
    currentMonthStartUtc -
      5.5 * 60 * 60 * 1000 -
      1
  );
}

function courseDisplayName(
  purchase: FirebaseFirestore.DocumentData
): string {
  const key =
    normalizeCourseKey(
      purchase.courseId
    );

  const names: Record<
    string,
    string
  > = {
    gdsmts:
      "GDS to MTS",

    gdstomts:
      "GDS to MTS",

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
    names[key] ||
    String(
      purchase.courseName ??
        purchase.title ??
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

    /*
     * Previous Month means:
     * subscription was active at the END
     * of the previous calendar month.
     */
    const previousMonthEnd =
      getPreviousMonthEnd();

    /*
     * Map:
     *
     * normalized course key
     *      ↓
     * course information
     *      ↓
     * Set of unique subscriber UIDs
     *
     * Sets ensure that multiple purchases/
     * renewals by the same user are counted
     * only once.
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

    /*
     * Read all paid purchases.
     *
     * We intentionally calculate subscription
     * validity from startsAt/expiresAt instead
     * of using purchasedAt.
     */
    const purchasesSnapshot =
      await adminDb
        .collection("purchases")
        .where(
          "status",
          "==",
          "paid"
        )
        .get();
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

        const courseId =
          String(
            purchase.courseId ??
              ""
          ).trim();

        const courseKey =
          normalizeCourseKey(
            courseId ||
              purchase.courseName
          );

        if (!courseKey) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * Use startsAt/expiresAt.
         *
         * A subscription is active at a
         * particular point in time when:
         *
         * startsAt <= point
         * AND
         * expiresAt > point
         */
        const startsAt =
          getDateValue(
            purchase.startsAt
          );

        const expiresAt =
          getDateValue(
            purchase.expiresAt
          );

        if (
          !startsAt ||
          !expiresAt
        ) {
          return;
        }

        /*
         * Ignore invalid subscription periods.
         */
        if (
          expiresAt <= startsAt
        ) {
          return;
        }

        if (!courseMap[courseKey]) {
          courseMap[courseKey] = {
            courseId:
              courseId ||
              courseKey,

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

        /*
         * CURRENT MONTH / CURRENT ACTIVE
         *
         * Active right now.
         */
        if (
          startsAt <= now &&
          expiresAt > now
        ) {
          courseMap[courseKey]
            .current
            .add(uid);
        }

        /*
         * PREVIOUS MONTH
         *
         * Active at the end of the
         * previous calendar month.
         */
        if (
          startsAt <=
            previousMonthEnd &&
          expiresAt >
            previousMonthEnd
        ) {
          courseMap[courseKey]
            .previous
            .add(uid);
        }
      }
    );

    /*
     * Collect every UID which appears in
     * either report.
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

    /*
     * Load user profiles.
     */
    const userMap =
      new Map<
        string,
        {
          name: string;
          email: string;
        }
      >();

    /*
     * Subscriber count must NEVER depend on
     * the existence of a Firestore users document.
     *
     * First load whatever profile information
     * exists in Firestore.
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

    /*
     * If a subscriber has no Firestore
     * users document, obtain their identity
     * directly from Firebase Authentication.
     *
     * This is used only for display.
     *
     * The UID already established the
     * subscription and therefore remains
     * counted regardless of profile availability.
     */
    const missingUids =
      Array.from(allUids).filter(
        (uid) =>
          !userMap.has(uid)
      );

    for (const uid of missingUids) {
      try {
        const authUser =
          await adminAuth.getUser(uid);

        userMap.set(
          uid,
          {
            name:
              authUser.displayName ||
              "—",

            email:
              authUser.email ||
              "—",
          }
        );
      } catch (authError) {
        console.error(
          "Unable to load Firebase Auth user:",
          uid,
          authError
        );

        /*
         * Still keep the subscriber in
         * the report even if identity
         * information cannot be retrieved.
         */
        userMap.set(
          uid,
          {
            name: "—",
            email: "—",
          }
        );
      }
    }

    /*
     * Build final course-wise report.
     */
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

            /*
             * IMPORTANT:
             *
             * Subscriber counts are based on the
             * unique UID Sets, NOT on whether a
             * corresponding users profile exists.
             *
             * User details are only for display.
             */
            previousMonth:
              course.previous.size,

            currentMonth:
              course.current.size,

            previousSubscribers,

            currentSubscribers,
          };
        })
        .sort((a, b) =>
          a.courseName.localeCompare(
            b.courseName
          )
        );

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
return NextResponse.json({
      success: true,

      currentMonth: {
        year:
          currentYear,

        month:
          currentMonth,
      },

      previousMonth: {
        year:
          previousYear,

        month:
          previousMonth,
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
      {
        status: 500,
      }
    );
  }
}




