import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

import { courses } from "@/components/featured-courses/courseData";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  try {
    // ------------------------------------------------
    // RAZORPAY SERVER CREDENTIALS
    // ------------------------------------------------

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error(
        "Razorpay credentials are missing."
      );

      return NextResponse.json(
        {
          error:
            "Razorpay is not configured on the server.",
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------
    // READ REQUEST
    // ------------------------------------------------

    const body = await request.json();

    const courseId = body?.courseId;

    const planId =
      typeof body?.planId === "string"
        ? (body.planId as PlanId)
        : null;

    // ------------------------------------------------
    // VALIDATE COURSE ID
    // ------------------------------------------------

    if (
      !courseId ||
      typeof courseId !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Course ID is required.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // VALIDATE PLAN ID
    // ------------------------------------------------

    if (!planId) {
      return NextResponse.json(
        {
          error:
            "Subscription plan is required.",
        },
        { status: 400 }
      );
    }

    const validPlanIds: PlanId[] = [
      "monthly",
      "six_month",
      "yearly",
      "annual",
    ];

    if (!validPlanIds.includes(planId)) {
      return NextResponse.json(
        {
          error:
            `Invalid subscription plan: ${planId}`,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // NORMALIZE PLAN
    // ------------------------------------------------

    let normalizedPlan: NormalizedPlan;

    switch (planId) {
      case "monthly":
        normalizedPlan = {
          id: "monthly",
          durationMonths: 1,
          discount: 0,
        };
        break;

      case "six_month":
        normalizedPlan = {
          id: "six_month",
          durationMonths: 6,
          discount: 0.20,
        };
        break;

      case "yearly":
      case "annual":
        normalizedPlan = {
          id: "yearly",
          durationMonths: 12,
          discount: 0.30,
        };
        break;

      default:
        return NextResponse.json(
          {
            error:
              `Unsupported subscription plan: ${planId}`,
          },
          { status: 400 }
        );
    }

    // ------------------------------------------------
    // FIND COURSE FROM TRUSTED CONFIGURATION
    // ------------------------------------------------

    const course = courses.find(
      (item) => item.id === courseId
    );

    if (!course) {
      return NextResponse.json(
        {
          error: "Course not found.",
        },
        { status: 404 }
      );
    }

    // ------------------------------------------------
    // ONLY PREMIUM COURSES CAN BE PURCHASED
    // ------------------------------------------------

    if (course.access !== "premium") {
      return NextResponse.json(
        {
          error:
            "This course is not available for purchase.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // VALIDATE COURSE FEE
    // ------------------------------------------------

    if (
      typeof course.fee !== "number" ||
      !Number.isFinite(course.fee) ||
      course.fee <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid course price.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // SERVER-SIDE PRICE CALCULATION
    //
    // Monthly:
    // fee × 1
    //
    // 6 Months:
    // fee × 6 × 80%
    //
    // 1 Year:
    // fee × 12 × 70%
    //
    // Price from browser is NEVER trusted.
    // ------------------------------------------------

    const baseAmount =
      course.fee *
      normalizedPlan.durationMonths;

    const discountedAmount =
      baseAmount *
      (1 - normalizedPlan.discount);

    // Round to nearest rupee
    const amountInRupees =
      Math.round(discountedAmount);

    const amountInPaise =
      amountInRupees * 100;

    if (
      !Number.isInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to calculate a valid payment amount.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // CREATE RAZORPAY INSTANCE
    // ------------------------------------------------

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // ------------------------------------------------
    // UNIQUE RECEIPT
    // ------------------------------------------------

    const receipt =
      `ipe_${Date.now()}`;

    // ------------------------------------------------
    // CREATE RAZORPAY ORDER
    // ------------------------------------------------

    const order =
      await razorpay.orders.create({
        amount: amountInPaise,

        currency: "INR",

        receipt,

        notes: {
          courseId: course.id,

          courseName: course.title,

          planId: normalizedPlan.id,

          durationMonths:
            String(
              normalizedPlan.durationMonths
            ),

          monthlyFee:
            String(course.fee),

          discount:
            String(
              normalizedPlan.discount
            ),

          finalAmount:
            String(amountInRupees),

          source: "IndiaPostExam",
        },
      });

    // ------------------------------------------------
    // SERVER LOG
    // ------------------------------------------------

    console.log(
      "Razorpay order created:",
      {
        orderId: order.id,

        courseId: course.id,

        planId: normalizedPlan.id,

        durationMonths:
          normalizedPlan.durationMonths,

        monthlyFee: course.fee,

        discount:
          normalizedPlan.discount,

        amount:
          amountInRupees,
      }
    );

    // ------------------------------------------------
    // RETURN RESPONSE
    // ------------------------------------------------

    return NextResponse.json({
      success: true,

      order: {
        id: order.id,

        amount: order.amount,

        currency: order.currency,
      },

      course: {
        id: course.id,

        title: course.title,

        monthlyFee: course.fee,
      },

      plan: {
        id: normalizedPlan.id,

        durationMonths:
          normalizedPlan.durationMonths,

        discount:
          normalizedPlan.discount,

        amount:
          amountInRupees,
      },

      keyId,
    });
  } catch (error) {
    console.error(
      "Razorpay order creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create Razorpay order.",
      },
      { status: 500 }
    );
  }
}