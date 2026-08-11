"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  shortTitle?: string;
  active?: boolean;
};

type Chapter = {
  id: string;
  bookId: string;
  title: string;
  shortTitle?: string;
  description?: string;
  order?: number;
  active?: boolean;
};

const EMPTY_FORM = {
  bookId: "",
  title: "",
  shortTitle: "",
  description: "",
  order: 1,
  active: true,
};

export default function ChaptersAdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [selectedBookId, setSelectedBookId] = useState("");

  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingChapter, setEditingChapter] =
    useState<Chapter | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // =====================================================
  // LOAD BOOKS
  // =====================================================

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
        setLoadingBooks(false);

        // Automatically select first active book
        if (!selectedBookId) {
          const firstActiveBook = data.find(
            (book) => book.active !== false
          );

          if (firstActiveBook) {
            setSelectedBookId(firstActiveBook.id);
          }
        }
      },
      (error) => {
        console.error("Error loading books:", error);
        setMessage(
          error.message || "Unable to load books."
        );
        setLoadingBooks(false);
      }
    );

    return () => unsubscribe();
  }, [selectedBookId]);

  // =====================================================
  // LOAD CHAPTERS
  // =====================================================

  useEffect(() => {
    if (!selectedBookId) {
      setChapters([]);
      return;
    }

    setLoadingChapters(true);
    setMessage("");

    const chaptersRef = collection(db, "chapters");

    const unsubscribe = onSnapshot(
      chaptersRef,
      (snapshot) => {
        const data: Chapter[] = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Chapter, "id">),
          }))
          .filter(
            (chapter) =>
              chapter.bookId === selectedBookId
          )
          .sort(
            (a, b) =>
              (a.order || 0) - (b.order || 0)
          );

        setChapters(data);
        setLoadingChapters(false);
      },
      (error) => {
        console.error("Error loading chapters:", error);

        setMessage(
          error.message || "Unable to load chapters."
        );

        setLoadingChapters(false);
      }
    );

    return () => unsubscribe();
  }, [selectedBookId]);

  // =====================================================
  // ADD CHAPTER
  // =====================================================

  function openAddForm() {
    setEditingChapter(null);

    setForm({
      ...EMPTY_FORM,
      bookId: selectedBookId,
      order: chapters.length + 1,
    });

    setMessage("");
    setShowForm(true);
  }

  // =====================================================
  // EDIT CHAPTER
  // =====================================================

  function openEditForm(chapter: Chapter) {
    setEditingChapter(chapter);

    setForm({
      bookId: chapter.bookId,
      title: chapter.title || "",
      shortTitle: chapter.shortTitle || "",
      description: chapter.description || "",
      order: chapter.order || 1,
      active: chapter.active !== false,
    });

    setMessage("");
    setShowForm(true);
  }

  // =====================================================
  // CLOSE FORM
  // =====================================================

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingChapter(null);
    setForm(EMPTY_FORM);
  }

  // =====================================================
  // SAVE CHAPTER
  // =====================================================

  async function saveChapter() {
    setMessage("");

    if (!form.bookId) {
      setMessage("Please select a book.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Please enter the chapter title.");
      return;
    }

    try {
      setSaving(true);

      if (editingChapter) {
        const chapterRef = doc(
          db,
          "chapters",
          editingChapter.id
        );

        await updateDoc(chapterRef, {
          bookId: form.bookId,
          title: form.title.trim(),
          shortTitle: form.shortTitle.trim(),
          description: form.description.trim(),
          order: Number(form.order) || 1,
          active: form.active,
          updatedAt: serverTimestamp(),
        });

        setMessage(
          "Chapter updated successfully."
        );
      } else {
        await addDoc(collection(db, "chapters"), {
          bookId: form.bookId,
          title: form.title.trim(),
          shortTitle: form.shortTitle.trim(),
          description: form.description.trim(),
          order: Number(form.order) || 1,
          active: form.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setMessage(
          "Chapter added successfully."
        );
      }

      setShowForm(false);
      setEditingChapter(null);
      setForm(EMPTY_FORM);
    } catch (error: any) {
      console.error(
        "Error saving chapter:",
        error
      );

      setMessage(
        error?.message ||
          "Unable to save chapter."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // TOGGLE ACTIVE
  // =====================================================

  async function toggleActive(
    chapter: Chapter
  ) {
    try {
      await updateDoc(
        doc(db, "chapters", chapter.id),
        {
          active: !chapter.active,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error: any) {
      console.error(
        "Error changing chapter status:",
        error
      );

      setMessage(
        error?.message ||
          "Unable to change chapter status."
      );
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function deleteChapter(
    chapter: Chapter
  ) {
    const confirmed = window.confirm(
      `Delete "${chapter.title}"?\n\nThis should only be done if no questions or topics are attached to this chapter.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "chapters", chapter.id)
      );

      setMessage(
        "Chapter deleted successfully."
      );
    } catch (error: any) {
      console.error(
        "Error deleting chapter:",
        error
      );

      setMessage(
        error?.message ||
          "Unable to delete chapter."
      );
    }
  }

  const selectedBook = books.find(
    (book) => book.id === selectedBookId
  );

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="bg-[#123f82] text-white">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <Link
            href="/admin/quiz"
            className="mb-5 inline-flex items-center text-sm font-semibold text-white/80 transition hover:text-white"
          >
            ← Back to Quiz Management
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Chapters & Topics
          </h1>

          <p className="mt-3 max-w-2xl text-white/80">
            Organize the master question bank by book,
            chapter and topic.
          </p>

        </div>

      </section>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* Message */}

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
            {message}
          </div>
        )}


        {/* =================================================
            BOOK SELECTOR
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div className="flex-1">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Select Book
              </label>

              {loadingBooks ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Loading books...
                </div>
              ) : (
                <select
                  value={selectedBookId}
                  onChange={(e) =>
                    setSelectedBookId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select a book
                  </option>

                  {books
                    .filter(
                      (book) =>
                        book.active !== false
                    )
                    .map((book) => (
                      <option
                        key={book.id}
                        value={book.id}
                      >
                        {book.title}
                      </option>
                    ))}
                </select>
              )}

            </div>

            <button
              type="button"
              onClick={openAddForm}
              disabled={!selectedBookId}
              className="rounded-xl bg-[#123f82] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add Chapter
            </button>

          </div>

          {selectedBook && (
            <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                Current Book
              </p>

              <p className="mt-1 font-extrabold text-[#123f82]">
                {selectedBook.title}
              </p>

            </div>
          )}

        </div>


        {/* =================================================
            CHAPTER LIST
        ================================================= */}

        <div className="mt-8">

          {loadingChapters ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">
              Loading chapters...
            </div>

          ) : !selectedBookId ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="text-5xl">
                📖
              </div>

              <h2 className="mt-4 text-xl font-extrabold text-[#123f82]">
                Select a book
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Select a departmental book above to
                manage its chapters.
              </p>

            </div>

          ) : chapters.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="text-5xl">
                📖
              </div>

              <h2 className="mt-4 text-xl font-extrabold text-[#123f82]">
                No chapters yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Start organizing this book by adding
                its first chapter.
              </p>

              <button
                type="button"
                onClick={openAddForm}
                className="mt-6 rounded-xl bg-[#123f82] px-5 py-3 text-sm font-bold text-white"
              >
                + Add First Chapter
              </button>

            </div>

          ) : (

            <div className="space-y-4">

              {chapters.map(
                (chapter, index) => (

                  <div
                    key={chapter.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* Chapter Info */}

                      <div className="flex gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-extrabold text-[#123f82]">
                          {chapter.order ||
                            index + 1}
                        </div>

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-lg font-extrabold text-[#123f82]">
                              {chapter.title}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                chapter.active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {chapter.active
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </div>

                          {chapter.shortTitle && (
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {chapter.shortTitle}
                            </p>
                          )}

                          {chapter.description && (
                            <p className="mt-2 text-sm text-slate-500">
                              {chapter.description}
                            </p>
                          )}

                        </div>

                      </div>


                      {/* Actions */}

                      <div className="flex flex-wrap gap-2">

                        <Link
                          href={`/admin/quiz/chapters/${chapter.id}/topics`}
                          className="rounded-lg bg-[#123f82] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0d326a]"
                        >
                          Manage Topics →
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(
                              chapter
                            )
                          }
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-[#123f82] hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(
                              chapter
                            )
                          }
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                          {chapter.active
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteChapter(
                              chapter
                            )
                          }
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}

            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-extrabold text-[#123f82]">
                    {editingChapter
                      ? "Edit Chapter"
                      : "Add Chapter"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Organize the selected departmental book.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>

              </div>

            </div>


            {/* Modal Body */}

            <div className="space-y-5 px-6 py-6">

              {/* Book */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Book
                </label>

                <select
                  value={form.bookId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bookId: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="">
                    Select Book
                  </option>

                  {books.map((book) => (
                    <option
                      key={book.id}
                      value={book.id}
                    >
                      {book.title}
                    </option>
                  ))}

                </select>

              </div>


              {/* Title */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Chapter Title *
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
                  placeholder="e.g. General Provisions"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  placeholder="Optional short name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  placeholder="Brief description of this chapter..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>


              {/* Order */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Chapter Order
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      order:
                        Number(e.target.value) ||
                        1,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Determines the display sequence.
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
                        active:
                          e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />

                  <div>

                    <div className="text-sm font-bold text-slate-700">
                      Chapter is Active
                    </div>

                    <div className="text-xs text-slate-500">
                      Inactive chapters will not be available
                      for new question content.
                    </div>

                  </div>

                </label>

              </div>

            </div>


            {/* Footer */}

            <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-5">

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveChapter}
                  disabled={saving}
                  className="rounded-xl bg-[#123f82] px-6 py-3 text-sm font-bold text-white hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingChapter
                    ? "Update Chapter"
                    : "Save Chapter"}
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}