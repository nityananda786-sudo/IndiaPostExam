"use client";

import Link from "next/link";

export default function MockTestsAdminPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-black text-[#123b78] sm:text-3xl">
              Mock Tests
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create and manage full-length mock examinations.
            </p>
          </div>

          <div className="flex items-center gap-2">

            <Link
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
            >
              Admin Dashboard
            </Link>

            <Link
              href="/admin/mock-tests/new"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-indigo-700"
            >
              + Create Mock Test
            </Link>

          </div>

        </div>
      </header>


      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        {/* INFORMATION */}
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">

          <h2 className="font-extrabold text-[#123b78]">
            Mock Test Management
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Each mock test will contain exactly 25 questions.
            Questions will be referenced from the existing Question Bank
            or created specifically for Mock Tests. Questions will never
            be duplicated merely because they are used in another course
            or Mock Test.
          </p>

        </div>


        {/* EMPTY STATE */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-600">
            MT
          </div>

          <h2 className="mt-5 text-xl font-black text-[#123b78] sm:text-2xl">
            No Mock Tests Created Yet
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Create your first 25-question Mock Test using automatic
            question selection or manual question selection.
          </p>

          <div className="mt-6">

            <Link
              href="/admin/mock-tests/new"
              className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700"
            >
              Create Your First Mock Test
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}

