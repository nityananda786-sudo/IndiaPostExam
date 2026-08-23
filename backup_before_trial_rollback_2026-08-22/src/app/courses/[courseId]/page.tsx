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
import SubscriptionPlanSelector from "@/components/courses/SubscriptionPlanSelector";
import StudyMaterials from "@/components/course-content/StudyMaterials";
import PurchasePanel from "@/components/courses/PurchasePanel";
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

  const [trialActive, setTrialActive] =
    useState(false);

  const [trialExpiresAt, setTrialExpiresAt] =
    useState<Date | null>(null);

  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(
      null
    );

  const [error, setError] =
    useState("");

  const course =
    courses[courseId];
  /* -------------------------------------------------
     CHECK AUTHENTICATION + COURSE ACCESS
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
            setError("");

            const token =
              await currentUser.getIdToken();

            const response =
              await fetch(
                `/api/courses/${encodeURIComponent(courseId)}/access`,
                {
                  method: "GET",
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  cache: "no-store",
                }
              );

            const data =
              await response.json();

            if (!response.ok || !data.success) {
              throw new Error(
                data?.error ||
                  "Unable to verify your course access."
              );
            }

            setHasAccess(
              Boolean(data.hasAccess)
            );

            setTrialActive(
              data.accessType === "trial"
            );

            setTrialExpiresAt(
              data.trialExpiresAt
                ? new Date(data.trialExpiresAt)
                : null
            );

            if (
              data.accessType === "paid"
            ) {
              setIsExpired(false);

              setSubscription({
                expiresAt:
                  data.expiresAt
                    ? new Date(data.expiresAt)
                    : undefined,
              });

              return;
            }

            if (
              data.accessType === "trial"
            ) {
              setIsExpired(false);
              setSubscription(null);
              return;
            }

            setTrialActive(false);
            setTrialExpiresAt(null);

            if (
              data.reason ===
              "trial_expired"
            ) {
              setIsExpired(true);

              setSubscription(
                data.trialExpiresAt
                  ? {
                      expiresAt:
                        new Date(
                          data.trialExpiresAt
                        ),
                    }
                  : null
              );
            } else {
              setIsExpired(false);
              setSubscription(null);
            }

          } catch (err) {
            console.error(
              "Unable to verify course access:",
              err
            );

            setError(
              err instanceof Error
                ? err.message
                : "Unable to verify your course access."
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
            ⚠
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

          <span className="font-semibold text-slate-600">
            Progress
          </span>

          <strong className="text-lg text-[#102f63]">
            0%
          </strong>

        </div>

      </div>


      {/* RESOURCE CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {/* PRACTICE QUIZ � PRIMARY */}
        <div className="group rounded-3xl border-2 border-blue-100 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">

          <div className="flex items-center justify-between">

            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              Practice
            </span>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              Available
            </span>

          </div>

          <h3 className="mt-5 text-xl font-black text-[#102f63]">
            Practice Quiz
          </h3>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
            Practice questions book-wise and chapter-wise with instant
            answer feedback and detailed results.
          </p>

          <Link
            href="/quiz"
            className="mt-5 block w-full rounded-xl bg-[#123b78] px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-[#092b61]"
          >
            Start Practice ?
          </Link>

        </div>


        {/* MOCK TESTS */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">

          <div className="flex items-center justify-between">

            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
              Examination
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              Coming Soon
            </span>

          </div>

          <h3 className="mt-5 text-xl font-black text-[#102f63]">
            Mock Tests
          </h3>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
            Attempt full-length mock examinations with 15 questions
            and get your result after submission.
          </p>

          <button
            type="button"
            disabled
            className="mt-5 block w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-extrabold text-slate-500"
          >
            Start Mock Test
          </button>

        </div>


        {/* PREVIOUS YEAR QUESTIONS */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">

          <div className="flex items-center justify-between">

            <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600">
              Previous Papers
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              Coming Soon
            </span>

          </div>

          <h3 className="mt-5 text-xl font-black text-[#102f63]">
            Previous Year Questions
          </h3>

          <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
            Practice questions from previous examinations and understand
            the examination pattern.
          </p>

          <button
            type="button"
            disabled
            className="mt-5 block w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-extrabold text-slate-500"
          >
            View Questions
          </button>

        </div>

      </div>


      {/* STUDY MATERIALS */}
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

            <h3 className="text-xl font-black text-[#102f63]">
              Study Materials Coming Soon
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Study materials for this course are being prepared
              and will be available here soon.
            </p>

          </div>

        )}

      </div>


      {/* ACCESS NOTICE */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-center text-sm font-semibold text-blue-700">
        Your course access is protected. Learning resources will be
        added progressively to this course workspace.
      </div>

    </section>

  </main>
);
}









