"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    // Check passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Firebase minimum password requirement
    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // --------------------------------------------------
      // STEP 1
      // Create Firebase Authentication account
      // --------------------------------------------------

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      // --------------------------------------------------
      // STEP 2
      // Create Firestore user profile
      // --------------------------------------------------

      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          role: "student",
          subscription: "free",
          createdAt: serverTimestamp(),
    trialStartedAt: serverTimestamp(),
        }
      );

      // --------------------------------------------------
      // STEP 3
      // Login is already active after registration
      // Send user to dashboard
      // --------------------------------------------------

      window.location.href = "/dashboard";

    } catch (error: unknown) {

      const firebaseError = error as {
        code?: string;
      };

      switch (firebaseError.code) {

        case "auth/email-already-in-use":
          setError(
            "An account with this email already exists. Please login instead."
          );
          break;

        case "auth/invalid-email":
          setError(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setError(
            "Password is too weak. Please use at least 6 characters."
          );
          break;

        case "permission-denied":
          setError(
            "Your account was created, but the user profile could not be saved. Please contact the administrator."
          );
          break;

        default:
          setError(
            "Unable to create your account. Please try again."
          );
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fffaf5] via-white to-[#fff4df] px-4 py-12 sm:py-16">

      <div className="mx-auto max-w-md">

        {/* Logo */}
        <div className="mb-8 text-center">

          <Link href="/" className="inline-block">
            <img
              src="/logo/logo.png"
              alt="IndiaPostExam"
              className="mx-auto h-20 w-auto object-contain"
            />
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-[#101a35]">
            Create Your Account
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Start your IndiaPostExam learning journey.
          </p>

        </div>

        {/* Registration Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7">

          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >

            {/* Email */}
            <div>

              <label
                htmlFor="register-email"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Email Address
              </label>

              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

            </div>

            {/* Password */}
            <div>

              <label
                htmlFor="register-password"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Password
              </label>

              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

              <p className="mt-1.5 text-xs text-gray-500">
                Minimum 6 characters.
              </p>

            </div>

            {/* Confirm Password */}
            <div>

              <label
                htmlFor="register-confirm-password"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Confirm Password
              </label>

              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />

            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Create Account */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-5 py-3.5 font-bold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          {/* Login Link */}
          <div className="mt-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">

            <span>Already have an account?</span>{" "}

            <Link
              href="/login"
              className="font-bold text-red-600 hover:text-red-700"
            >
              Login
            </Link>

          </div>

        </div>

        {/* Back Home */}
        <div className="mt-6 text-center">

          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-red-600"
          >
            â† Back to IndiaPostExam
          </Link>

        </div>

      </div>

    </main>
  );
}


