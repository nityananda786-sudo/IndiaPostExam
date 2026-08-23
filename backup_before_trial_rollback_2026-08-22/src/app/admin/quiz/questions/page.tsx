"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type Book = {
  BookID: string;
  BookName: string;
  CourseAccess?: string[];
  Active?: boolean;
};

type Chapter = {
  ChapterID: string;
  BookID: string;
  ChapterName: string;
  CourseAccess?: string[];
  Active?: boolean;
};

type Question = {
  id: string;
  questionId?: string;

  bookId: string;
  book?: string;

  chapterId: string;
  chapter?: string;

  questionText: string;

  options?: {
    id: string;
    text: string;
  }[];

  correctOptionId?: string;

  explanation?: string;

  sourceReference?: string;

  amendmentReference?: string;

  status?: "draft" | "published" | string;

  active?: boolean;

  courseAccess?: string[];

  quizEligible?: boolean;

  masterSource?: string;

  importSource?: string;

  externalQuestionId?: string;

  createdAt?: any;

  updatedAt?: any;
};

function QuestionBankPageContent() {
  const searchParams = useSearchParams();

  const initialBookId =
    searchParams.get("bookId") || "";

  const initialChapterId =
    searchParams.get("chapterId") || "";

  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>(
    []
  );
  const [questions, setQuestions] = useState<
    Question[]
  >([]);

  const [selectedBookId, setSelectedBookId] =
    useState(initialBookId);

  const [selectedChapterId, setSelectedChapterId] =
    useState(initialChapterId);

  const [searchText, setSearchText] =
    useState("");

  const [loadingBooks, setLoadingBooks] =
    useState(true);

  const [loadingChapters, setLoadingChapters] =
    useState(false);

  const [loadingQuestions, setLoadingQuestions] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [processingQuestionId, setProcessingQuestionId] =
    useState<string | null>(null);


  const [pendingReportCounts, setPendingReportCounts] =
    useState<Record<string, number>>({});
  // =====================================================
// LOAD BOOKS
// =====================================================

useEffect(() => {
  async function loadBooks() {
    try {
      setLoadingBooks(true);
      setError("");


      const snapshot = await getDocs(
        collection(db, "books")
      );

      const data: Book[] = snapshot.docs
        .map((item) => {
          const raw = item.data();

          return {
            BookID: String(
              raw.BookID ?? raw.bookId ?? item.id
            ),
            BookName: String(
              raw.BookName ?? raw.bookName ?? ""
            ),
            CourseAccess: Array.isArray(
              raw.CourseAccess
            )
              ? raw.CourseAccess
              : [],
            Active:
              (raw.Active ?? raw.active) !== false,
          };
        })
        .filter(
          (book) =>
            book.Active !== false &&
            Boolean(book.BookID) &&
            Boolean(book.BookName)
        )
        .sort((a, b) =>
          a.BookName.localeCompare(
            b.BookName
          )
        );

      setBooks(data);

      if (
        initialBookId &&
        data.some(
          (book) =>
            book.BookID === initialBookId
        )
      ) {
        setSelectedBookId(initialBookId);
      } else if (!selectedBookId) {
        if (data.length > 0) {
          setSelectedBookId(
            data[0].BookID
          );
        }
      }
    } catch (err: any) {
      console.error(
        "Error loading books:",
        err
      );

      setError(
        err?.message ||
          "Unable to load books."
      );
    } finally {
      setLoadingBooks(false);
    }
  }

  loadBooks();
}, []);

// =====================================================
// LOAD CHAPTERS
// =====================================================

useEffect(() => {
  async function loadChapters() {
    if (!selectedBookId) {
      setChapters([]);
      setSelectedChapterId("");
      return;
    }

    try {
      setLoadingChapters(true);
      setError("");


      const snapshot = await getDocs(
        query(
          collection(db, "chapters"),
          where(
            "bookId",
            "==",
            selectedBookId
          )
        )
      );

      const data: Chapter[] =
        snapshot.docs
          .map((item) => {
            const raw = item.data();

            return {
              ChapterID: String(
                raw.ChapterID ?? raw.chapterId ?? item.id
              ),
              BookID: String(
                raw.BookID ?? raw.bookId ?? ""
              ),
              ChapterName: String(
                raw.ChapterName ?? raw.chapterName ?? ""
              ),
              CourseAccess:
                Array.isArray(
                  raw.CourseAccess
                )
                  ? raw.CourseAccess
                  : [],
              Active:
                (raw.Active ?? raw.active) !== false,
            };
          })
          .filter(
            (chapter) =>
              chapter.Active !== false &&
              chapter.BookID === selectedBookId &&
              Boolean(chapter.ChapterID) &&
              Boolean(chapter.ChapterName)
          )
          .sort((a, b) =>
            a.ChapterName.localeCompare(
              b.ChapterName
            )
          );

      setChapters(data);

      if (
        initialChapterId &&
        data.some(
          (chapter) =>
            chapter.ChapterID ===
            initialChapterId
        )
      ) {
        setSelectedChapterId(
          initialChapterId
        );
      } else {
        setSelectedChapterId(
          data.length > 0
            ? data[0].ChapterID
            : ""
        );
      }
    } catch (err: any) {
      console.error(
        "Error loading chapters:",
        err
      );

      setError(
        err?.message ||
          "Unable to load chapters."
      );
    } finally {
      setLoadingChapters(false);
    }
  }

  loadChapters();
}, [selectedBookId]);

// =====================================================
// LOAD QUESTIONS
// =====================================================

useEffect(() => {
  async function loadQuestions() {
    if (
      !selectedBookId ||
      !selectedChapterId
    ) {
      setQuestions([]);
      return;
    }

    try {
      setLoadingQuestions(true);
      setError("");

      /*
       * IMPORTANT:
       *
       * Do NOT read the complete questions collection.
       *
       * Only retrieve questions belonging to the
       * currently selected Book + Chapter.
       */

      const snapshot = await getDocs(
        query(
          collection(db, "questions"),
          where(
            "bookId",
            "==",
            selectedBookId
          ),
          where(
            "chapterId",
            "==",
            selectedChapterId
          )
        )
      );

      const data: Question[] =
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...(item.data() as Omit<
              Question,
              "id"
            >),
          }))
          .sort((a, b) => {
            const aTime =
              a.createdAt?.seconds || 0;

            const bTime =
              b.createdAt?.seconds || 0;

            return bTime - aTime;
          });

      setQuestions(data);
    } catch (err: any) {
      console.error(
        "Error loading questions:",
        err
      );

      setError(
        err?.message ||
          "Unable to load questions."
      );
    } finally {
      setLoadingQuestions(false);
    }
  }

  loadQuestions();
}, [
  selectedBookId,
  selectedChapterId,
]);

// =====================================================

// =====================================================
// LOAD PENDING QUESTION REPORT COUNTS
// =====================================================

useEffect(() => {
  async function loadPendingReportCounts() {
    if (questions.length === 0) {
      setPendingReportCounts({});
      return;
    }

    try {
      const response = await fetch(
        '/api/admin/question-reports?status=pending'
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          'Unable to load question reports.'
        );
      }

      const counts: Record<string, number> = {};

      for (const report of data.reports || []) {
        const reportQuestionId = String(
          report.questionId || ''
        ).trim();

        if (!reportQuestionId) {
          continue;
        }

        if (
          questions.some(
            (question) => question.id === reportQuestionId
          )
        ) {
          counts[reportQuestionId] =
            (counts[reportQuestionId] || 0) + 1;
        }
      }

      setPendingReportCounts(counts);
    } catch (err) {
      console.error(
        'Error loading pending question reports:',
        err
      );
      setPendingReportCounts({});
    }
  }

  loadPendingReportCounts();
}, [questions]);

// =====================================================
// CHANGE BOOK
  // =====================================================

  function handleBookChange(
    bookId: string
  ) {
    setSelectedBookId(bookId);
    setSelectedChapterId("");
    setSearchText("");
    setError("");
    setMessage("");
  }

  // =====================================================
  // CHANGE CHAPTER
  // =====================================================

  function handleChapterChange(
    chapterId: string
  ) {
    setSelectedChapterId(chapterId);
    setSearchText("");
    setError("");
    setMessage("");
  }

  // =====================================================
  // PUBLISH / UNPUBLISH
  // =====================================================

  async function togglePublish(
    question: Question
  ) {
    try {
      setProcessingQuestionId(
        question.id
      );

      setError("");
      setMessage("");

      const newStatus =
        question.status === "published"
          ? "draft"
          : "published";

      await updateDoc(
        doc(
          db,
          "questions",
          question.id
        ),
        {
          status: newStatus,
          updatedAt:
            serverTimestamp(),
        }
      );

      setMessage(
        newStatus === "published"
          ? "Question published successfully."
          : "Question moved back to draft."
      );
    } catch (err: any) {
      console.error(
        "Error changing question status:",
        err
      );

      setError(
        err?.message ||
          "Unable to change question status."
      );
    } finally {
      setProcessingQuestionId(null);
    }
  }

  // =====================================================
  // ACTIVATE / DEACTIVATE
  // =====================================================

  async function toggleActive(
    question: Question
  ) {
    try {
      setProcessingQuestionId(
        question.id
      );

      setError("");
      setMessage("");

      const newActive =
        question.active === false;

      await updateDoc(
        doc(
          db,
          "questions",
          question.id
        ),
        {
          active: newActive,
          updatedAt:
            serverTimestamp(),
        }
      );

      setMessage(
        newActive
          ? "Question activated successfully."
          : "Question deactivated successfully."
      );
    } catch (err: any) {
      console.error(
        "Error changing active status:",
        err
      );

      setError(
        err?.message ||
          "Unable to change active status."
      );
    } finally {
      setProcessingQuestionId(null);
    }
  }

  // =====================================================
  // =====================================================
  // QUIZ ELIGIBLE / NOT ELIGIBLE
  // =====================================================

  async function toggleQuizEligible(
    question: Question
  ) {
    try {
      setProcessingQuestionId(question.id);
      setError("");
      setMessage("");

      if (
        question.quizEligible !== true &&
        (question.status !== "published" ||
          question.active === false)
      ) {
        setError(
          "Question must be Published and Active before it can be made Quiz Eligible."
        );
        return;
      }

      const newQuizEligible =
        question.quizEligible !== true;

      await updateDoc(
        doc(db, "questions", question.id),
        {
          quizEligible: newQuizEligible,
          updatedAt: serverTimestamp(),
        }
      );

      setMessage(
        newQuizEligible
          ? "Question is now Quiz Eligible."
          : "Question removed from Quiz Eligible."
      );
    } catch (err: any) {
      console.error(
        "Error changing quiz eligibility:",
        err
      );

      setError(
        err?.message ||
          "Unable to change quiz eligibility."
      );
    } finally {
      setProcessingQuestionId(null);
    }
  }

  // DELETE
  // =====================================================

  async function deleteQuestion(
    question: Question
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this question?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingQuestionId(
        question.id
      );

      setError("");
      setMessage("");

      await deleteDoc(
        doc(
          db,
          "questions",
          question.id
        )
      );

      setMessage(
        "Question deleted successfully."
      );
    } catch (err: any) {
      console.error(
        "Error deleting question:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete question."
      );
    } finally {
      setProcessingQuestionId(null);
    }
  }

  // =====================================================
  // FILTER QUESTIONS
  // =====================================================

  const filteredQuestions =
    questions.filter((question) => {
      const search =
        searchText.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        question.questionText
          ?.toLowerCase()
          .includes(search) ||
        question.id
          ?.toLowerCase()
          .includes(search) ||
        question.sourceReference
          ?.toLowerCase()
          .includes(search)
      );
    });

  // =====================================================
  // SELECTED BOOK / CHAPTER
  // =====================================================

  const selectedBook = books.find(
  (book) =>
    book.BookID === selectedBookId
);

  const selectedChapter = chapters.find(
  (chapter) =>
    chapter.ChapterID ===
    selectedChapterId
);

  

  // =====================================================
  // PAGE
  // =====================================================

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
          Back to Quiz Management
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Master Question Bank
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">
            Manage departmental examination
            questions by book and chapter.
          </p>

        </div>

      </section>


      {/* =================================================
          MAIN
      ================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}


        {/* =================================================
            BOOK / CHAPTER
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="grid gap-5 md:grid-cols-2">

            {/* BOOK */}

            <div>

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
                    handleBookChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="">
                    Select Book
                  </option>

                  {books
                    .filter(
                      (book) =>
                        book.Active !== false
                    )
                    .map((book) => (

                      <option
                        key={book.BookID}
                        value={book.BookID}
                      >
                        {book.BookName}
                      </option>

                    ))}

                </select>

              )}

            </div>


            {/* CHAPTER */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Select Chapter
              </label>

              {loadingChapters ? (

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Loading chapters...
                </div>

              ) : (

                <select
                  value={selectedChapterId}
                  onChange={(e) =>
                    handleChapterChange(
                      e.target.value
                    )
                  }
                  disabled={
                    !selectedBookId ||
                    chapters.length === 0
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >

                  <option value="">
                    {selectedBookId
                      ? chapters.length === 0
                        ? "No chapters available"
                        : "Select Chapter"
                      : "Select Book First"}
                  </option>

                  {chapters.map(
                    (chapter) => (

                      <option
                        key={chapter.ChapterID}
                        value={chapter.ChapterID}
                      >
                        {chapter.ChapterName}
                      </option>

                    )
                  )}

                </select>

              )}

            </div>

          </div>


          {/* CURRENT SELECTION */}

          {(selectedBook ||
            selectedChapter) && (

            <div className="mt-6 flex flex-wrap gap-3">

              {selectedBook && (

                <div className="rounded-xl bg-blue-50 px-4 py-3">

                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                    Book
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-[#123f82]">
                    {selectedBook.BookName}
                  </p>

                </div>

              )}

              {selectedChapter && (

                <div className="rounded-xl bg-purple-50 px-4 py-3">

                  <p className="text-xs font-bold uppercase tracking-wide text-purple-500">
                    Chapter
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-purple-800">
                    {selectedChapter.ChapterName}
                  </p>

                </div>

              )}

            </div>

          )}

        </div>


        {/* =================================================
            QUESTION HEADER
        ================================================= */}

        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <h2 className="text-2xl font-extrabold text-[#123f82]">
              Question Bank
            </h2>

            <p className="mt-1 text-sm text-slate-500">

              {loadingQuestions
                ? "Loading questions..."
                : `${questions.length} question${
                    questions.length === 1
                      ? ""
                      : "s"
                  } in this chapter`}

            </p>

          </div>


          <div className="flex flex-wrap gap-3">


            {/* QUESTION UNIQUENESS AUDIT */}

            <Link
              href="/admin/quiz/questions/audit"
              className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-100"
            >
              Question Audit
            </Link>

            {/* FUTURE EXCEL */}

            <button
              type="button"
              disabled
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-400 shadow-sm"
              title="Excel import will be added later."
            >
                  Import Excel
            </button>


            {/* ADD */}

            

          </div>

        </div>


        {/* =================================================
            SEARCH
        ================================================= */}

        {selectedChapterId &&
          questions.length > 0 && (

            <div className="mt-5">

              <input
                type="text"
                value={searchText}
                onChange={(e) =>
                  setSearchText(
                    e.target.value
                  )
                }
                placeholder="Search question, Question ID or source reference..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          )}


        {/* =================================================
            QUESTION LIST
        ================================================= */}

        <div className="mt-5">

          {loadingQuestions ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="text-sm font-semibold text-slate-500">
                Loading questions...
              </div>
            </div>

          ) : !selectedBookId ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="text-5xl">

              </div>

              <h3 className="mt-4 text-xl font-extrabold text-[#123f82]">
                Select a book
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Select a book first, then choose
                a chapter to manage its questions.
              </p>

            </div>

          ) : !selectedChapterId ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="text-5xl">

              </div>

              <h3 className="mt-4 text-xl font-extrabold text-[#123f82]">
                Select a chapter
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Select a chapter to open its
                master question bank.
              </p>

            </div>

          ) : questions.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="text-5xl">

              </div>

              <h3 className="mt-4 text-xl font-extrabold text-[#123f82]">
                No questions yet
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Add questions individually now.
                Bulk Excel and Google Sheets
                import will be connected later.
              </p>

              

            </div>

          ) : filteredQuestions.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="text-4xl">

              </div>

              <h3 className="mt-3 text-lg font-extrabold text-[#123f82]">
                No matching questions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try a different search term.
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {filteredQuestions.map(
                (question, index) => {

                  const isProcessing =
                    processingQuestionId ===
                    question.id;

                  const isPublished =
                    question.status ===
                    "published";

                  const isActive =
                    question.active !== false;

                  return (

                    <div
                      key={question.id}
                      className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
                        !isActive
                          ? "border-slate-300 opacity-75"
                          : "border-slate-200"
                      }`}
                    >

                      <div className="flex gap-4">

                        {/* NUMBER */}

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-[#123f82]">
                          {index + 1}
                        </div>


                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">

                          {/* BADGES */}

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                              ID: {question.id}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                isPublished
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {isPublished
                                ? "Published"
                                : "Draft"}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                isActive
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {isActive
                                ? "Active"
                                : "Inactive"}
                            </span>

                            {question.importSource && (

                              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                                {question.importSource ===
                                "google_sheets"
                                  ? "Google Sheets"
                                  : question.importSource ===
                                    "excel"
                                  ? "Excel"
                                  : "Admin"}
                              </span>

                            )}

                          </div>


                          {/* QUESTION */}

                          <p className="mt-4 whitespace-pre-wrap text-base font-semibold leading-7 text-slate-900">
                            {question.questionText}
                          </p>


                          {/* OPTIONS */}

                          {question.options &&
                            question.options.length > 0 && (

                              <div className="mt-4 grid gap-2 md:grid-cols-2">

                                {question.options.map(
                                  (
                                    option,
                                    optionIndex
                                  ) => {

                                    const letter =
                                      String.fromCharCode(
                                        65 +
                                          optionIndex
                                      );

                                    const isCorrect =
                                      question.correctOptionId ===
                                      option.id;

                                    return (

                                      <div
                                        key={
                                          option.id
                                        }
                                        className={`rounded-lg border px-3 py-2 text-base ${
                                          isCorrect
                                            ? "border-emerald-300 bg-emerald-50"
                                            : "border-slate-200 bg-slate-50"
                                        }`}
                                      >

                                        <span className="font-extrabold text-[#123f82]">
                                          {letter}.
                                        </span>{" "}

                                        <span className="text-slate-600">
                                          {
                                            option.text
                                          }
                                        </span>

                                        {isCorrect && (

                                          <span className="ml-2 text-xs font-bold text-emerald-700">
                                            Correct
                                          </span>

                                        )}

                                      </div>

                                    );
                                  }
                                )}

                              </div>

                            )}


                          {/* REFERENCES */}

                          {(question.sourceReference ||
                            question.amendmentReference) && (

                            <div className="mt-4 space-y-1 text-xs text-slate-500">

                              {question.sourceReference && (

                                <p>
                                  <span className="font-bold">
                                    Source:
                                  </span>{" "}
                                  {
                                    question.sourceReference
                                  }
                                </p>

                              )}

                              {question.amendmentReference && (

                                <p>
                                  <span className="font-bold">
                                    Amendment:
                                  </span>{" "}
                                  {
                                    question.amendmentReference
                                  }
                                </p>

                              )}

                            </div>

                          )}


                          {/* ACTIONS */}

                          <div className="mt-5 flex flex-wrap gap-2">


                          {/* PENDING REPORTS */}

                          {(pendingReportCounts[question.id] || 0) > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">

                              <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700">
                                {pendingReportCounts[question.id]}
                                {" "}
                                {pendingReportCounts[question.id] === 1
                                  ? "Pending Report"
                                  : "Pending Reports"}
                              </span>

                              <Link
                                href="/admin/quiz/question-reports"
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-50"
                              >
                                Review Reports
                              </Link>

                            </div>
                          )}

                            {/* EDIT */}

                            <Link
                              href={`/admin/quiz/questions/${question.id}/edit`}
                              className={`rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-[#123f82] transition hover:bg-slate-50 ${
                                isProcessing
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }`}
                            >
                              Edit
                            </Link>


                            {/* PUBLISH */}

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                togglePublish(
                                  question
                                )
                              }
                              className="rounded-lg border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isProcessing
                                ? "Processing..."
                                : isPublished
                              ? "Unpublish"
                              : "Publish"}
                            </button>


                            {/* ACTIVE */}

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                toggleActive(
                                  question
                                )
                              }
                              className="rounded-lg border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isProcessing
                                ? "Processing..."
                                : isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>



                            {/* QUIZ ELIGIBLE */}

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                toggleQuizEligible(
                                  question
                                )
                              }
                              className={`rounded-lg border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                question.quizEligible === true
                                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                  : "border-purple-200 text-purple-700 hover:bg-purple-50"
                              }`}
                            >
                              {isProcessing
                                ? "Processing..."
                                : question.quizEligible === true
                                ? "Quiz Eligible: Yes"
                                : "Quiz Eligible: No"}
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                deleteQuestion(
                                  question
                                )
                              }
                              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>

                          </div>

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>


        {/* =================================================
            QUIZ SET PREVIEW
        ================================================= */}

        {selectedChapterId && (

          <div className="mt-10 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-500">
                  Next Stage
                </p>

                <h3 className="mt-1 text-lg font-extrabold text-[#123f82]">
                  Generate 15-Question Quiz Sets
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The master question bank will
                  later generate curated 15-question
                  sets and random practice quizzes.
                </p>

              </div>

              <div className="rounded-xl bg-white px-5 py-3 text-center shadow-sm">

                <p className="text-xs font-bold text-slate-400">
                  QUESTIONS
                </p>

                <p className="text-2xl font-extrabold text-[#123f82]">
                  {questions.length}
                </p>

              </div>

            </div>

          </div>

        )}

            </section>
    </main>
  );
}

export default function QuestionBankPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500 shadow-sm">
              Loading Question Bank...
            </div>
          </div>
        </main>
      }
    >
      <QuestionBankPageContent />
    </Suspense>
  );
}








