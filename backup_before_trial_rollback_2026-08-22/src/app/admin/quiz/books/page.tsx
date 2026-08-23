"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Course = {
  CourseID: string;
  CourseName: string;
  Active: boolean;
};

type Book = {
  BookID: string;
  BookName: string;
  CourseAccess: string[];
  Active: boolean | string;
  _rowNumber?: number;
};

type BookForm = {
  bookName: string;
  courseAccess: string[];
  active: boolean;
};

const EMPTY_FORM: BookForm = {
  bookName: "",
  courseAccess: [],
  active: true,
};

function isActive(value: boolean | string | undefined) {
  if (typeof value === "boolean") return value;

  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

function normalizeCourseAccess(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export default function BooksAdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [form, setForm] = useState<BookForm>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function getAuthToken() {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        "You are not logged in. Please login again."
      );
    }

    return await user.getIdToken();
  }

  async function loadBooks() {
    try {
      setLoading(true);

      const token = await getAuthToken();

      const response = await fetch(
        "/api/admin/books",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load books."
        );
      }

      const normalizedBooks: Book[] =
        Array.isArray(data.books)
          ? data.books.map(
              (book: Record<string, unknown>) => ({
                BookID: String(book.BookID ?? ""),
                BookName: String(book.BookName ?? ""),
                CourseAccess:
                  normalizeCourseAccess(
                    book.CourseAccess
                  ),
                Active: isActive(
                  book.Active as boolean | string | undefined
                ),
                _rowNumber:
                  typeof book._rowNumber === "number"
                    ? book._rowNumber
                    : undefined,
              })
            )
          : [];

      setBooks(normalizedBooks);

    } catch (error) {
      console.error("Error loading books:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load books."
      );

    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    try {
      setLoadingCourses(true);

      const token = await getAuthToken();

      const response = await fetch(
        "/api/admin/courses",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load courses."
        );
      }

      const activeCourses: Course[] =
        Array.isArray(data.courses)
          ? data.courses.filter(
              (course: Course) => course.Active
            )
          : [];

      setCourses(activeCourses);

    } catch (error) {
      console.error(
        "Error loading courses:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load courses."
      );

    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged((user) => {
        if (user) {
          loadBooks();
          loadCourses();
        } else {
          setBooks([]);
          setCourses([]);
          setLoading(false);
          setLoadingCourses(false);

          setMessage(
            "Please login as an administrator."
          );
        }
      });

    return () => unsubscribe();
  }, []);

  function openAddForm() {
    setEditingBook(null);
    setForm({
      ...EMPTY_FORM,
      courseAccess: [],
    });
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(book: Book) {
    setEditingBook(book);

    setForm({
      bookName: book.BookName || "",
      courseAccess:
        normalizeCourseAccess(
          book.CourseAccess
        ),
      active: isActive(book.Active),
    });

    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingBook(null);
    setForm(EMPTY_FORM);
  }

  function toggleCourse(courseId: string) {
    setForm((current) => {
      const selected =
        current.courseAccess.includes(courseId);

      return {
        ...current,
        courseAccess: selected
          ? current.courseAccess.filter(
              (id) => id !== courseId
            )
          : [
              ...current.courseAccess,
              courseId,
            ],
      };
    });
  }

  async function saveBook() {
    setMessage("");

    const bookName =
      form.bookName.trim();

    if (!bookName) {
      setMessage(
        "Please enter the book name."
      );
      return;
    }

    if (form.courseAccess.length === 0) {
      setMessage(
        "Please select at least one course."
      );
      return;
    }

    try {
      setSaving(true);

      const token =
        await getAuthToken();

      const editing =
        Boolean(editingBook);

      const payload = editing
        ? {
            bookId: editingBook?.BookID,
            bookName,
            courseAccess:
              form.courseAccess,
            active: form.active,
          }
        : {
            bookName,
            courseAccess:
              form.courseAccess,
            active: form.active,
          };

      const response =
        await fetch(
          "/api/admin/books",
          {
            method:
              editing
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Unable to save book."
        );
      }

      setMessage(
        editing
          ? "Book updated successfully."
          : "Book created successfully."
      );

      setShowForm(false);
      setEditingBook(null);
      setForm(EMPTY_FORM);

      await loadBooks();

    } catch (error) {
      console.error(
        "Error saving book:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save book."
      );

    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(book: Book) {
    try {
      setMessage("");

      const token =
        await getAuthToken();

      const response =
        await fetch(
          "/api/admin/books",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                bookId:
                  book.BookID,

                bookName:
                  book.BookName,

                courseAccess:
                  normalizeCourseAccess(
                    book.CourseAccess
                  ),

                active:
                  !isActive(
                    book.Active
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Unable to change book status."
        );
      }

      setMessage(
        `Book ${
          isActive(book.Active)
            ? "deactivated"
            : "activated"
        } successfully.`
      );

      await loadBooks();

    } catch (error) {
      console.error(
        "Error changing book status:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to change book status."
      );
    }
  }

  async function deleteBook(book: Book) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${book.BookName}"?`
      );

    if (!confirmed) return;

    try {
      setMessage("");

      const token =
        await getAuthToken();

      const response =
        await fetch(
          "/api/admin/books",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                bookId:
                  book.BookID,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
          "Unable to delete book."
        );
      }

      setMessage(
        "Book deleted successfully."
      );

      await loadBooks();

    } catch (error) {
      console.error(
        "Error deleting book:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete book."
      );
    }
  }

  function getCourseName(courseId: string) {
    return (
      courses.find(
        (course) =>
          course.CourseID === courseId
      )?.CourseName ||
      courseId
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-[#123b78] text-white">

        <div className="mx-auto max-w-7xl px-6 py-8">

          <div className="mb-5">

            <a
              href="/admin/quiz"
              className="text-sm font-semibold text-blue-100 transition hover:text-white"
            >
              ← Back to Quiz Management
            </a>

          </div>

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <h1 className="text-3xl font-extrabold">
                Books
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-blue-100">
                Manage departmental books and
                assign them to examination courses.
              </p>

            </div>

            <button
              onClick={openAddForm}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              + Add Book
            </button>

          </div>

        </div>

      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
            {message}
          </div>
        )}

        <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              📚
            </div>

            <div>

              <h2 className="font-extrabold text-[#123b78]">
                Master Question Bank Books
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Books are maintained in the IndiaPostExam
                master Google Sheet. Each book can be
                assigned to one or more examination courses.
              </p>

            </div>

          </div>

        </div>

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="text-sm font-semibold text-slate-500">
              Loading books...
            </div>
          </div>

        ) : books.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">

            <div className="text-5xl">
              📚
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-[#123b78]">
              No books added yet
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Start by adding the first departmental book
              to the master question bank.
            </p>

            <button
              onClick={openAddForm}
              className="mt-6 rounded-xl bg-[#123b78] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0d2e61]"
            >
              + Add First Book
            </button>

          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2">

            {books.map((book) => {

              const active =
                isActive(book.Active);

              return (
                <div
                  key={book.BookID}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                        📖
                      </div>

                      <div>

                        <h3 className="text-lg font-extrabold text-[#123b78]">
                          {book.BookName}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {book.BookID}
                        </p>

                      </div>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {active
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>

                  <div className="mt-5">

                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Applicable Courses
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {book.CourseAccess.length > 0 ? (

                        book.CourseAccess.map(
                          (courseId) => (
                            <span
                              key={courseId}
                              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                            >
                              {getCourseName(
                                courseId
                              )}
                            </span>
                          )
                        )

                      ) : (

                        <span className="text-xs font-semibold text-red-500">
                          No course assigned
                        </span>

                      )}

                    </div>

                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">

                    <button
                      onClick={() =>
                        openEditForm(book)
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-[#123b78] transition hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        toggleActive(book)
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      {active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      onClick={() =>
                        deleteBook(book)
                      }
                      className="rounded-lg border border-red-100 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">

          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">

            <div className="border-b border-slate-200 px-6 py-5">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-extrabold text-[#123b78]">
                    {editingBook
                      ? "Edit Book"
                      : "Add Book"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Book ID is generated automatically.
                  </p>

                </div>

                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  ✕
                </button>

              </div>

            </div>

            <div className="space-y-5 px-6 py-6">

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Book Name *
                </label>

                <input
                  type="text"
                  value={form.bookName}
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        bookName:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="e.g. PO Guide Part-I"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />

              </div>

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="block text-sm font-bold text-slate-700">
                    Applicable Courses *
                  </label>

                  {form.courseAccess.length > 0 && (
                    <span className="text-xs font-semibold text-blue-600">
                      {form.courseAccess.length} selected
                    </span>
                  )}

                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  {loadingCourses ? (

                    <div className="text-sm font-semibold text-slate-500">
                      Loading courses...
                    </div>

                  ) : courses.length === 0 ? (

                    <div className="text-sm font-semibold text-red-600">
                      No active courses available.
                    </div>

                  ) : (

                    <div className="grid gap-3 sm:grid-cols-2">

                      {courses.map((course) => {

                        const selected =
                          form.courseAccess.includes(
                            course.CourseID
                          );

                        return (
                          <label
                            key={course.CourseID}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                              selected
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >

                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                toggleCourse(
                                  course.CourseID
                                )
                              }
                              className="h-4 w-4 accent-blue-700"
                            />

                            <div>

                              <div className="text-sm font-bold text-slate-700">
                                {course.CourseName}
                              </div>

                              <div className="text-[11px] font-semibold text-slate-400">
                                {course.CourseID}
                              </div>

                            </div>

                          </label>
                        );
                      })}

                    </div>
                  )}

                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          active:
                            e.target.checked,
                        })
                      )
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>

                    <div className="text-sm font-bold text-slate-700">
                      Book is Active
                    </div>

                    <div className="text-xs text-slate-500">
                      Inactive books will not be available
                      for new question/quiz assignment.
                    </div>

                  </div>

                </label>

              </div>

              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {message}
                </div>
              )}

            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-5">

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={saveBook}
                  disabled={
                    saving ||
                    loadingCourses ||
                    courses.length === 0
                  }
                  className="rounded-xl bg-[#123b78] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d2e61] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingBook
                    ? "Update Book"
                    : "Save Book"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
