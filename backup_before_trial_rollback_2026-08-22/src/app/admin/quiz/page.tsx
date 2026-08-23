"use client";

import Link from "next/link";

export default function AdminQuizPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <section className="bg-[#123f82] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">

          <Link
            href="/admin"
            className="mb-5 inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white"
          >
            {"\u2190"} Back to Admin Panel
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Quiz & Question Bank
          </h1>

          <p className="mt-3 max-w-2xl text-white/80">
            Manage books, chapters, questions and examination resources.
          </p>

        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Books */}
          <AdminCard
            icon="BK"
            title="Books"
            description="Create and manage departmental books and assign them to different examination courses."
            href="/admin/quiz/books"
            action="Manage Books"
          />

          {/* Chapters */}
          <AdminCard
            icon="CH"
            title="Chapters"
            description="Create chapters and topics under each departmental book."
            href="/admin/quiz/chapters"
            action="Manage Chapters"
          />

          {/* Questions */}
          <AdminCard
            icon="Q"
            title="Question Bank"
            description="Create, edit, review and manage individual MCQ questions."
            href="/admin/quiz/questions"
            action="Manage Questions"
          />

          {/* Excel Import */}
          <AdminCard
            icon="EX"
            title="Excel Import"
            description="Upload hundreds or thousands of MCQs from Excel and validate them before adding them to the question bank."
            href="/admin/quiz/import"
            action="Import Questions"
          />

          {/* Question Reports */}
          <AdminCard
            icon="REP"
            title="Question Reports"
            description="Review aspirant reports and correction suggestions for questions in the Question Bank."
            href="/admin/quiz/question-reports"
            action="Review Question Reports"
          />
          {/* Question Data Integrity */}
          <AdminCard
            icon="🔎"
            title="Question Data Integrity"
            description="Run a read-only audit of the Master Question Bank to detect duplicate questions, missing fingerprints and other data integrity issues."
            href="/admin/quiz/questions/audit"
            action="Open Question Audit"
          />

        </div>

      </section>

    </main>
  );
}


function AdminCard({
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
          {"\u2192"}
        </span>

      </div>

      <h2 className="mt-6 text-xl font-extrabold text-[#123f82]">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-6 font-bold text-red-500">
        {action} {"\u2192"}
      </div>

    </Link>
  );
}





