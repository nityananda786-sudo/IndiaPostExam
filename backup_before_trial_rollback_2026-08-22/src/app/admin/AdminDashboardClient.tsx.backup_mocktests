"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function AdminDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // =====================================================
  // ADMIN AUTHENTICATION CHECK
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.replace("/admin/login");
          return;
        }

        setUser(currentUser);
        setCheckingAuth(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await signOut(auth);

      router.replace("/admin/login");
    } catch (error) {
      console.error("Admin logout failed:", error);
      setLoggingOut(false);
    }
  }

  // =====================================================
  // AUTH CHECKING
  // =====================================================

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="flex min-h-screen items-center justify-center px-6">

          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#123b78]" />

            <p className="mt-4 text-sm font-semibold text-slate-500">
              Checking admin access...
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="bg-[#123b78] text-white">

        <div className="mx-auto max-w-7xl px-6 py-8">

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            {/* BRAND / TITLE */}

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                INDIAPOSTEXAM
              </p>

              <h1 className="mt-2 text-3xl font-extrabold">
                Admin Panel
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-blue-100">
                Manage courses, quiz content, study materials and
                examination resources from one place.
              </p>

            </div>


            {/* ADMIN ACCOUNT */}

            <div className="flex items-center gap-3">

              <div className="hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right sm:block">

                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  Logged in as
                </p>

                <p className="mt-1 max-w-[220px] truncate text-sm font-semibold text-white">
                  {user?.email || "Administrator"}
                </p>

              </div>


              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl border border-white/30 bg-white px-5 py-3 text-sm font-extrabold text-[#123b78] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>

            </div>

          </div>

        </div>

      </section>


      {/* =================================================
          MAIN DASHBOARD
      ================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">

          <h2 className="text-2xl font-extrabold text-[#123b78]">
            Administration
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select an area to manage your IndiaPostExam platform.
          </p>

        </div>


        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">


          {/* =================================================
              QUIZ MANAGEMENT
          ================================================= */}

          <Link
            href="/admin/quiz"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50 text-3xl">
              📝
            </div>

            <h3 className="mt-5 text-xl font-extrabold text-[#123b78]">
              Quiz & Question Bank
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage books, chapters, questions and
              15-question practice quiz sets.
            </p>

            <div className="mt-5 font-bold text-red-600">
              Manage Quiz →
            </div>

          </Link>


          {/* =================================================
              STUDY MATERIALS
          ================================================= */}

          <Link
            href="/admin/materials"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-3xl">
              📚
            </div>

            <h3 className="mt-5 text-xl font-extrabold text-[#123b78]">
              Study Materials
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage the limited chapter-wise study materials
              and Google Drive documents.
            </p>

            <div className="mt-5 font-bold text-red-600">
              Manage Materials →
            </div>

          </Link>


          {/* =================================================
              COURSES
          ================================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-3xl">
              🎓
            </div>

            <h3 className="mt-5 text-xl font-extrabold text-[#123b78]">
              Courses
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage examination courses and their content
              assignments.
            </p>

            <div className="mt-5 text-sm font-bold text-slate-400">
              Coming Soon
            </div>

          </div>


          {/* =================================================
              ASPIRANTS
          ================================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-3xl">
              👥
            </div>

            <h3 className="mt-5 text-xl font-extrabold text-[#123b78]">
              Aspirants
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              View students, course access, quiz attempts and
              learning progress.
            </p>

            <div className="mt-5 text-sm font-bold text-slate-400">
              Coming Soon
            </div>

          </div>


          {/* =================================================
              REPORTS
          ================================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-3xl">
              📊
            </div>

            <h3 className="mt-5 text-xl font-extrabold text-[#123b78]">
              Reports & Analytics
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review quiz performance, question quality and
              aspirant activity.
            </p>

            <div className="mt-5 text-sm font-bold text-slate-400">
              Coming Soon
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}