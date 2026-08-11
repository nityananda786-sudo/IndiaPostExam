"use client";

import Link from "next/link";

export default function AdminMaterialsPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <section className="bg-[#123f82] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">

          <Link
            href="/admin"
            className="mb-5 inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white"
          >
            ← Back to Admin Panel
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Study Materials
          </h1>

          <p className="mt-3 max-w-2xl text-white/80">
            Manage the limited chapter-wise study materials available to
            course aspirants.
          </p>

        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Course Materials */}
          <AdminMaterialCard
            icon="📚"
            title="Course Materials"
            description="Add, edit, activate or deactivate chapter-wise PDF study materials."
            href="/admin/materials/course"
            action="Manage Materials"
          />

          {/* Google Drive */}
          <AdminMaterialCard
            icon="☁️"
            title="Google Drive Documents"
            description="Manage Google Drive file IDs and document links used for study materials."
            href="/admin/materials/drive"
            action="Manage Drive Files"
          />

          {/* Material Assignment */}
          <AdminMaterialCard
            icon="🎓"
            title="Course Assignment"
            description="Control which study materials are available for each examination course."
            href="/admin/materials/assign"
            action="Assign Materials"
          />

        </div>

        {/* Information */}
        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 px-6 py-5">

          <div className="flex gap-4">

            <div className="text-2xl">
              ℹ️
            </div>

            <div>
              <h2 className="font-bold text-[#123f82]">
                Limited Study Materials
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                IndiaPostExam will keep study materials concise and
                chapter-oriented. The main preparation platform will focus
                on practice quizzes and the question bank.
              </p>
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}


function AdminMaterialCard({
  icon,
  title,
  description,
  href,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
    >

      <div className="flex items-start justify-between">

        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </div>

        <span className="text-xl text-slate-400 transition group-hover:translate-x-1 group-hover:text-red-500">
          →
        </span>

      </div>

      <h2 className="mt-6 text-xl font-extrabold text-[#123f82]">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-6 font-bold text-red-500">
        {action} →
      </div>

    </Link>
  );
}