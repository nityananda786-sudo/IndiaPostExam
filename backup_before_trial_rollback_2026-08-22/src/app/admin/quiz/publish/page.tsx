"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type Course = {
  id: string;
  CourseID?: string;
  CourseName?: string;
  CourseDescription?: string;
  Active?: boolean;
  active?: boolean;
  Published?: boolean;
  EnrollmentOpen?: boolean;
};

export default function PublishControlPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [published, setPublished] = useState(false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => course.id === selectedCourseId
      ),
    [courses, selectedCourseId]
  );

  async function loadCourses() {
    try {
      setLoading(true);
      setError("");

      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "Administrator authentication required."
        );
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        "/api/admin/courses",
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load courses."
        );
      }

      const loadedCourses: Course[] =
        Array.isArray(data.courses)
          ? data.courses
          : [];

      setCourses(loadedCourses);

      if (loadedCourses.length > 0) {
        setSelectedCourseId(
          loadedCourses[0].id
        );
      }
    } catch (err: any) {
      console.error(
        "Error loading courses:",
        err
      );

      setError(
        err?.message ||
          "Unable to load courses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            loadCourses();
          } else {
            setLoading(false);
            setError(
              "Administrator authentication required."
            );
          }
        }
      );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      return;
    }

    setPublished(
      selectedCourse.Published ?? false
    );

    setEnrollmentOpen(
      selectedCourse.EnrollmentOpen ?? false
    );

    setMessage("");
    setError("");
  }, [selectedCourse]);

  async function saveControls() {
    if (!selectedCourse) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "Administrator authentication required."
        );
      }

      const idToken =
        await user.getIdToken();

      const response = await fetch(
        "/api/admin/courses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            action: "updateControls",
            courseId:
              selectedCourse.CourseID ||
              selectedCourse.id,
            published,
            enrollmentOpen,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to save course controls."
        );
      }

      setCourses((current) =>
        current.map((course) =>
          course.id === selectedCourse.id
            ? {
                ...course,
                Published:
                  data.published,
                EnrollmentOpen:
                  data.enrollmentOpen,
              }
            : course
        )
      );

      setMessage(
        "Course controls saved successfully."
      );
    } catch (err: any) {
      console.error(
        "Course control save error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save course controls."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <p className="font-bold text-slate-700">
            Loading course controls...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-[#123f82] text-white">
        <div className="mx-auto max-w-5xl px-6 py-9">

          <Link
            href="/admin/quiz"
            className="mb-5 inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white"
          >
            {"\u2190"} Back to Quiz & Question Bank
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Publish & Control
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">
            Manage course publication and new
            enrollment from one control panel.
          </p>

        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-700">
            ✓ {message}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-800">
              No courses found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create a course before managing
              publication controls.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <label className="mb-2 block text-sm font-extrabold text-slate-700">
                Select Course
              </label>

              <select
                value={selectedCourseId}
                onChange={(e) =>
                  setSelectedCourseId(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.CourseName ||
                      course.CourseID ||
                      course.id}
                  </option>
                ))}
              </select>

              {selectedCourse && (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Course ID
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedCourse.CourseID ||
                      selectedCourse.id}
                  </p>
                </div>
              )}

            </div>

            {selectedCourse && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <h2 className="text-2xl font-extrabold text-[#123f82]">
                      Course Controls
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Changes are saved together
                      when you click Save Changes.
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                      selectedCourse.Active === false
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {selectedCourse.Active === false
                      ? "INACTIVE"
                      : "ACTIVE"}
                  </span>

                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-center justify-between gap-5">

                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">
                        Course Published
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Controls whether the course
                        is publicly available to
                        aspirants.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        selectedCourse.Active === false
                      }
                      onClick={() =>
                        setPublished(
                          (current) => !current
                        )
                      }
                      className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                        published
                          ? "bg-emerald-600"
                          : "bg-slate-300"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                          published
                            ? "left-7"
                            : "left-1"
                        }`}
                      />
                    </button>

                  </div>

                  <div className="mt-3">
                    <span
                      className={`text-xs font-extrabold ${
                        published
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      {published
                        ? "PUBLISHED"
                        : "UNPUBLISHED"}
                    </span>
                  </div>

                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-center justify-between gap-5">

                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">
                        New Enrollment
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Controls whether new
                        aspirants may enroll in this
                        course.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        saving ||
                        selectedCourse.Active === false
                      }
                      onClick={() =>
                        setEnrollmentOpen(
                          (current) => !current
                        )
                      }
                      className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                        enrollmentOpen
                          ? "bg-emerald-600"
                          : "bg-slate-300"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                          enrollmentOpen
                            ? "left-7"
                            : "left-1"
                        }`}
                      />
                    </button>

                  </div>

                  <div className="mt-3">
                    <span
                      className={`text-xs font-extrabold ${
                        enrollmentOpen
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      {enrollmentOpen
                        ? "ENROLLMENT OPEN"
                        : "ENROLLMENT CLOSED"}
                    </span>
                  </div>

                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-5">

                  <p className="text-sm font-extrabold text-blue-900">
                    Existing enrolled aspirants
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Existing enrollment is not
                    changed by these controls.
                    Unpublishing or closing new
                    enrollment does not remove
                    access already granted to
                    enrolled aspirants.
                  </p>

                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">

                  <div className="text-sm">

                    <p className="font-bold text-slate-700">
                      Current Settings to Save
                    </p>

                    <p className="mt-1 text-slate-500">
                      Published:{" "}
                      <strong>
                        {published ? "ON" : "OFF"}
                      </strong>
                      {" • "}
                      Enrollment:{" "}
                      <strong>
                        {enrollmentOpen
                          ? "ON"
                          : "OFF"}
                      </strong>
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={saveControls}
                    disabled={
                      saving ||
                      selectedCourse.Active === false
                    }
                    className="rounded-xl bg-[#123f82] px-7 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0d2f65] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

      </section>

    </main>
  );
}
