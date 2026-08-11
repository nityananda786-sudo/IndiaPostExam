"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import StudyMaterials from "@/components/course-content/StudyMaterials";
import { getCourseMaterials } from "@/components/course-content/courseMaterials";

type CourseInfo = {
  id: string;
  title: string;
  fee: number;
  description: string;
};

type SubscriptionPlanId =
  | "monthly"
  | "six_month"
  | "yearly";

type SubscriptionInfo = {
  planId?: string;
  durationMonths?: number;
  amount?: number;
  startsAt?: Date;
  expiresAt?: Date;
};

const courses: Record<string, CourseInfo> = {
  "gds-mts": {
    id: "gds-mts",
    title: "GDS → MTS",
    fee: 299,
    description:
      "Structured preparation for GDS Aspirants targeting the MTS promotion examination.",
  },

  "gds-postman": {
    id: "gds-postman",
    title: "GDS → Postman / Mail Guard",
    fee: 499,
    description:
      "Focused preparation for GDS Aspirants preparing for Postman and Mail Guard promotion.",
  },

  "postal-assistant": {
  id: "postal-assistant",
  title: "Postal Assistant / Sorting Assistant",
  fee: 599,
  description:
    "Comprehensive preparation resources for Postal Assistant and Sorting Assistant examinations.",
},

  "inspector-posts": {
    id: "inspector-posts",
    title: "Inspector Posts",
    fee: 799,
    description:
      "Dedicated preparation resources for Inspector Posts examination.",
  },

  "pss-group-b": {
    id: "pss-group-b",
    title: "PSS Group B",
    fee: 999,
    description:
      "Specialized preparation resources for PSS Group B examination.",
  },
};

function convertFirestoreDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as { toDate?: unknown }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    ).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getDaysRemaining(
  expiryDate: Date
): number {
  const difference =
    expiryDate.getTime() -
    Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
}

/* -------------------------------------------------
   PLAN PRICE CALCULATION
------------------------------------------------- */

function calculatePlanPrice(
  monthlyFee: number,
  planId: SubscriptionPlanId
): number {
  let durationMonths = 1;
  let discount = 0;

  if (planId === "six_month") {
    durationMonths = 6;
    discount = 0.20;
  }

  if (planId === "yearly") {
    durationMonths = 12;
    discount = 0.30;
  }

  return Math.round(
    monthlyFee *
      durationMonths *
      (1 - discount)
  );
}

/* -------------------------------------------------
   PLAN SELECTOR
------------------------------------------------- */

function SubscriptionPlanSelector({
  monthlyFee,
  selectedPlan,
  onPlanChange,
}: {
  monthlyFee: number;
  selectedPlan: SubscriptionPlanId;
  onPlanChange: (
    planId: SubscriptionPlanId
  ) => void;
}) {
  const plans = [
    {
      id: "monthly" as SubscriptionPlanId,
      title: "1 Month",
      duration: "1 month access",
      discount: "",
    },
    {
      id: "six_month" as SubscriptionPlanId,
      title: "6 Months",
      duration: "6 months access",
      discount: "Save 20%",
    },
    {
      id: "yearly" as SubscriptionPlanId,
      title: "1 Year",
      duration: "12 months access",
      discount: "Save 30%",
    },
  ];

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-extrabold text-[#12366f]">
        Choose your access plan
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const selected =
            selectedPlan === plan.id;

          const price =
            calculatePlanPrice(
              monthlyFee,
              plan.id
            );

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() =>
                onPlanChange(plan.id)
              }
              className={`relative rounded-xl border-2 p-4 text-left transition ${
                selected
                  ? "border-red-600 bg-red-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-red-300"
              }`}
            >
              {plan.discount && (
                <span className="absolute right-2 top-2 rounded-full bg-green-100 px-2 py-1 text-[10px] font-extrabold text-green-700">
                  {plan.discount}
                </span>
              )}

              <div className="pr-12 text-sm font-extrabold text-[#12366f]">
                {plan.title}
              </div>

              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                ₹{price}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {plan.duration}
              </div>

              {selected && (
                <div className="mt-3 text-xs font-extrabold text-red-600">
                  ✓ Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------
   PURCHASE PANEL
------------------------------------------------- */

function PurchasePanel({
  course,
  buttonText,
  compact = false,
  subscription = null,
}: {
  course: CourseInfo;
  buttonText: string;
  compact?: boolean;
  subscription?: SubscriptionInfo | null;
}) {

  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlanId>("monthly");

  const [loading, setLoading] =
    useState(false);

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const selectedPrice =
    calculatePlanPrice(
      course.fee,
      selectedPlan
    );

  const selectedPlanName =
    selectedPlan === "monthly"
      ? "1 Month"
      : selectedPlan === "six_month"
      ? "6 Months"
      : "1 Year";

  const handlePurchase = async () => {
    try {
      setLoading(true);

      // -----------------------------------------
      // 1. Check logged-in user
      // -----------------------------------------

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "Please log in before completing the purchase."
        );
      }

      // -----------------------------------------
      // 2. Load Razorpay Checkout
      // -----------------------------------------

      const existingScript =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

      if (!existingScript) {
        const script =
          document.createElement("script");

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;

        document.body.appendChild(script);

        await new Promise<void>(
          (resolve, reject) => {
            script.onload = () =>
              resolve();

            script.onerror = () =>
              reject(
                new Error(
                  "Unable to load Razorpay Checkout."
                )
              );
          }
        );
      }

      // -----------------------------------------
      // 3. Get Firebase ID token
      // -----------------------------------------

      const idToken =
        await currentUser.getIdToken();

      // -----------------------------------------
      // 4. Create Razorpay order
      // -----------------------------------------

      const response =
        await fetch(
          "/api/razorpay/create-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body: JSON.stringify({
              courseId: course.id,
              planId: selectedPlan,
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
      // 5. Razorpay constructor
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
      // 6. Razorpay Checkout options
      // -----------------------------------------

      const options = {
        key: data.keyId,

        amount:
          data.order.amount,

        currency:
          data.order.currency,

        name: "IndiaPostExam",

        description:
          `${course.title} - ${selectedPlanName}`,

        order_id:
          data.order.id,

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
              // 7. Verify payment
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
                      courseId:
                        course.id,

                      planId:
                        selectedPlan,

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
              // 8. Show success panel
              // ---------------------------------

              setPaymentSuccess(true);

              setLoading(false);

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

        prefill: {
          name:
            currentUser.displayName ||
            "",

          email:
            currentUser.email ||
            "",
        },

        notes: {
          courseId:
            course.id,

          planId:
            selectedPlan,

          source:
            "IndiaPostExam",
        },

        theme: {
          color: "#dc2626",
        },

        modal: {
          ondismiss:
            function () {
              setLoading(false);
            },
        },
      };

      // -----------------------------------------
      // 9. Open Razorpay
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

  return (
  <div className={compact ? "" : "mt-8"}>

    {/* =====================================================
        PAYMENT SUCCESS
    ===================================================== */}

    {paymentSuccess ? (
      <div
        className={
          compact
            ? "rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm sm:p-6"
            : "mb-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm"
        }
      >
        <div className="text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            🎉
          </div>

          <h2 className="mt-3 text-2xl font-black text-green-800">
            Payment Successful!
          </h2>

          <p className="mt-1 text-sm text-green-700">
            Your course subscription has been successfully updated.
          </p>

          <div className="mx-auto mt-5 max-w-md rounded-2xl bg-white p-5 text-left shadow-sm">

            <p className="text-xs font-medium text-slate-500">
              Course
            </p>

            <p className="mt-1 font-black text-[#12366f]">
              {course.title}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">

              <div>
                <p className="text-xs text-slate-500">
                  Plan Purchased
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  {selectedPlanName}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Amount Paid
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  ₹{selectedPrice}
                </p>
              </div>

            </div>

            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">

              <p className="text-sm font-black text-emerald-700">
                ✓ Payment verified successfully
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-600">
                Your course access has been updated.
              </p>

              <p className="text-xs leading-5 text-emerald-600">
                Any remaining access period has been preserved.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-red-600 px-7 py-3 text-sm font-black text-white shadow-md transition hover:bg-red-700"
          >
            Continue to Course →
          </button>

        </div>
      </div>

    ) : compact ? (

      /* =====================================================
         COMPACT ACTIVE-COURSE RENEWAL PANEL
      ===================================================== */

      <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-5">

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr_1.45fr_1fr] lg:items-center">

          {/* ACCESS */}

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl">
              🎓
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                Course Access
              </p>

              <p className="mt-0.5 flex items-center gap-1.5 text-xl font-black text-emerald-600">
                <span>✓</span>
                Active
              </p>
            </div>

          </div>


          {/* VALIDITY */}

          <div className="border-slate-200 lg:border-l lg:pl-5">

            <p className="text-xs font-medium text-slate-500">
              Valid until
            </p>

            <p className="mt-1 text-lg font-black text-[#102f63]">
              {subscription?.expiresAt
                ? formatDate(subscription.expiresAt)
                : "—"}
            </p>

            <p className="mt-0.5 text-sm font-bold text-emerald-600">
              {subscription?.expiresAt
                ? `${getDaysRemaining(subscription.expiresAt)} days remaining`
                : ""}
            </p>

          </div>


          {/* PLANS */}

          <div className="border-slate-200 lg:border-l lg:pl-5">

            <p className="mb-2 text-xs font-medium text-slate-500">
              Choose plan
            </p>

            <div className="grid grid-cols-3 gap-2">

              {/* 1 MONTH */}

              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  selectedPlan === "monthly"
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >

                <span className="font-bold text-[#102f63]">
                  1M
                </span>

                <p className="mt-1 text-base font-black text-[#102f63]">
                  ₹{calculatePlanPrice(course.fee, "monthly")}
                </p>

                {selectedPlan === "monthly" && (
                  <p className="text-[10px] font-bold text-red-600">
                    ✓ Selected
                  </p>
                )}

              </button>


              {/* 6 MONTHS */}

              <button
                type="button"
                onClick={() => setSelectedPlan("six_month")}
                className={`relative rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  selectedPlan === "six_month"
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >

                <span className="absolute right-1.5 top-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                  -20%
                </span>

                <span className="font-bold text-[#102f63]">
                  6M
                </span>

                <p className="mt-1 text-base font-black text-[#102f63]">
                  ₹{calculatePlanPrice(course.fee, "six_month")}
                </p>

                {selectedPlan === "six_month" && (
                  <p className="text-[10px] font-bold text-red-600">
                    ✓ Selected
                  </p>
                )}

              </button>


              {/* 1 YEAR */}

              <button
                type="button"
                onClick={() => setSelectedPlan("yearly")}
                className={`relative rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  selectedPlan === "yearly"
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >

                <span className="absolute right-1.5 top-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                  -30%
                </span>

                <span className="font-bold text-[#102f63]">
                  1Y
                </span>

                <p className="mt-1 text-base font-black text-[#102f63]">
                  ₹{calculatePlanPrice(course.fee, "yearly")}
                </p>

                {selectedPlan === "yearly" && (
                  <p className="text-[10px] font-bold text-red-600">
                    ✓ Selected
                  </p>
                )}

              </button>

            </div>

          </div>


          {/* RENEW BUTTON */}

          <div className="lg:border-l lg:pl-5">

            <button
              type="button"
              onClick={handlePurchase}
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Opening Payment..."
                : `↻ Renew in Advance — ₹${selectedPrice}`}
            </button>

            <p className="mt-2 text-center text-[10px] text-slate-500">
              🔒 Secure payment via Razorpay
            </p>

          </div>

        </div>

      </div>

    ) : (

      /* =====================================================
         NORMAL PURCHASE / EXPIRED COURSE
      ===================================================== */

      <>
        <SubscriptionPlanSelector
          monthlyFee={course.fee}
          selectedPlan={selectedPlan}
          onPlanChange={setSelectedPlan}
        />

        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-center">

          <span className="text-sm text-slate-500">
            Selected plan:
          </span>

          <span className="ml-2 font-extrabold text-[#12366f]">
            {selectedPlanName}
          </span>

        </div>

        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-red-600 px-6 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Opening Payment..."
            : `${buttonText} — ₹${selectedPrice}`}
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          🔒 Secure payment through Razorpay
        </p>
      </>

    )}

  </div>
);
}

function LearningCard({
  icon,
  title,
  description,
  button,
  badge,
  iconClass,
}: {
  icon: string;
  title: string;
  description: string;
  button: string;
  badge: string;
  iconClass: string;
}) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">

      {/* Top row */}
      <div className="flex items-start justify-between gap-4">

        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${iconClass}`}
        >
          {icon}
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {badge}
        </span>

      </div>

      {/* Title */}
      <h3 className="mt-5 text-xl font-black text-[#102f63]">
        {title}
      </h3>

      {/* Description */}
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
        {description}
      </p>

      {/* Button */}
      <button
        type="button"
        disabled
        className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500"
      >
        {button} →
      </button>

    </div>
  );
}




export default function ProtectedCoursePage() {
  const params = useParams();
  const router = useRouter();

  const courseId =
    params.courseId as string;

  const [loading, setLoading] =
    useState(true);

  const [hasAccess, setHasAccess] =
    useState(false);

  const [isExpired, setIsExpired] =
    useState(false);

  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(
      null
    );

  const [error, setError] =
    useState("");

  const course =
    courses[courseId];

  /* -------------------------------------------------
     CHECK AUTHENTICATION + PURCHASE
  ------------------------------------------------- */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!currentUser) {
            router.replace("/login");
            return;
          }

          try {
            const purchasesQuery =
              query(
                collection(
                  db,
                  "purchases"
                ),
                where(
                  "uid",
                  "==",
                  currentUser.uid
                ),
                where(
                  "courseId",
                  "==",
                  courseId
                )
              );

            const snapshot =
              await getDocs(
                purchasesQuery
              );

            let latestActiveExpiry:
              Date | null = null;

            let latestExpiredExpiry:
              Date | null = null;

            let latestSubscription:
              SubscriptionInfo | null =
              null;

            for (
              const purchaseDoc of
                snapshot.docs
            ) {
              const purchase =
                purchaseDoc.data();

              if (
                purchase.status !==
                "paid"
              ) {
                continue;
              }

              const expiryDate =
                convertFirestoreDate(
                  purchase.expiresAt
                );

              const startDate =
                convertFirestoreDate(
                  purchase.startsAt
                );

              if (!expiryDate) {
                continue;
              }

              const candidate: SubscriptionInfo =
                {
                  planId:
                    purchase.planId,

                  durationMonths:
                    purchase.durationMonths,

                  amount:
                    purchase.amount,

                  startsAt:
                    startDate ??
                    undefined,

                  expiresAt:
                    expiryDate,
                };

              if (
                expiryDate.getTime() >
                Date.now()
              ) {
                if (
                  !latestActiveExpiry ||
                  expiryDate.getTime() >
                    latestActiveExpiry.getTime()
                ) {
                  latestActiveExpiry =
                    expiryDate;

                  latestSubscription =
                    candidate;
                }
              } else {
                if (
                  !latestExpiredExpiry ||
                  expiryDate.getTime() >
                    latestExpiredExpiry.getTime()
                ) {
                  latestExpiredExpiry =
                    expiryDate;
                }
              }
            }

            if (
              latestActiveExpiry &&
              latestSubscription
            ) {
              setHasAccess(true);
              setIsExpired(false);

              setSubscription(
                latestSubscription
              );
            } else if (
              latestExpiredExpiry
            ) {
              setHasAccess(false);
              setIsExpired(true);

              setSubscription({
                expiresAt:
                  latestExpiredExpiry,
              });
            } else {
              setHasAccess(false);
              setIsExpired(false);
              setSubscription(null);
            }
          } catch (err) {
            console.error(
              "Unable to verify course access:",
              err
            );

            setError(
              "Unable to verify your course access."
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () =>
      unsubscribe();
  }, [courseId, router]);

  /* -------------------------------------------------
     COURSE NOT FOUND
  ------------------------------------------------- */

  if (!course) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-sm">

          <h1 className="text-3xl font-extrabold text-[#12366f]">
            Course Not Found
          </h1>

          <p className="mt-3 text-slate-600">
            The course you are looking for
            does not exist.
          </p>

          <button
            onClick={() =>
              router.push("/courses")
            }
            className="mt-6 rounded-xl bg-[#12366f] px-6 py-3 font-bold text-white"
          >
            ← Back to Courses
          </button>

        </div>
      </main>
    );
  }

  const studyMaterials =
  getCourseMaterials(course.id);

  /* -------------------------------------------------
     LOADING
  ------------------------------------------------- */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#12366f]" />

          <p className="mt-4 font-semibold text-slate-600">
            Verifying your course access...
          </p>

        </div>
      </main>
    );
  }

  /* -------------------------------------------------
     ERROR
  ------------------------------------------------- */

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-lg">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#12366f]">
            Unable to Verify Access
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-[#12366f] px-6 py-3 font-bold text-white"
          >
            Try Again
          </button>

        </div>
      </main>
    );
  }

  /* -------------------------------------------------
     EXPIRED
  ------------------------------------------------- */

  if (isExpired) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">

        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-lg md:p-10">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
            🔒
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-[#12366f]">
            Course Access Expired
          </h1>

          <p className="mt-3 text-slate-600">
            Your access to this course has expired.
          </p>

          {subscription?.expiresAt && (
            <div className="mx-auto mt-5 max-w-md rounded-xl bg-red-50 p-5">

              <p className="text-sm font-semibold text-red-700">
                Your access expired on
              </p>

              <p className="mt-1 text-xl font-extrabold text-red-600">
                {formatDate(
                  subscription.expiresAt
                )}
              </p>

            </div>
          )}

          <h2 className="mt-7 text-2xl font-extrabold">
            {course.title}
          </h2>

          <p className="mt-2 text-slate-500">
            {course.description}
          </p>

          <PurchasePanel
            course={course}
            buttonText="Renew Course"
          />

          <button
            onClick={() =>
              router.push("/courses")
            }
            className="mt-4 text-sm font-bold text-slate-500 hover:text-red-600"
          >
            ← Back to Courses
          </button>

        </div>

      </main>
    );
  }

  /* -------------------------------------------------
     NO PURCHASE
  ------------------------------------------------- */

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">

        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-lg md:p-10">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">
            🔒
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-[#12366f]">
            Course Access Required
          </h1>

          <p className="mt-3 text-slate-600">
            You have not purchased this course yet.
          </p>

          <h2 className="mt-6 text-2xl font-extrabold">
            {course.title}
          </h2>

          <p className="mt-2 text-slate-500">
            {course.description}
          </p>

          <PurchasePanel
            course={course}
            buttonText="Purchase Course"
          />

          <button
            onClick={() =>
              router.push("/courses")
            }
            className="mt-4 text-sm font-bold text-slate-500 hover:text-red-600"
          >
            ← Back to Courses
          </button>

        </div>

      </main>
    );
  }

 

  return (
  <main className="min-h-screen bg-slate-50">

    {/* =====================================================
        COURSE HEADER
    ===================================================== */}
    <section className="bg-gradient-to-r from-[#123b78] to-[#092b61] text-white">

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">

        {/* Back */}
        <Link
          href="/courses"
          className="mb-4 inline-flex items-center text-sm font-semibold text-white/90 transition hover:text-white"
        >
          ← Back to Courses
        </Link>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.25em] text-red-300">
              INDIAPOSTEXAM
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              {course.description}
            </p>
          </div>

          {/* Access badge */}
          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">

            <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />

            <div>
              <p className="text-[11px] uppercase tracking-wide text-white/60">
                Course Access
              </p>

              <p className="text-base font-bold text-white">
                Active
              </p>
            </div>

          </div>

        </div>

      </div>

    </section>


    {/* =====================================================
    COURSE ACCESS / RENEWAL
===================================================== */}

<section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">

  <PurchasePanel
    course={course}
    buttonText="Renew in Advance"
    compact
    subscription={subscription}
  />

</section>


    {/* =====================================================
        LEARNING CENTRE
    ===================================================== */}
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">

      {/* Heading */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <span className="h-8 w-1.5 rounded-full bg-red-600" />

            <h2 className="text-3xl font-black tracking-tight text-[#102f63]">
              Learning Centre
            </h2>

          </div>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Access your course resources and practice tools.
          </p>

        </div>


        {/* Progress */}
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm">

          <span className="text-blue-600">
            ▥
          </span>

          <span className="font-semibold text-slate-600">
            Progress
          </span>

          <strong className="text-lg text-[#102f63]">
            0%
          </strong>

        </div>

      </div>


      {/* =====================================================
          RESOURCE CARDS
      ===================================================== */}
      <div className="grid gap-5 md:grid-cols-3">


        {/* STUDY MATERIALS */}
        <div className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">

  <div className="flex items-start justify-between gap-4">

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
      📖
    </div>

    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      Available
    </span>

  </div>

  <h3 className="mt-5 text-xl font-black text-[#102f63]">
    Study Materials
  </h3>

  <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
    Access your subject-wise notes, PDFs and other preparation
    materials.
  </p>

  <button
    type="button"
    onClick={() => {
      document
        .getElementById("study-materials")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }}
    className="mt-5 w-full rounded-xl bg-[#123b78] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#092b61]"
  >
    Open Materials →
  </button>

</div>


        {/* MOCK TESTS */}
        <LearningCard
          icon="☑"
          title="Mock Tests"
          description="Attempt online mock examinations and evaluate your preparation."
          button="Start Mock Test"
          badge="Coming Soon"
          iconClass="bg-purple-50 text-purple-600"
        />


        {/* PREVIOUS QUESTIONS */}
        <LearningCard
          icon="▤"
          title="Previous Questions"
          description="Practice questions from previous examinations and understand the examination pattern."
          button="View Questions"
          badge="Coming Soon"
          iconClass="bg-orange-50 text-orange-500"
        />

      </div>
      
{/* =====================================================
    STUDY MATERIALS CONTENT
===================================================== */}

<div
  id="study-materials"
  className="mt-10 scroll-mt-6"
>
  {studyMaterials ? (
    <StudyMaterials
      course={studyMaterials}
    />
  ) : (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-10">

      <div className="text-4xl">
        📚
      </div>

      <h3 className="mt-4 text-xl font-black text-[#102f63]">
        Study Materials Coming Soon
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Study materials for this course are being prepared
        and will be available here soon.
      </p>

    </div>
  )}
</div>

      {/* =====================================================
          PROTECTION NOTICE
      ===================================================== */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm text-blue-700">

        🛡️
        <span className="ml-2">
          Your access is protected. All learning resources will be
          added progressively to this dashboard.
        </span>

      </div>

    </section>

  </main>
);
}