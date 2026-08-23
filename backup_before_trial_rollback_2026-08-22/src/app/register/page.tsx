"use client";

import dynamic from "next/dynamic";

const RegisterClient = dynamic(
  () => import("./RegisterClient"),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="mt-4 text-sm font-semibold text-gray-600">
            Loading registration...
          </p>
        </div>
      </main>
    ),
  }
);

export default function RegisterPage() {
  return <RegisterClient />;
}