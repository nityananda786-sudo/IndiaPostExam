import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  courses,
} from "@/components/featured-courses/courseData";

export const runtime = "nodejs";

// --------------------------------------------------
// PLAN TYPES
// --------------------------------------------------

type PlanId =
  | "monthly"
  | "six_month"
  | "yearly"
  | "annual";

type NormalizedPlan = {
  id: "monthly" | "six_month" | "yearly";
  durationMonths: number;
  discount: number;
};

// --------------------------------------------------
// ADD MONTHS SAFELY
//
// This uses calendar months rather than simply
// adding 30 days.
// --------------------------------------------------

function addMonths(
  sourceDate: Date,
  months: number
): Date {
  const result = new Date(sourceDate);

  const originalDay = result.getDate();

  // Move to the first day of the target month
  result.setDate(1);

  result.setMonth(
    result.getMonth() + months
  );

  // Last day of target month
  const lastDayOfTargetMonth =
    new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0
    ).getDate();

  result.setDate(
    Math.min(
      originalDay,
      lastDayOfTargetMonth
    )
  );

  return result;
}

// --------------------------------------------------
// NORMALIZE PLAN
// --------------------------------------------------

function getNormalizedPlan(
  planId: PlanId
): NormalizedPlan | null {
  switch (planId) {
    case "monthly":
      return {
        id: "monthly",
        durationMonths: 1,
        discount: 0,
      };

    case "six_month":
      return {
        id: "six_month",
        durationMonths: 6,
        discount: 0.20,
      };

    case "yearly":
    case "annual":
      return {
        id: "yearly",
        durationMonths: 12,
        discount: 0.30,
      };

    default:
      return null;
  }
}

// --------------------------------------------------
// POST
// --------------------------------------------------

export async function POST(
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
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization.substring(
        "Bearer ".length
      );

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    const uid = decodedToken.uid;

    // ==================================================
    // 2. READ REQUEST BODY
    // ==================================================

    const body = await request.json();

    const courseId = body?.courseId;

    const planId =
      typeof body?.planId === "string"
        ? (body.planId as PlanId)
        : null;

    const razorpayPaymentId =
      body?.razorpay_payment_id;

    const razorpayOrderId =
      body?.razorpay_order_id;

    const razorpaySignature =
      body?.razorpay_signature;

    if (
      !courseId ||
      typeof courseId !== "string" ||
      !planId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incomplete payment information.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 3. NORMALIZE PLAN
    // ==================================================

    const normalizedPlan =
      getNormalizedPlan(planId);

    if (!normalizedPlan) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Invalid subscription plan: ${planId}`,
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 4. FIND COURSE
    // ==================================================

    const course = courses.find(
      (item) => item.id === courseId
    );

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found.",
        },
        { status: 404 }
      );
    }

    if (course.access !== "premium") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This course is not available for purchase.",
        },
        { status: 400 }
      );
    }

    if (
      typeof course.fee !== "number" ||
      course.fee <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid course price.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 5. RAZORPAY CREDENTIALS
    // ==================================================

    const keyId =
      process.env.RAZORPAY_KEY_ID;

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error(
        "Razorpay credentials are missing."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay server configuration is missing.",
        },
        { status: 500 }
      );
    }

    // ==================================================
    // 6. VERIFY RAZORPAY SIGNATURE
    // ==================================================

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          keySecret
        )
        .update(
          `${razorpayOrderId}|${razorpayPaymentId}`
        )
        .digest("hex");

    const receivedBuffer =
      Buffer.from(
        razorpaySignature,
        "utf8"
      );

    const generatedBuffer =
      Buffer.from(
        generatedSignature,
        "utf8"
      );

    if (
      receivedBuffer.length !==
        generatedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        generatedBuffer
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment verification failed.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 7. CREATE RAZORPAY SERVER INSTANCE
    // ==================================================

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // ==================================================
    // 8. FETCH RAZORPAY ORDER
    //
    // This is important.
    //
    // We don't blindly trust courseId/planId
    // sent by the browser.
    //
    // We compare them against the trusted Razorpay
    // order created by our server.
    // ==================================================

    const razorpayOrder =
      await razorpay.orders.fetch(
        razorpayOrderId
      );

    // ==================================================
    // 9. CHECK ORDER-COURSE MATCH
    // ==================================================

    const orderCourseId =
      razorpayOrder.notes?.courseId;

    if (
      orderCourseId !== courseId
    ) {
      console.error(
        "Course mismatch:",
        {
          receivedCourseId:
            courseId,
          razorpayCourseId:
            orderCourseId,
          orderId:
            razorpayOrderId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Course information does not match the payment order.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 10. CHECK ORDER-PLAN MATCH
    // ==================================================

    const orderPlanId =
      razorpayOrder.notes?.planId;

    const normalizedOrderPlan =
      orderPlanId === "annual"
        ? "yearly"
        : orderPlanId;

    if (
      normalizedOrderPlan !==
      normalizedPlan.id
    ) {
      console.error(
        "Plan mismatch:",
        {
          receivedPlan:
            normalizedPlan.id,
          razorpayPlan:
            orderPlanId,
          orderId:
            razorpayOrderId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Subscription plan does not match the payment order.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 11. CALCULATE EXPECTED PRICE
    //
    // Same calculation used when creating the order.
    // ==================================================

    const baseAmount =
      course.fee *
      normalizedPlan.durationMonths;

    const expectedAmountInRupees =
      Math.round(
        baseAmount *
          (1 - normalizedPlan.discount)
      );

    const expectedAmountInPaise =
      expectedAmountInRupees * 100;

    // ==================================================
    // 12. VERIFY RAZORPAY ORDER AMOUNT
    // ==================================================

    if (
      Number(razorpayOrder.amount) !==
      expectedAmountInPaise
    ) {
      console.error(
        "Payment amount mismatch:",
        {
          expected:
            expectedAmountInPaise,
          razorpay:
            razorpayOrder.amount,
          courseId,
          planId:
            normalizedPlan.id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount does not match the selected subscription plan.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 13. FETCH PAYMENT
    //
    // Confirm that the payment belongs to this order
    // and has been captured.
    // ==================================================

    const payment =
      await razorpay.payments.fetch(
        razorpayPaymentId
      );

    if (
      payment.order_id !==
      razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment does not belong to the specified order.",
        },
        { status: 400 }
      );
    }

    if (
      payment.status !== "captured"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment has not been captured yet.",
        },
        { status: 400 }
      );
    }

    // ==================================================
    // 14. PREVENT DUPLICATE PAYMENT RECORD
    // ==================================================

    const existingPurchase =
      await adminDb
        .collection("purchases")
        .where(
          "razorpayPaymentId",
          "==",
          razorpayPaymentId
        )
        .limit(1)
        .get();

    if (
      !existingPurchase.empty
    ) {
      return NextResponse.json({
        success: true,

        verified: true,

        alreadyRecorded: true,

        message:
          "Payment was already recorded.",
      });
    }

    // ==================================================
    // 15. DETERMINE SUBSCRIPTION START
    //
    // If the Aspirant already has active access,
    // renewal starts from the current expiry date.
    //
    // Otherwise it starts now.
    // ==================================================

    const now = new Date();

    let subscriptionStart =
      new Date(now);

    let currentExpiry:
      | Date
      | null = null;

    // Get all paid purchases for this user.
    //
    // We intentionally query only by UID and filter
    // the course/status in server code to avoid
    // requiring a compound Firestore index here.

    const previousPurchases =
      await adminDb
        .collection("purchases")
        .where("uid", "==", uid)
        .get();

    for (
      const purchaseDoc of
        previousPurchases.docs
    ) {
      const purchase =
        purchaseDoc.data();

      if (
        purchase.courseId !==
          courseId ||
        purchase.status !==
          "paid" ||
        !purchase.expiresAt
      ) {
        continue;
      }

      const expiryValue =
        purchase.expiresAt;

      let expiryDate:
        Date | null = null;

      if (
        expiryValue instanceof Date
      ) {
        expiryDate =
          new Date(expiryValue);
      } else if (
        typeof expiryValue?.toDate ===
        "function"
      ) {
        expiryDate =
          expiryValue.toDate();
      } else if (
        typeof expiryValue ===
        "string" ||
        typeof expiryValue ===
        "number"
      ) {
        expiryDate =
          new Date(expiryValue);
      }

      if (
        expiryDate &&
        !Number.isNaN(
          expiryDate.getTime()
        ) &&
        expiryDate > now
      ) {
        if (
          !currentExpiry ||
          expiryDate >
            currentExpiry
        ) {
          currentExpiry =
            expiryDate;
        }
      }
    }

    if (currentExpiry) {
      subscriptionStart =
        currentExpiry;
    }

    // ==================================================
    // 16. CALCULATE NEW EXPIRY
    // ==================================================

    const subscriptionExpiry =
      addMonths(
        subscriptionStart,
        normalizedPlan.durationMonths
      );

    // ==================================================
    // 17. CREATE PURCHASE RECORD
    // ==================================================

    const purchaseRef =
      adminDb
        .collection("purchases")
        .doc();

    await purchaseRef.set({
      uid,

      courseId,

      courseName:
        course.title,

      planId:
        normalizedPlan.id,

      durationMonths:
        normalizedPlan.durationMonths,

      discountPercent:
        normalizedPlan.discount * 100,

      monthlyFee:
        course.fee,

      amount:
        expectedAmountInRupees,

      razorpayOrderId:
        razorpayOrderId,

      razorpayPaymentId:
        razorpayPaymentId,

      razorpaySignature:
        razorpaySignature,

      status: "paid",

      purchasedAt:
        now,

      startsAt:
        subscriptionStart,

      expiresAt:
        subscriptionExpiry,

      createdAt:
        now,
    });

    // ==================================================
    // 18. LOG SUCCESS
    // ==================================================

    console.log(
      "Subscription purchase recorded:",
      {
        purchaseId:
          purchaseRef.id,

        uid,

        courseId,

        planId:
          normalizedPlan.id,

        amount:
          expectedAmountInRupees,

        startsAt:
          subscriptionStart.toISOString(),

        expiresAt:
          subscriptionExpiry.toISOString(),

        renewedInAdvance:
          Boolean(currentExpiry),
      }
    );

    // ==================================================
    // 19. RETURN SUCCESS
    // ==================================================

    return NextResponse.json({
      success: true,

      verified: true,

      purchaseRecorded: true,

      purchaseId:
        purchaseRef.id,

      courseId,

      planId:
        normalizedPlan.id,

      amount:
        expectedAmountInRupees,

      durationMonths:
        normalizedPlan.durationMonths,

      startsAt:
        subscriptionStart.toISOString(),

      expiresAt:
        subscriptionExpiry.toISOString(),

      renewedInAdvance:
        Boolean(currentExpiry),

      message:
        currentExpiry
          ? "Payment verified and subscription renewed from the existing expiry date."
          : "Payment verified and subscription activated.",
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}