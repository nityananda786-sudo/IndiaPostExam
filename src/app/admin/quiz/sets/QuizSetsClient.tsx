"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";

const COURSES = [
  { id: "gds-mts", title: "GDS ? MTS" },
  { id: "gds-postman", title: "GDS ? Postman / Mail Guard" },
  { id: "postal-assistant", title: "Postal Assistant / Sorting Assistant" },
  { id: "inspector-posts", title: "Inspector Posts" },
  { id: "pss-group-b", title: "PSS Group B" },
];

type QuizType = "practice" | "mock" | "previous_year";

export default function QuizSetsAdminPage() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QuizType>("practice");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState(false);
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function toggleCourse(courseId: string) {
    setSelectedCourses((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    );
  }

  function handleAllCoursesChange(checked: boolean) {
    setAllCourses(checked);

    if (checked) {
      setSelectedCourses(COURSES.map((course) => course.id));
    } else {
      setSelectedCourses([]);
    }
  }

  async function handleCreateQuizSet() {
    setSaveError("");

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setSaveError("Quiz Set Title is required.");
      return;
    }

    if (selectedCourses.length === 0) {
      setSaveError("Please select at least one course.");
      return;
    }

    try {
      setSaving(true);

      const quizSetRef = await addDoc(
        collection(db, "quizSets"),
        {
          title: cleanTitle,
          type,
          courseIds: selectedCourses,
          questionIds: [],
          active,
          published: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      console.log(
        "Quiz Set created:",
        quizSetRef.id
      );

      alert(
        `Quiz Set created successfully.\n\nQuiz Set ID: ${quizSetRef.id}`
      );

    } catch (error) {
      console.error(
        "Quiz Set creation failed:",
        error
      );

      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to create Quiz Set."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-[#123f82] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Quiz Sets
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">
            Create reusable Practice Quiz, Mock Test and Previous Year
            Question sets from the Master Question Bank.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-extrabold text-[#123f82]">
            Create Quiz Set
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Define the quiz set first. Questions will be assigned in the
            next stage.
          </p>

          <div className="mt-8 space-y-7">

            {/* TITLE */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Quiz Set Title *
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Inspector Posts Mock Test – Set 01"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* TYPE */}
            <div>
              <label className="mb-3 block text-sm font-bold text-slate-700">
                Quiz Type *
              </label>

              <div className="grid gap-3 md:grid-cols-3">

                <button
                  type="button"
                  onClick={() => setType("practice")}
                  className={`rounded-xl border p-4 text-left ${
                    type === "practice"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="font-extrabold text-blue-800">
                    Practice Quiz
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Practice questions by book/chapter.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setType("mock")}
                  className={`rounded-xl border p-4 text-left ${
                    type === "mock"
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="font-extrabold text-purple-800">
                    Mock Test
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Examination-style timed test.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setType("previous_year")}
                  className={`rounded-xl border p-4 text-left ${
                    type === "previous_year"
                      ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="font-extrabold text-amber-800">
                    Previous Year
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Previous Year Question set.
                  </p>
                </button>

              </div>
            </div>

            {/* COURSES */}
            <div>
              <label className="mb-3 block text-sm font-bold text-slate-700">
                Assign to Course(s) *
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <label className="flex cursor-pointer items-center gap-3 border-b border-slate-200 pb-4">

                  <input
                    type="checkbox"
                    checked={allCourses}
                    onChange={(e) =>
                      handleAllCoursesChange(e.target.checked)
                    }
                    className="h-4 w-4"
                  />

                  <div>
                    <div className="text-sm font-extrabold text-[#123f82]">
                      All Courses
                    </div>

                    <div className="text-xs text-slate-500">
                      Make this quiz available to every course.
                    </div>
                  </div>

                </label>

                <div className="mt-4 space-y-3">

                  {COURSES.map((course) => (
                    <label
                      key={course.id}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                        className="h-4 w-4"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        {course.title}
                      </span>
                    </label>
                  ))}

                </div>

              </div>
            </div>

            {/* ACTIVE */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

              <label className="flex cursor-pointer items-center gap-3">

                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4"
                />

                <div>
                  <div className="text-sm font-extrabold text-slate-700">
                    Quiz Set is Active
                  </div>

                  <div className="text-xs text-slate-500">
                    Inactive sets will not be available to aspirants.
                  </div>
                </div>

              </label>

            </div>

            {/* ERROR */}
            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {saveError}
              </div>
            )}

            {/* PREVIEW */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                Current Selection
              </p>

              <p className="mt-2 font-extrabold text-[#123f82]">
                {title || "Untitled Quiz Set"}
              </p>

              <p className="mt-1 text-sm text-blue-700">
                Type:{" "}
                {type === "practice"
                  ? "Practice Quiz"
                  : type === "mock"
                  ? "Mock Test"
                  : "Previous Year Question"}
              </p>

              <p className="mt-1 text-sm text-blue-700">
                Courses:{" "}
                {allCourses
                  ? "All Courses"
                  : selectedCourses.length === 0
                  ? "None selected"
                  : selectedCourses.length === COURSES.length
                  ? "All Courses"
                  : `${selectedCourses.length} selected`}
              </p>

            </div>

            {/* CREATE */}
            <div className="flex justify-end border-t border-slate-200 pt-6">

              <button
                type="button"
                onClick={handleCreateQuizSet}
                disabled={
                  saving ||
                  !title.trim() ||
                  selectedCourses.length === 0
                }
                className="rounded-xl bg-[#123f82] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Creating Quiz Set..."
                  : "Create Quiz Set ?"}
              </button>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}
