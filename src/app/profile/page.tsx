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
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
};

export default function ProfilePage() {
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
        console.error("Unable to load profile:", error);
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
            Loading profile...
          </p>
        </div>
      </main>
    );
  }

  const email = profile?.email || user?.email || "";
  const role = profile?.role || "Aspirant";
  const subscription = profile?.subscription || "free";

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">

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

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 py-10">

        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-red-600">
            My Account
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#101a35] sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-2 text-gray-600">
            View your IndiaPostExam account information.
          </p>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

          {/* Profile Header */}
          <div className="bg-gradient-to-r from-[#12366f] to-[#d71920] px-6 py-8 text-white sm:px-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-lg">
                👤
              </div>

              <div>
                <p className="text-sm font-medium text-white/80">
                  IndiaPostExam Member
                </p>

                <h2 className="mt-1 break-all text-xl font-bold sm:text-2xl">
                  {email}
                </h2>

                <div className="mt-3">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">
                    {subscription === "premium"
                      ? "Premium Member"
                      : "Free Member"}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Details */}
          <div className="divide-y divide-gray-100">

            <ProfileRow
              label="Email Address"
              value={email}
            />

            <ProfileRow
              label="Account Type"
              value={
                role === "admin"
                  ? "Administrator"
                  : "Student"
              }
            />

            <ProfileRow
              label="Membership"
              value={
                subscription === "premium"
                  ? "Premium"
                  : "Free"
              }
            />

            <ProfileRow
              label="Firebase User ID"
              value={user?.uid || ""}
            />

          </div>

        </div>

        {/* Membership Section */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
                Current Plan
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#101a35]">
                {subscription === "premium"
                  ? "Premium Membership"
                  : "Free Membership"}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {subscription === "premium"
                  ? "You have access to premium learning content."
                  : "Upgrade your membership to access premium courses and content."}
              </p>
            </div>

            {subscription !== "premium" && (
              <Link
                href="/subscribe"
                className="rounded-xl bg-red-600 px-6 py-3 text-center font-bold text-white shadow-md transition hover:bg-red-700"
              >
                Upgrade Now
              </Link>
            )}

          </div>

        </div>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap gap-3">

          <Link
            href="/dashboard"
            className="rounded-xl bg-[#12366f] px-5 py-3 text-sm font-bold text-white hover:bg-[#0d2b5d]"
          >
            Dashboard
          </Link>

          <Link
            href="/courses"
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:border-red-300 hover:text-red-600"
          >
            Explore Courses
          </Link>

          <Link
            href="/subscribe"
            className="rounded-xl border border-red-600 bg-white px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            Subscription
          </Link>

        </div>

      </section>

    </main>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">

      <span className="text-sm font-semibold text-gray-500">
        {label}
      </span>

      <span className="break-all text-sm font-bold text-[#101a35] sm:text-right">
        {value}
      </span>

    </div>
  );
}