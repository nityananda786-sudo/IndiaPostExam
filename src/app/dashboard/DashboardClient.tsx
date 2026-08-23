"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { courses } from "@/components/featured-courses/courseData";

type UserProfile = {
  email?: string;
  role?: string;
  subscription?: string;
  name?: string;
  mobile?: string;
};

type PurchasedCourse = {
  id: string;
  title: string;
  fee?: number;
  expiresAt?: Date;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          window.location.href = "/login";
          return;
        }

        setUser(currentUser);

        try {
          /*
           * -----------------------------------------
           * LOAD ASPIRANT PROFILE
           * -----------------------------------------
           */
          const userRef = doc(
            db,
            "users",
            currentUser.uid
          );

          const profileSnapshot = await getDoc(userRef);

          if (profileSnapshot.exists()) {
            setProfile(
              profileSnapshot.data() as UserProfile
            );
          }

          /*
           * -----------------------------------------
           * LOAD CONFIRMED ACTIVE PURCHASES
           * -----------------------------------------
           *
           * Only:
           * status = paid
           * AND
           * expiresAt > current time
           */
          const purchasesQuery = query(
            collection(db, "purchases"),
            where("uid", "==", currentUser.uid)
          );

          const purchasesSnapshot =
            await getDocs(purchasesQuery);

          const now = new Date();

          const activePurchases = purchasesSnapshot.docs
            .map((purchase) => {
              const data = purchase.data();

              if (data.status !== "paid") {
                return null;
              }

              if (!data.expiresAt) {
                return null;
              }

              let expiryDate: Date | null = null;

              if (
                typeof data.expiresAt?.toDate ===
                "function"
              ) {
                expiryDate =
                  data.expiresAt.toDate();
              } else if (
                data.expiresAt instanceof Date
              ) {
                expiryDate =
                  data.expiresAt;
              } else if (
                typeof data.expiresAt === "string" ||
                typeof data.expiresAt === "number"
              ) {
                expiryDate =
                  new Date(data.expiresAt);
              }

              if (
                !expiryDate ||
                Number.isNaN(
                  expiryDate.getTime()
                )
              ) {
                return null;
              }

              if (expiryDate <= now) {
                return null;
              }

              const courseId =
                data.courseId;

              if (
                typeof courseId !== "string" ||
                !courseId
              ) {
                return null;
              }

              return {
                courseId,
                expiryDate,
              };
            })
            .filter(
              (
                purchase
              ): purchase is {
                courseId: string;
                expiryDate: Date;
              } => purchase !== null
            );

          /*
           * Remove duplicate course IDs.
           */
          const uniquePurchases = Array.from(
            new Map(
              activePurchases.map(
                (purchase) => [
                  purchase.courseId,
                  purchase,
                ]
              )
            ).values()
          );

          /*
           * -----------------------------------------
           * MATCH PURCHASES WITH COURSE CATALOGUE
           * -----------------------------------------
           *
           * Courses are maintained in the existing
           * courseData.ts catalogue, not Firestore.
           *
           * Therefore we do NOT make extra Firestore
           * requests for course documents here.
           */
          const matchedCourses: Array<PurchasedCourse | null> =
            uniquePurchases.map((purchase) => {
              const course = courses.find(
                (item) =>
                  item.id === purchase.courseId
              );

              if (!course) {
                return null;
              }

              return {
                id: course.id,
                title: course.title,
                fee: course.fee,
                expiresAt: purchase.expiryDate,
              };
            });

          const validCourses: PurchasedCourse[] =
            matchedCourses.filter(
              (course) => course !== null
            ) as PurchasedCourse[];

          setPurchasedCourses(validCourses);
        } catch (err) {
          console.error(
            "Unable to load dashboard:",
            err
          );

          setError(
            err instanceof Error
              ? `Dashboard error: ${err.message}`
              : "Unable to load your dashboard."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />

          <p className="font-semibold text-gray-700">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <Link href="/">
            <img
              src="/logo/logo.png"
              alt="IndiaPostExam"
              className="h-12 w-auto object-contain sm:h-16"
            />
          </Link>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#101a35]">
                {profile?.email || user?.email}
              </p>

              <p className="text-xs text-gray-500">
                Aspirant
              </p>
            </div>

            <button
              onClick={async () => {
                await auth.signOut();
                window.location.href = "/login";
              }}
              className="rounded-xl border border-red-600 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 sm:px-4 sm:text-sm"
            >
              Logout
            </button>

          </div>

        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* WELCOME */}
        <div className="rounded-3xl bg-gradient-to-r from-[#12366f] to-[#d71920] p-6 text-white shadow-lg sm:p-9">

          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/80">
            IndiaPostExam
          </p>

          <h1 className="text-2xl font-extrabold sm:text-4xl">
            Welcome to your learning space.
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:mt-3 sm:text-base">
            Access your account and purchased courses from one place.
          </p>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* PRIMARY DASHBOARD CARDS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          {/* MY ACCOUNT */}
          <Link
            href="/profile"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg sm:p-6"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-black text-blue-700">
              A
            </div>

            <p className="text-sm font-semibold text-gray-500">
              My Account
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-[#101a35]">
              Account & Profile
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              View and manage your personal account and profile information.
            </p>

            <p className="mt-4 text-sm font-extrabold text-[#12366f]">
              View Account →
            </p>
          </Link>

          {/* MY COURSES */}
          <Link
            href="/courses"
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg sm:p-6"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl font-black text-red-700">
              C
            </div>

            <p className="text-sm font-semibold text-gray-500">
              My Courses
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-[#101a35]">
              Explore Courses
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Browse all available IndiaPostExam courses and purchase the one you need.
            </p>

            <p className="mt-4 text-sm font-extrabold text-red-600">
              Explore Courses →
            </p>
          </Link>

        </div>

        {/* PURCHASED COURSES */}
        <div className="mt-10">

          {/* SECTION HEADING */}
          <div className="mx-auto max-w-4xl text-center">

            <div className="mb-2 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-red-200 sm:w-16" />

              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-red-600">
                Your Learning
              </p>

              <span className="h-px w-10 bg-red-200 sm:w-16" />
            </div>

            <h2 className="text-2xl font-extrabold text-[#101a35] sm:text-3xl">
              Purchased Courses
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your active courses are ready for preparation.
            </p>

          </div>

          {/* COURSE AREA */}
          <div className="mx-auto mt-6 max-w-5xl">

            {purchasedCourses.length === 0 ? (

              <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center shadow-sm sm:px-8">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-[#12366f]">
                  C
                </div>

                <h3 className="mt-4 text-lg font-extrabold text-[#101a35]">
                  No active course yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Purchase a course to get direct access to your preparation
                  materials, practice quizzes and mock tests.
                </p>

                <Link
                  href="/courses"
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#12366f] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0e2c5c]"
                >
                  Browse Courses →
                </Link>

              </div>

            ) : (

              <div className="space-y-5">

                {purchasedCourses.map((course) => (

                  <div
                    key={course.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                  >

                    {/* COURSE TOP */}
                    <div className="bg-gradient-to-r from-[#12366f] via-[#243f78] to-[#d71920] px-5 py-5 text-white sm:px-7">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="min-w-0">

                          <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
                            ✓ Purchase Confirmed
                          </div>

                          <h3 className="mt-3 text-xl font-extrabold leading-7 sm:text-2xl">
                            {course.title}
                          </h3>

                          {course.expiresAt && (
                            <p className="mt-1.5 text-xs font-semibold text-white/80 sm:text-sm">
                              Access valid until{" "}
                              {course.expiresAt.toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          )}

                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#12366f] shadow-sm">
                          OK
                        </div>

                      </div>

                    </div>

                    {/* COURSE CONTENT */}
                    <div className="p-5 sm:p-7">

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                            SM
                          </div>
                          <p className="mt-2 text-xs font-extrabold text-[#101a35]">
                            Study Materials
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Read & Download
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-xs font-black text-red-700">
                            PQ
                          </div>
                          <p className="mt-2 text-xs font-extrabold text-[#101a35]">
                            Practice Quiz
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Chapter-wise
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-xs font-black text-purple-700">
                            MT
                          </div>
                          <p className="mt-2 text-xs font-extrabold text-[#101a35]">
                            Mock Tests
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Exam Practice
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-700">
                            PYQ
                          </div>
                          <p className="mt-2 text-xs font-extrabold text-[#101a35]">
                            Previous Year
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Questions
                          </p>
                        </div>

                      </div>

                      {/* ACCESS BUTTON */}
                      <Link
                        href={`/courses/${course.id}`}
                        className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#12366f] px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0e2c5c] sm:text-base"
                      >
                        Access Course →
                      </Link>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>
      </section>

    </main>
  );
}






