import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type MeritRecord = {
  mockTestId?: string;
  userId?: string;

  score?: number;
  maximumMarks?: number;

  submittedAt?: FirebaseFirestore.Timestamp | null;
  createdAt?: FirebaseFirestore.Timestamp | null;

  correctCount?: number;
  wrongCount?: number;
  attemptedCount?: number;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  maximumMarks: number;
  submittedAt: string | null;
};

function timestampMillis(
  value: unknown
): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (
      value as { toMillis?: unknown }
    ).toMillis === "function"
  ) {
    return (
      value as {
        toMillis: () => number;
      }
    ).toMillis();
  }

  return Number.MAX_SAFE_INTEGER;
}

function timestampIso(
  value: unknown
): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as { toDate?: unknown }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    ).toDate().toISOString();
  }

  return null;
}

function getUserName(
  data: FirebaseFirestore.DocumentData | undefined,
  fallbackEmail?: string
): string {
  if (!data) {
    return fallbackEmail || "Aspirant";
  }

  const possibleNames = [
    data.displayName,
    data.name,
    data.fullName,
    data.studentName,
    data.userName,
  ];

  for (const value of possibleNames) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  if (
    typeof data.email === "string" &&
    data.email.trim()
  ) {
    return data.email.trim();
  }

  return fallbackEmail || "Aspirant";
}

export async function GET(
  request: NextRequest
) {
  try {
    // ==================================================
    // 1. FIREBASE AUTHENTICATION
    // ==================================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization
        .substring("Bearer ".length)
        .trim();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token missing.",
        },
        { status: 401 }
      );
    }

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    const uid = decodedToken.uid;

    // ==================================================
    // 2. READ MOCK TEST ID
    // ==================================================

    const mockTestId =
      request.nextUrl.searchParams
        .get("mockTestId")
        ?.trim() || "";

    if (!mockTestId) {
      return NextResponse.json(
        {
          success: false,
          error: "Mock Test ID is required.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 3. VERIFY MOCK TEST
    // ==================================================

    const mockTestSnap =
      await adminDb
        .collection("mockTests")
        .doc(mockTestId)
        .get();

    if (!mockTestSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Mock Test not found.",
        },
        { status: 404 }
      );
    }

    const mockTest =
      mockTestSnap.data() || {};

    if (
      mockTest.active !== true ||
      mockTest.status !== "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This Mock Test is not available.",
        },
        { status: 403 }
      );
    }

    // ==================================================
    // 4. READ OFFICIAL MERIT RECORDS
    // ==================================================
    //
    // We intentionally read only mockMerits.
    //
    // Retakes in mockAttempts therefore cannot
    // change an aspirant's official score.
    //
    // Sorting is performed server-side so we do not
    // depend on a Firestore composite index.
    //

    const meritSnapshot =
      await adminDb
        .collection("mockMerits")
        .where(
          "mockTestId",
          "==",
          mockTestId
        )
        .get();

    const merits =
      meritSnapshot.docs.map(
        (document) => ({
          id: document.id,
          data:
            document.data() as MeritRecord,
        })
      );

    // ==================================================
    // 5. SORT DYNAMIC MERIT
    // ==================================================

    merits.sort((a, b) => {

      const scoreA =
        Number(a.data.score ?? 0);

      const scoreB =
        Number(b.data.score ?? 0);

      // Higher score first.
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Same score:
      // earlier official submission first.
      const timeA =
        timestampMillis(
          a.data.submittedAt
        );

      const timeB =
        timestampMillis(
          b.data.submittedAt
        );

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Final deterministic tie-breaker.
      return a.id.localeCompare(
        b.id
      );
    });

    // ==================================================
    // 6. ASSIGN CURRENT DYNAMIC RANK
    // ==================================================

    const rankedMerits =
      merits.map(
        (item, index) => ({
          ...item,
          rank: index + 1,
        })
      );

    // ==================================================
    // 7. FIND CURRENT USER
    // ==================================================

    const currentUserEntry =
      rankedMerits.find(
        (item) =>
          item.data.userId === uid
      );

    // ==================================================
    // 8. TOP 10
    // ==================================================

    const topTen =
      rankedMerits.slice(0, 10);

    // ==================================================
    // 9. READ USER PROFILES
    // ==================================================

    const userIds =
      Array.from(
        new Set(
          [
            ...topTen.map(
              (item) =>
                item.data.userId || ""
            ),
            currentUserEntry?.data.userId ||
              "",
          ].filter(Boolean)
        )
      );

    const userSnapshots =
      await Promise.all(
        userIds.map((userId) =>
          adminDb
            .collection("users")
            .doc(userId)
            .get()
        )
      );

    const userMap =
      new Map<
        string,
        FirebaseFirestore.DocumentData
      >();

    userSnapshots.forEach(
      (snapshot) => {
        if (snapshot.exists) {
          userMap.set(
            snapshot.id,
            snapshot.data() || {}
          );
        }
      }
    );

    // ==================================================
    // 10. FORMAT TOP 10
    // ==================================================

    const formattedTopTen:
      LeaderboardEntry[] =
      topTen.map((item) => {

        const userId =
          item.data.userId || "";

        const userData =
          userMap.get(userId);

        return {
          rank: item.rank,

          userId,

          name: getUserName(
            userData,
            undefined
          ),

          score:
            Number(
              item.data.score ?? 0
            ),

          maximumMarks:
            Number(
              item.data.maximumMarks ??
                mockTest.maximumMarks ??
                0
            ),

          submittedAt:
            timestampIso(
              item.data.submittedAt
            ),
        };
      });

    // ==================================================
    // 11. FORMAT CURRENT USER RESULT
    // ==================================================

    let currentUser = null;

    if (currentUserEntry) {

      const userData =
        userMap.get(uid);

      currentUser = {
        rank:
          currentUserEntry.rank,

        userId: uid,

        name:
          getUserName(
            userData,
            decodedToken.email
          ),

        score:
          Number(
            currentUserEntry.data.score ??
              0
          ),

        maximumMarks:
          Number(
            currentUserEntry.data
              .maximumMarks ??
              mockTest.maximumMarks ??
              0
          ),

        submittedAt:
          timestampIso(
            currentUserEntry.data
              .submittedAt
          ),
      };
    }

    // ==================================================
    // 12. RESPONSE
    // ==================================================

    return NextResponse.json({
      success: true,

      mockTest: {
        id: mockTestId,

        testNumber:
          mockTest.testNumber ??
          mockTest.mockTestNumber ??
          "",

        title:
          mockTest.title ??
          `Mock Test ${mockTest.testNumber ?? ""}`,

        maximumMarks:
          Number(
            mockTest.maximumMarks ??
              0
          ),
      },

      currentUser,

      topTen:
        formattedTopTen,

      totalParticipants:
        rankedMerits.length,
    });

  } catch (error) {

    console.error(
      "Mock Test leaderboard error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load Mock Test merit list.",
      },
      { status: 500 }
    );
  }
}
