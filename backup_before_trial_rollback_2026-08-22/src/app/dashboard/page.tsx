"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(
  () => import("./DashboardClient"),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="font-semibold text-gray-700">
            Loading your dashboard...
          </p>
        </div>
      </main>
    ),
  }
);

export default function DashboardPage() {
  return <DashboardClient />;
}