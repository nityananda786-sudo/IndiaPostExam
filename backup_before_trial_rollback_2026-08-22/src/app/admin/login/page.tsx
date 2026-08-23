"use client";

import dynamic from "next/dynamic";

const AdminLoginClient = dynamic(
  () => import("./AdminLoginClient"),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="font-semibold text-gray-700">
            Loading admin login...
          </p>
        </div>
      </main>
    ),
  }
);

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
