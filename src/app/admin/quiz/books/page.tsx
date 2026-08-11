"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Book = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  bookType: string;
  applicableCourses: string[];
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const COURSE_OPTIONS = [
  {
    id: "gds-mts",
    name: "GDS → MTS",
  },
  {
    id: "postman",
    name: "Postman",
  },
  {
    id: "postal-assistant",
    name: "Postal Assistant",
  },
  {
    id: "inspector-posts",
    name: "Inspector Posts",
  },
  {
    id: "pss-group-b",
    name: "PSS Group-B",
  },
];

const EMPTY_FORM = {
  title: "",
  shortTitle: "",
  description: "",
  bookType: "Departmental Book",
  applicableCourses: [] as string[],
  active: true,
};

export default function BooksAdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /*
   * Load books from Firestore
   */
  useEffect(() => {
    const booksRef = collection(db, "books");

    const unsubscribe = onSnapshot(
      booksRef,
      (snapshot) => {
        const data: Book[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Book, "id">),
        }));

        setBooks(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading books:", error);
        setMessage("Unable to load books.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * Open Add Book form
   */
  function openAddForm() {
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setShowForm(true);
  }

  /*
   * Open Edit Book form
   */
  function openEditForm(book: Book) {
    setEditingBook(book);

    setForm({
      title: book.title || "",
      shortTitle: book.shortTitle || "",
      description: book.description || "",
      bookType: book.bookType || "Departmental Book",
      applicableCourses: book.applicableCourses || [],
      active: book.active !== false,
    });

    setMessage("");
    setShowForm(true);
  }

  /*
   * Close form
   */
  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingBook(null);
    setForm(EMPTY_FORM);
  }

  /*
   * Course selection
   */
  function toggleCourse(courseId: string) {
    setForm((current) => {
      const alreadySelected =
        current.applicableCourses.includes(courseId);

      return {
        ...current,
        applicableCourses: alreadySelected
          ? current.applicableCourses.filter(
              (id) => id !== courseId
            )
          : [...current.applicableCourses, courseId],
      };
    });
  }

  /*
   * Save Book
   */
  async function saveBook() {
    setMessage("");

    if (!form.title.trim()) {
      setMessage("Please enter the book title.");
      return;
    }

    if (form.applicableCourses.length === 0) {
      setMessage("Please select at least one applicable course.");
      return;
    }

    try {
      setSaving(true);

      if (editingBook) {
        const bookRef = doc(db, "books", editingBook.id);

        await updateDoc(bookRef, {
          title: form.title.trim(),
          shortTitle: form.shortTitle.trim(),
          description: form.description.trim(),
          bookType: form.bookType,
          applicableCourses: form.applicableCourses,
          active: form.active,
          updatedAt: serverTimestamp(),
        });

        setMessage("Book updated successfully.");
      } else {
        await addDoc(collection(db, "books"), {
          title: form.title.trim(),
          shortTitle: form.shortTitle.trim(),
          description: form.description.trim(),
          bookType: form.bookType,
          applicableCourses: form.applicableCourses,
          active: form.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setMessage("Book added successfully.");
      }

      setShowForm(false);
      setEditingBook(null);
      setForm(EMPTY_FORM);
    } catch (error: any) {
  console.error("Error saving book:", error);

  const firebaseMessage =
    error?.code
      ? `${error.code}: ${error.message || "Firebase operation failed."}`
      : error?.message || "Unknown error while saving the book.";

  setMessage(firebaseMessage);
} finally {
      setSaving(false);
    }
  }

  /*
   * Toggle Active / Inactive
   */
  async function toggleActive(book: Book) {
    try {
      const bookRef = doc(db, "books", book.id);

      await updateDoc(bookRef, {
        active: !book.active,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error changing book status:", error);
      setMessage("Unable to change book status.");
    }
  }

  /*
   * Delete Book
   *
   * We keep this option available for Admin.
   * Later we can change this to Archive when
   * questions have been attached to the book.
   */
  async function deleteBook(book: Book) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "books", book.id));

      setMessage("Book deleted successfully.");
    } catch (error) {
      console.error("Error deleting book:", error);
      setMessage("Unable to delete the book.");
    }
  }

  function getCourseName(courseId: string) {
    return (
      COURSE_OPTIONS.find((course) => course.id === courseId)
        ?.name || courseId
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ================= HEADER ================= */}
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
                Manage departmental books used as the foundation
                for the IndiaPostExam question bank.
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

      {/* ================= CONTENT ================= */}
      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* Message */}
        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
            {message}
          </div>
        )}

        {/* Information */}
        <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              📚
            </div>

            <div>
              <h2 className="font-extrabold text-[#123b78]">
                Question Bank Books
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                A book can be assigned to one or more examination
                courses. Chapters, topics and questions will later
                be created under these books.
              </p>
            </div>

          </div>
        </div>

        {/* ================= BOOK LIST ================= */}

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
              Start by adding PO Guide Part-I or Postal Manual
              Vol-V. You can add additional departmental books later.
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

            {books.map((book) => (

              <div
                key={book.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >

                {/* Top */}
                <div className="flex items-start justify-between gap-4">

                  <div className="flex gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                      📘
                    </div>

                    <div>

                      <h3 className="text-lg font-extrabold text-[#123b78]">
                        {book.title}
                      </h3>

                      {book.shortTitle && (
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {book.shortTitle}
                        </p>
                      )}

                    </div>

                  </div>

                  {/* Status */}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      book.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {book.active ? "Active" : "Inactive"}
                  </span>

                </div>

                {/* Description */}
                {book.description && (
                  <p className="mt-5 text-sm leading-6 text-slate-500">
                    {book.description}
                  </p>
                )}

                {/* Type */}
                <div className="mt-5">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {book.bookType}
                  </span>
                </div>

                {/* Courses */}
                <div className="mt-5">

                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Applicable Courses
                  </p>

                  <div className="flex flex-wrap gap-2">

                    {(book.applicableCourses || []).map(
                      (courseId) => (
                        <span
                          key={courseId}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        >
                          {getCourseName(courseId)}
                        </span>
                      )
                    )}

                  </div>

                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">

                  <button
                    onClick={() => openEditForm(book)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-[#123b78] transition hover:bg-slate-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => toggleActive(book)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    {book.active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={() => deleteBook(book)}
                    className="rounded-lg border border-red-100 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* ================= ADD / EDIT MODAL ================= */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-xl font-extrabold text-[#123b78]">
                    {editingBook ? "Edit Book" : "Add Book"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Define the departmental book and its applicable courses.
                  </p>
                </div>

                <button
                  onClick={closeForm}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  ✕
                </button>

              </div>

            </div>

            {/* Modal Body */}
            <div className="space-y-5 px-6 py-6">

              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Book Title *
                </label>

                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. PO Guide Part-I"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Short Title */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Short Title
                </label>

                <input
                  type="text"
                  value={form.shortTitle}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      shortTitle: e.target.value,
                    })
                  }
                  placeholder="e.g. PO Guide-I"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of this departmental book..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Book Type */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Book Type
                </label>

                <select
                  value={form.bookType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bookType: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Departmental Book">
                    Departmental Book
                  </option>

                  <option value="Guide">
                    Guide
                  </option>

                  <option value="Manual">
                    Manual
                  </option>

                  <option value="Rules / Regulations">
                    Rules / Regulations
                  </option>

                  <option value="Reference Book">
                    Reference Book
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* Course Assignment */}
              <div>

                <label className="mb-3 block text-sm font-bold text-slate-700">
                  Applicable Courses *
                </label>

                <div className="grid gap-3 sm:grid-cols-2">

                  {COURSE_OPTIONS.map((course) => {

                    const selected =
                      form.applicableCourses.includes(course.id);

                    return (
                      <label
                        key={course.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                          selected
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >

                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleCourse(course.id)
                          }
                          className="h-4 w-4 accent-blue-700"
                        />

                        <span className="text-sm font-semibold text-slate-700">
                          {course.name}
                        </span>

                      </label>
                    );
                  })}

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  The same book can be used for multiple courses.
                </p>

              </div>

              {/* Active */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <label className="flex cursor-pointer items-center gap-3">

                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>
                    <div className="text-sm font-bold text-slate-700">
                      Book is Active
                    </div>

                    <div className="text-xs text-slate-500">
                      Inactive books will not be used for new quiz content.
                    </div>
                  </div>

                </label>

              </div>

              {/* Error / message */}
              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {message}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-5">

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
                  disabled={saving}
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