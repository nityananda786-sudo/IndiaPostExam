"use client";

import dynamic from "next/dynamic";

const ProfileClient = dynamic(
  () => import("./ProfileClient"),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="mt-4 font-semibold text-gray-700">
            Loading profile...
          </p>
        </div>
      </main>
    ),
  }
);

export default function ProfilePage() {
  return <ProfileClient />;
}