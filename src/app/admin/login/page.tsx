"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // -------------------------------------------------
      // 1. Firebase Authentication
      // -------------------------------------------------
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = credential.user.uid;

      // -------------------------------------------------
      // 2. Check Admin profile in Firestore
      // -------------------------------------------------
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await auth.signOut();

        setError(
          "Admin profile was not found. Please contact the administrator."
        );

        return;
      }

      const userData = userSnap.data();

      // -------------------------------------------------
      // 3. Check role
      // -------------------------------------------------
      if (userData.role !== "admin") {
        await auth.signOut();

        setError(
          "Access denied. This account is not an administrator."
        );

        return;
      }

      // -------------------------------------------------
      // 4. Successful Admin login
      // -------------------------------------------------
      router.replace("/admin");

    } catch (err: any) {
      console.error("Admin login error:", err);

      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Too many login attempts. Please try again later."
        );
      } else {
        setError(
          err?.message ||
          "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-sm font-bold tracking-[0.25em] text-red-500">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#102f63]">
            Admin Login
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Secure administration access
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Admin Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#123f82] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#123f82] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#123f82] px-4 py-3.5 font-bold text-white transition hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to Admin Panel"}
            </button>

          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Authorized administrators only
            </p>
          </div>

        </div>

      </div>

    </main>
  );
}