"use client";

import { useState } from "react";
import Link from "next/link";
import {
  subscriptionPlans,
  calculatePlanPrice,
  type SubscriptionPlanId,
} from "@/config/subscriptionPlans";

export default function BuyCourseButton({
  courseId,
  courseName,
  fee,
  planId,
}: {
  courseId: string;
  courseName: string;
  fee: number;
  planId: SubscriptionPlanId;
}) {
  const [loading, setLoading] =
    useState(false);

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const [paymentId, setPaymentId] =
    useState("");

  const selectedPlan =
    subscriptionPlans.find(
      (plan) => plan.id === planId
    );

  const selectedPrice =
    selectedPlan
      ? calculatePlanPrice(
          fee,
          selectedPlan
        )
      : fee;

  const selectedPlanName =
    planId === "monthly"
      ? "1 Month"
      : planId === "six_month"
      ? "6 Months"
      : "1 Year";

  const handlePurchase =
    async () => {
      try {
        setLoading(true);

        // -----------------------------------------
        // 1. Load Razorpay Checkout
        // -----------------------------------------

        const existingScript =
          document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          );

        if (!existingScript) {
          const script =
            document.createElement(
              "script"
            );

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.async = true;

          document.body.appendChild(
            script
          );

          await new Promise<void>(
            (
              resolve,
              reject
            ) => {
              script.onload =
                () => resolve();

              script.onerror =
                () =>
                  reject(
                    new Error(
                      "Unable to load Razorpay Checkout."
                    )
                  );
            }
          );
        }

        // -----------------------------------------
        // 2. Create Razorpay order
        // -----------------------------------------

        const response =
          await fetch(
            "/api/razorpay/create-order",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                courseId,
                planId,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to create payment order."
          );
        }

        if (!data?.order?.id) {
          throw new Error(
            "Invalid Razorpay order response."
          );
        }

        // -----------------------------------------
        // 3. Razorpay constructor
        // -----------------------------------------

        const RazorpayConstructor =
          (
            window as unknown as {
              Razorpay: new (
                options: Record<
                  string,
                  unknown
                >
              ) => {
                open: () => void;
              };
            }
          ).Razorpay;

        if (!RazorpayConstructor) {
          throw new Error(
            "Razorpay Checkout could not be initialized."
          );
        }

        // -----------------------------------------
        // 4. Razorpay options
        // -----------------------------------------

        const options = {
          key:
            data.keyId,

          amount:
            data.order.amount,

          currency:
            data.order.currency,

          name:
            "IndiaPostExam",

          description:
            `${courseName} - ${selectedPlanName}`,

          order_id:
            data.order.id,

          prefill: {
            name: "",
            email: "",
          },

          notes: {
            courseId,
            planId,
            source:
              "IndiaPostExam",
          },

          theme: {
            color:
              "#dc2626",
          },

          // ---------------------------------------
          // 5. Payment successful
          // ---------------------------------------

          handler:
            async function (
              paymentResponse: {
                razorpay_payment_id: string;
                razorpay_order_id: string;
                razorpay_signature: string;
              }
            ) {
              try {
                setLoading(true);

                // ---------------------------------
                // Get logged-in user
                // ---------------------------------

                const currentUser =
                  await import(
                    "firebase/auth"
                  ).then(
                    ({
                      getAuth,
                    }) =>
                      getAuth()
                        .currentUser
                  );

                if (!currentUser) {
                  throw new Error(
                    "Please log in before completing the purchase."
                  );
                }

                // ---------------------------------
                // Firebase ID token
                // ---------------------------------

                const idToken =
                  await currentUser.getIdToken();

                // ---------------------------------
                // Verify payment
                // ---------------------------------

                const verificationResponse =
                  await fetch(
                    "/api/razorpay/verify-payment",
                    {
                      method: "POST",

                      headers: {
                        "Content-Type":
                          "application/json",

                        Authorization:
                          `Bearer ${idToken}`,
                      },

                      body: JSON.stringify({
                        courseId,

                        planId,

                        razorpay_payment_id:
                          paymentResponse.razorpay_payment_id,

                        razorpay_order_id:
                          paymentResponse.razorpay_order_id,

                        razorpay_signature:
                          paymentResponse.razorpay_signature,
                      }),
                    }
                  );

                const result =
                  await verificationResponse.json();

                if (
                  !verificationResponse.ok ||
                  !result.success
                ) {
                  throw new Error(
                    result?.error ||
                      "Payment verification failed."
                  );
                }

                console.log(
                  "Payment verified successfully:",
                  result
                );

                // ---------------------------------
                // SAVE PAYMENT SUCCESS
                // ---------------------------------

                setPaymentId(
                  paymentResponse.razorpay_payment_id
                );

                setPaymentSuccess(
                  true
                );

                setLoading(false);

                // Scroll to success message
                setTimeout(() => {
                  document
                    .getElementById(
                      "purchase-success"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                      block:
                        "center",
                    });
                }, 100);

              } catch (error) {
                console.error(
                  "Payment verification error:",
                  error
                );

                alert(
                  error instanceof Error
                    ? error.message
                    : "Payment verification failed."
                );

                setLoading(false);
              }
            },

          // ---------------------------------------
          // Razorpay dismissed
          // ---------------------------------------

          modal: {
            ondismiss:
              function () {
                setLoading(
                  false
                );
              },
          },
        };

        // -----------------------------------------
        // 6. Open Razorpay
        // -----------------------------------------

        const razorpay =
          new RazorpayConstructor(
            options
          );

        razorpay.open();

      } catch (error) {
        console.error(
          "Payment initialization failed:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Unable to start payment."
        );

        setLoading(false);
      }
    };

  // =================================================
  // PAYMENT SUCCESS SCREEN
  // =================================================

  if (paymentSuccess) {
    return (
      <div
        id="purchase-success"
        className="rounded-2xl border border-green-200 bg-green-50 p-5"
      >

        {/* Success icon */}
        <div className="text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
            OK
          </div>

          <h3 className="mt-3 text-xl font-extrabold text-green-800">
            Payment Successful!
          </h3>

          <p className="mt-1 text-sm text-green-700">
            Your course purchase has been
            successfully completed.
          </p>

        </div>

        {/* Details */}
        <div className="mt-5 rounded-xl bg-white p-4">

          {/* Course */}
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Course
            </p>

            <p className="mt-1 font-extrabold text-[#12366f]">
              {courseName}
            </p>
          </div>

          {/* Plan */}
          <div className="mt-4 grid grid-cols-2 gap-4">

            <div>
              <p className="text-xs text-slate-500">
                Plan Purchased
              </p>

              <p className="mt-1 font-extrabold text-slate-800">
                {selectedPlanName}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Amount Paid
              </p>

              <p className="mt-1 font-extrabold text-slate-800">
                ₹{selectedPrice}
              </p>
            </div>

          </div>

          {/* Payment ID */}
          <div className="mt-4">

            <p className="text-xs text-slate-500">
              Razorpay Payment ID
            </p>

            <p className="mt-1 break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
              {paymentId}
            </p>

          </div>

        </div>

        {/* Access confirmation */}
        <div className="mt-4 rounded-xl bg-green-100 p-3 text-center">

          <p className="text-sm font-extrabold text-green-800">
            ✓ Payment verified successfully
          </p>

          <p className="mt-1 text-xs text-green-700">
            Your course access has been activated.
          </p>

        </div>

        {/* Continue */}
        <Link
          href={`/courses/${courseId}`}
          className="mt-4 block w-full rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-extrabold text-white transition hover:bg-red-700"
        >
          Continue to Course →
        </Link>

      </div>
    );
  }
}

