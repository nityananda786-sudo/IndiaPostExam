"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Login successful
      window.location.href = "/dashboard";
    } catch (error: unknown) {
      const firebaseError = error as {
        code?: string;
      };

      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Invalid email or password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/too-many-requests":
          setError(
            "Too many unsuccessful attempts. Please try again later."
          );
          break;

        default:
          setError("Unable to login. Please try again.");
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
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Login to continue your IndiaPostExam journey.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7">

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Email Address
              </label>

              <input
                id="login-email"
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
              <div className="mb-2 flex items-center justify-between gap-2">

                <label
                  htmlFor="login-password"
                  className="text-sm font-semibold text-gray-800"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Forgot password?
                </Link>

              </div>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
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

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-5 py-3.5 font-bold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Login"}
            </button>

          </form>

          {/* Register Link */}
          <div className="mt-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">

            <span>Don't have an account?</span>{" "}

            <Link
              href="/register"
              className="font-bold text-red-600 hover:text-red-700"
            >
              Create Account
            </Link>

          </div>

        </div>

        {/* Back Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-red-600"
          >
            ← Back to IndiaPostExam
          </Link>
        </div>

      </div>

    </main>
  );
}