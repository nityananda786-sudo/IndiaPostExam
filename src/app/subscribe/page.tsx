"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type UserProfile = {
  email?: string;
  role?: string;
  subscription?: string;
};

export default function SubscribePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        }
      } catch (error) {
        console.error("Unable to load subscription:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="mt-4 font-semibold text-gray-700">
            Loading subscription...
          </p>
        </div>
      </main>
    );
  }

  const subscription = profile?.subscription || "free";
  const isPremium = subscription === "premium";

  return (
    <main className="min-h-screen bg-[#f8fafc]">

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">

          <Link href="/">
            <img
              src="/logo/logo.png"
              alt="IndiaPostExam"
              className="h-14 w-auto object-contain"
            />
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-red-600 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            ← Dashboard
          </Link>

        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-red-600">
            IndiaPostExam Membership
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#101a35] sm:text-4xl">
            Choose Your Learning Plan
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Prepare smarter for your next promotion with structured
            courses, study materials and mock tests.
          </p>
        </div>

        {/* Plans */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">

          {/* Free */}
          <div
            className={`rounded-3xl border bg-white p-7 shadow-sm ${
              !isPremium
                ? "border-blue-200 ring-2 ring-blue-50"
                : "border-gray-200"
            }`}
          >

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-[#101a35]">
                Free
              </h2>

              {!isPremium && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  Current Plan
                </span>
              )}
            </div>

            <p className="mt-2 text-gray-600">
              Start your preparation with free resources.
            </p>

            <div className="mt-6 text-4xl font-black text-[#101a35]">
              ₹0
            </div>

            <ul className="mt-7 space-y-3 text-sm text-gray-700">
              <PlanFeature text="Free study resources" />
              <PlanFeature text="Selected practice materials" />
              <PlanFeature text="Access to free quizzes" />
              <PlanFeature text="Aspirant dashboard" />
            </ul>

          </div>

          {/* Premium */}
          <div
            className={`relative rounded-3xl border bg-white p-7 shadow-lg ${
              isPremium
                ? "border-red-300 ring-2 ring-red-100"
                : "border-red-100"
            }`}
          >

            <div className="absolute right-6 top-6 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              PREMIUM
            </div>

            <h2 className="text-2xl font-extrabold text-[#101a35]">
              Premium
            </h2>

            <p className="mt-2 max-w-sm text-gray-600">
              Complete preparation access for serious postal promotion
              aspirants.
            </p>

            <div className="mt-6 text-4xl font-black text-[#101a35]">
              Premium
            </div>

            <ul className="mt-7 space-y-3 text-sm text-gray-700">
              <PlanFeature text="Premium courses" />
              <PlanFeature text="Premium study materials" />
              <PlanFeature text="Premium mock tests" />
              <PlanFeature text="Special preparation resources" />
              <PlanFeature text="Premium learning dashboard" />
            </ul>

            <div className="mt-8">

              {isPremium ? (
                <div className="rounded-xl bg-green-50 px-5 py-3 text-center font-bold text-green-700">
                  ✓ Premium Membership Active
                </div>
              ) : (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-gray-300 px-5 py-3.5 font-bold text-gray-600"
                >
                  Payment Integration — Coming Next
                </button>
              )}

            </div>

          </div>

        </div>

        {/* Account Information */}
        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <p className="text-sm font-semibold text-gray-500">
            Signed in as
          </p>

          <p className="mt-1 break-all font-bold text-[#101a35]">
            {profile?.email || user?.email}
          </p>

          <div className="mt-4">
            <Link
              href="/profile"
              className="font-bold text-red-600 hover:text-red-700"
            >
              View My Profile →
            </Link>
          </div>

        </div>

      </section>

    </main>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 font-bold text-green-600">
        ✓
      </span>

      <span>{text}</span>
    </li>
  );
}