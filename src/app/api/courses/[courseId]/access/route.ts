import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const TRIAL_DURATION_MS = 60 * 60 * 1000;

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ courseId: string }>;
  }
) {
  try {
    // --------------------------------------------------
    // 1. Authenticate user
    // --------------------------------------------------

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const token =
      authorization.substring("Bearer ".length).trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(token);

    const uid = decoded.uid;

    // --------------------------------------------------
    // 2. Course ID
    // --------------------------------------------------

    const { courseId } = await context.params;

    if (!courseId) {
      return NextResponse.json(
        {
          success: false,
          error: "Course ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Load user profile
    // --------------------------------------------------

    const userRef =
      adminDb.collection("users").doc(uid);

    const userSnap =
      await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "User profile not found.",
        },
        { status: 404 }
      );
    }

    const userData =
      userSnap.data() || {};

    // --------------------------------------------------
    // 4. Check user active status
    // --------------------------------------------------

    const userActive =
      userData.active !== false;

    if (!userActive) {
      return NextResponse.json({
        success: true,
        hasAccess: false,
        accessType: "none",
        reason: "account_inactive",
      });
    }

    // --------------------------------------------------
    // 5. Load course
    // --------------------------------------------------

    const courseRef =
      adminDb.collection("courses").doc(courseId);

    const courseSnap =
      await courseRef.get();

    if (!courseSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found.",
        },
        { status: 404 }
      );
    }

    const courseData =
      courseSnap.data() || {};

    const published =
      courseData.published ??
      courseData.Published ??
      false;

    // --------------------------------------------------
    // 6. Check paid purchase FIRST
    //
    // Paid users retain access even when the course
    // is unpublished.
    // --------------------------------------------------

    const purchasesSnapshot =
      await adminDb
        .collection("purchases")
        .where("uid", "==", uid)
        .where("courseId", "==", courseId)
        .get();

    let latestPaidExpiry: Date | null = null;

    for (
      const purchaseDoc of purchasesSnapshot.docs
    ) {
      const purchase =
        purchaseDoc.data();

      if (purchase.status !== "paid") {
        continue;
      }

      const expiryDate =
        toDate(purchase.expiresAt);

      if (!expiryDate) {
        continue;
      }

      if (
        expiryDate.getTime() > Date.now() &&
        (
          !latestPaidExpiry ||
          expiryDate.getTime() >
            latestPaidExpiry.getTime()
        )
      ) {
        latestPaidExpiry =
          expiryDate;
      }
    }

    // --------------------------------------------------
    // PAID ACCESS
    //
    // This is deliberately checked before published.
    // Therefore unpublishing a course does NOT remove
    // access from already enrolled/purchased aspirants.
    // --------------------------------------------------

    if (latestPaidExpiry) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
        accessType: "paid",
        expiresAt:
          latestPaidExpiry.toISOString(),
        published: Boolean(published),
      });
    }

    // --------------------------------------------------
    // 7. No paid purchase.
    //
    // Trial is available ONLY for published courses.
    // --------------------------------------------------

    if (!published) {
      return NextResponse.json({
        success: true,
        hasAccess: false,
        accessType: "none",
        reason: "course_unpublished",
        published: false,
      });
    }

    // --------------------------------------------------
    // 8. Check one-hour trial
    // --------------------------------------------------

    const trialStartedAt =
      toDate(userData.trialStartedAt);

    if (!trialStartedAt) {
      // --------------------------------------------------
      // FIRST COURSE ACCESS — START GLOBAL 1-HOUR TRIAL
      // --------------------------------------------------
      // The trial is created only now, not during registration.
      // A Firestore transaction guarantees that simultaneous
      // course requests cannot create separate trial periods.
      // --------------------------------------------------

      const trialResult = await adminDb.runTransaction(
        async (transaction) => {
          const freshUserSnap =
            await transaction.get(userRef);

          const freshUserData =
            freshUserSnap.data() || {};

          const existingTrialStartedAt =
            toDate(freshUserData.trialStartedAt);

          if (existingTrialStartedAt) {
            return existingTrialStartedAt;
          }

          const trialStart = new Date();

          transaction.update(userRef, {
            trialStartedAt: FieldValue.serverTimestamp(),
          });

          return trialStart;
        }
      );

      const trialExpiresAt = new Date(
        trialResult.getTime() + TRIAL_DURATION_MS
      );

      const now = new Date();

      if (trialExpiresAt.getTime() > now.getTime()) {
        const remainingMs =
          trialExpiresAt.getTime() - now.getTime();

        return NextResponse.json({
          success: true,
          hasAccess: true,
          accessType: "trial",
          trialStartedAt:
            trialResult.toISOString(),
          trialExpiresAt:
            trialExpiresAt.toISOString(),
          remainingSeconds:
            Math.ceil(remainingMs / 1000),
          published: true,
        });
      }

      return NextResponse.json({
        success: true,
        hasAccess: false,
        accessType: "none",
        reason: "trial_expired",
        trialStartedAt:
          trialResult.toISOString(),
        trialExpiresAt:
          trialExpiresAt.toISOString(),
        published: true,
      });
    }

    const trialExpiresAt =
      new Date(
        trialStartedAt.getTime() +
          TRIAL_DURATION_MS
      );

    const now =
      new Date();

    if (
      trialExpiresAt.getTime() > now.getTime()
    ) {
      const remainingMs =
        trialExpiresAt.getTime() -
        now.getTime();

      return NextResponse.json({
        success: true,
        hasAccess: true,
        accessType: "trial",
        trialStartedAt:
          trialStartedAt.toISOString(),
        trialExpiresAt:
          trialExpiresAt.toISOString(),
        remainingSeconds:
          Math.ceil(
            remainingMs / 1000
          ),
        published: true,
      });
    }

    // --------------------------------------------------
    // 9. Trial expired
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      hasAccess: false,
      accessType: "none",
      reason: "trial_expired",
      trialStartedAt:
        trialStartedAt.toISOString(),
      trialExpiresAt:
        trialExpiresAt.toISOString(),
      published: true,
    });

  } catch (error) {
    console.error(
      "GET /api/courses/[courseId]/access error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to verify course access.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

