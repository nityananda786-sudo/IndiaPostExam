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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      try {
        setUser(currentUser);

        const userRef = doc(db, "users", currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          setProfile(userSnapshot.data() as UserProfile);
        } else {
          setError("User profile was not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile.");
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

      {/* Header */}
      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/">
            <img
              src="/logo/logo.png"
              alt="IndiaPostExam"
              className="h-16 w-auto object-contain"
            />
          </Link>

          {/* User information */}
          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-bold text-[#101a35]">
                {profile?.email || user?.email}
              </p>

              <p className="text-xs text-gray-500">
                {profile?.subscription === "premium"
                  ? "Premium Member"
                  : "Free Member"}
              </p>

            </div>

            <button
              onClick={async () => {
                await auth.signOut();
                window.location.href = "/login";
              }}
              className="rounded-xl border border-red-600 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#12366f] to-[#d71920] p-7 text-white shadow-lg sm:p-10">

          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-white/80">
            IndiaPostExam Dashboard
          </p>

          <h1 className="text-3xl font-extrabold sm:text-4xl">
            Welcome to your learning space.
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-white/90 sm:text-base">
            Your courses, study materials, mock tests and subscription
            information will be available here.
          </p>

        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Profile / Membership */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">

          {/* Account */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              👤
            </div>

            <p className="text-sm font-semibold text-gray-500">
              My Account
            </p>

            <h2 className="mt-1 break-all text-lg font-bold text-[#101a35]">
              {profile?.email || user?.email}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Role: {profile?.role || "Aspirant"}
            </p>

          </div>

          {/* Subscription */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-2xl">
              ⭐
            </div>

            <p className="text-sm font-semibold text-gray-500">
              Membership
            </p>

            <h2 className="mt-1 text-2xl font-extrabold text-[#101a35]">
              {profile?.subscription === "premium"
                ? "Premium"
                : "Free"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {profile?.subscription === "premium"
                ? "You have premium access."
                : "Upgrade to access premium courses."}
            </p>

          </div>

          {/* Courses */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
              📚
            </div>

            <p className="text-sm font-semibold text-gray-500">
              Learning
            </p>

            <h2 className="mt-1 text-2xl font-extrabold text-[#101a35]">
              My Courses
            </h2>

            <Link
              href="/courses"
              className="mt-4 inline-block font-bold text-red-600 hover:text-red-700"
            >
              Explore Courses →
            </Link>

          </div>

        </div>

        {/* Dashboard Menu */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <DashboardCard
            icon="📚"
            title="My Courses"
            description="Access your enrolled courses."
            href="/courses"
          />

          <DashboardCard
            icon="📝"
            title="Mock Tests"
            description="Practice with quizzes and mock tests."
            href="/quiz"
          />

          <DashboardCard
            icon="⭐"
            title="Subscription"
            description="Manage your premium access."
            href="/subscribe"
          />

          <DashboardCard
            icon="👤"
            title="My Profile"
            description="Manage your account information."
            href="/profile"
          />

        </div>

      </section>

    </main>
  );
}

function DashboardCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
    >

      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl transition group-hover:bg-red-50">
        {icon}
      </div>

      <h3 className="text-lg font-bold text-[#101a35]">
        {title}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {description}
      </p>

    </Link>
  );
}