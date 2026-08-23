"use client";

import Link from "next/link";
import { useState } from "react";

const COURSES = [
  { id: "gds-mts", title: "GDS → MTS" },
  { id: "gds-postman", title: "GDS → Postman / Mail Guard" },
  { id: "postal-assistant", title: "Postal Assistant / Sorting Assistant" },
  { id: "inspector-posts", title: "Inspector Posts" },
  { id: "pss-group-b", title: "PSS Group B" },
];

type SelectionMode = "automatic" | "manual";

export default function CreateMockTestPage() {
  const [testNumber, setTestNumber] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>("automatic");

  const [useQuestionBank, setUseQuestionBank] =
    useState(true);

  const [useMockOnlyQuestions, setUseMockOnlyQuestions] =
    useState(true);

  const [selectedCourses, setSelectedCourses] =
    useState<string[]>([]);

  const [active, setActive] = useState(true);

  function toggleCourse(courseId: string) {
    setSelectedCourses((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!testNumber.trim()) {
      alert("Please enter the Mock Test Number.");
      return;
    }

    if (!durationMinutes.trim()) {
      alert("Please enter the Mock Test duration.");
      return;
    }

    if (!useQuestionBank && !useMockOnlyQuestions) {
      alert("Please select at least one question source.");
      return;
    }

    if (selectedCourses.length === 0) {
      alert("Please assign the Mock Test to at least one course.");
      return;
    }

    const mockTestDraft = {
      testNumber: Number(testNumber),
      durationMinutes: Number(durationMinutes),
      questionCount: 25,
      selectionMode,
      useQuestionBank,
      useMockOnlyQuestions,
      courseIds: selectedCourses,
      active,
    };

    sessionStorage.setItem(
      "indiaPostExam_mockTestDraft",
      JSON.stringify(mockTestDraft)
    );

    window.location.href =
      "/admin/mock-tests/new/questions";
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-black text-[#123b78] sm:text-3xl">
              Create Mock Test
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Prepare a 25-question full-length examination.
            </p>
          </div>

          <Link
            href="/admin/mock-tests"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
          >
            ← Mock Tests
          </Link>

        </div>
      </header>


      {/* FORM */}
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* BASIC INFORMATION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-xl font-black text-[#123b78]">
              Basic Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Mock Test Number *
                </label>

                <input
                  type="number"
                  min="1"
                  value={testNumber}
                  onChange={(event) =>
                    setTestNumber(event.target.value)
                  }
                  placeholder="e.g. 1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Aspirants will see this as Mock Test 01, Mock Test 02,
                  etc.
                </p>
              </div>


              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Duration *
                </label>

                <div className="flex items-center gap-3">

                  <input
                    type="number"
                    min="1"
                    value={durationMinutes}
                    onChange={(event) =>
                      setDurationMinutes(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />

                  <span className="shrink-0 text-sm font-bold text-slate-500">
                    minutes
                  </span>

                </div>
              </div>

            </div>


            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">

              <div className="text-sm font-extrabold text-indigo-900">
                Question Count
              </div>

              <div className="mt-1 text-2xl font-black text-indigo-700">
                25 Questions
              </div>

              <p className="mt-1 text-xs text-indigo-700/80">
                Every Mock Test will contain exactly 25 questions.
              </p>

            </div>

          </div>


          {/* PREPARATION METHOD */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-xl font-black text-[#123b78]">
              Question Preparation
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose how the 25-question examination paper will be prepared.
            </p>


            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <button
                type="button"
                onClick={() =>
                  setSelectionMode("automatic")
                }
                className={`rounded-2xl border p-5 text-left transition ${
                  selectionMode === "automatic"
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-slate-200 bg-white hover:border-indigo-200"
                }`}
              >
                <div className="text-lg font-black text-indigo-800">
                  Automatic Selection
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Automatically select 25 eligible questions from the
                  selected sources.
                </p>
              </button>


              <button
                type="button"
                onClick={() =>
                  setSelectionMode("manual")
                }
                className={`rounded-2xl border p-5 text-left transition ${
                  selectionMode === "manual"
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-slate-200 bg-white hover:border-indigo-200"
                }`}
              >
                <div className="text-lg font-black text-indigo-800">
                  Manual Selection
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select the exact 25 questions that will appear in the
                  examination.
                </p>
              </button>

            </div>

          </div>


          {/* QUESTION SOURCES */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-xl font-black text-[#123b78]">
              Question Sources
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Questions will be referenced from the master Question Bank.
              No question document will be duplicated.
            </p>


            <div className="mt-6 space-y-3">

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                <input
                  type="checkbox"
                  checked={useQuestionBank}
                  onChange={(event) =>
                    setUseQuestionBank(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <div className="font-extrabold text-slate-800">
                    Existing Question Bank
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Reuse eligible questions already present in the
                    IndiaPostExam Question Bank.
                  </div>
                </div>

              </label>


              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                <input
                  type="checkbox"
                  checked={useMockOnlyQuestions}
                  onChange={(event) =>
                    setUseMockOnlyQuestions(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <div>
                  <div className="font-extrabold text-slate-800">
                    Mock-Test-Only Questions
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Include questions specifically created for Mock Tests
                    and not assigned to a book or chapter.
                  </div>
                </div>

              </label>

            </div>

          </div>


          {/* COURSE ASSIGNMENT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-xl font-black text-[#123b78]">
              Assign to Course(s)
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The same Mock Test can be assigned to multiple courses.
            </p>


            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              {COURSES.map((course) => (

                <label
                  key={course.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                >

                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={() =>
                      toggleCourse(course.id)
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-bold text-slate-700">
                    {course.title}
                  </span>

                </label>

              ))}

            </div>

          </div>


          {/* STATUS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <label className="flex cursor-pointer items-start gap-3">

              <input
                type="checkbox"
                checked={active}
                onChange={(event) =>
                  setActive(event.target.checked)
                }
                className="mt-1 h-4 w-4"
              />

              <div>

                <div className="font-extrabold text-slate-800">
                  Mock Test is Active
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Inactive Mock Tests will not be available to aspirants.
                </p>

              </div>

            </label>

          </div>


          {/* PREVIEW */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">

            <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600">
              Mock Test Preview
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#123b78]">
              {testNumber
                ? `Mock Test ${testNumber.padStart(2, "0")}`
                : "Mock Test 01"}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
                25 Questions
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
                {durationMinutes || "60"} Minutes
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
                {selectionMode === "automatic"
                  ? "Automatic"
                  : "Manual"}
              </span>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
                {selectedCourses.length} Course
                {selectedCourses.length === 1 ? "" : "s"}
              </span>

            </div>

          </div>


          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/admin/mock-tests"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700"
            >
              Continue to Question Selection →
            </button>

          </div>

        </form>

      </section>

    </main>
  );
}

