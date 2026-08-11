import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // IMPORTANT:
    // Razorpay signature verification requires the RAW request body.
    const rawBody = await request.text();

    const receivedSignature =
      request.headers.get("x-razorpay-signature");

    const eventId =
      request.headers.get("x-razorpay-event-id");

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 500 }
      );
    }

    if (!receivedSignature) {
      return NextResponse.json(
        { error: "Missing Razorpay signature" },
        { status: 400 }
      );
    }

    // Create our expected signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Safely compare signatures
    const receivedBuffer = Buffer.from(
      receivedSignature,
      "utf8"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      console.error("Invalid Razorpay webhook signature.");

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Signature is valid.
    // Now it is safe to parse the webhook.
    const payload = JSON.parse(rawBody);

    const event = payload?.event;

    console.log("Razorpay webhook received:", {
      event,
      eventId,
    });

    /*
     * We are NOT updating Firestore yet.
     *
     * First we will build the Razorpay Order API and
     * individual course purchase system.
     *
     * After that, this webhook will:
     *
     * 1. Identify the course
     * 2. Identify the Aspirant
     * 3. Confirm the payment
     * 4. Create the purchase record
     * 5. Unlock that particular course
     */

    return NextResponse.json(
      {
        success: true,
        received: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Razorpay webhook processing error:",
      error
    );

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}