"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

type Question = {
  id: string;
  questionText: string;
  book: string;
  chapter: string;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId?: string;
};


type Book = {
  id: string;
  BookID: string;
  BookName: string;
  Active?: boolean;
};

type Chapter = {
  id: string;
  ChapterID: string;
  BookID: string;
  ChapterName: string;
  Active?: boolean;
};
export default function QuizPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");

  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [revisionQuestionIds, setRevisionQuestionIds] = useState<Set<string>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // =====================================================
  // QUESTION REPORT / CORRECTION SUGGESTION
  // =====================================================

  const [reportOpen, setReportOpen] =
    useState(false);

  const [reportReason, setReportReason] =
    useState("");

  const [reportComment, setReportComment] =
    useState("");

  const [reportSubmitting, setReportSubmitting] =
    useState(false);

  const [reportMessage, setReportMessage] =
    useState("");

  const correctCount = questions.filter(
    (question) =>
      selectedAnswers[question.id] === question.correctOptionId
  ).length;

  const attemptedCount = Object.keys(selectedAnswers).length;

  const wrongCount = attemptedCount - correctCount;

  const maximumMarks = questions.length * 2;

  const percentage =
    maximumMarks > 0
      ? (score / maximumMarks) * 100
      : 0;


  async function toggleRevision(questionId: string) {
    if (!user) {
      setError("Please login to mark questions for revision.");
      return;
    }

    try {
      const revisionRef = doc(
        db,
        "users",
        user.uid,
        "revisionQuestions",
        questionId
      );

      const existing = await getDoc(revisionRef);

      if (existing.exists()) {
        await deleteDoc(revisionRef);

        setRevisionQuestionIds((current) => {
          const next = new Set(current);
          next.delete(questionId);
          return next;
        });
      } else {
        await setDoc(revisionRef, {
          questionId,
          markedAt: new Date(),
        });

        setRevisionQuestionIds((current) => {
          const next = new Set(current);
          next.add(questionId);
          return next;
        });
      }
    } catch (err) {
      console.error("Revision mark error:", err);
      setError("Unable to update revision mark.");
    }
  }

  

  // =====================================================
  // SUBMIT QUESTION REPORT
  // =====================================================

  async function submitQuestionReport() {

    if (!user) {
      setReportMessage(
        "Please login to report a question."
      );
      return;
    }

    if (!reportReason) {
      setReportMessage(
        "Please select a reason."
      );
      return;
    }

    if (!currentQuestion) {
      return;
    }

    try {
      setReportSubmitting(true);
      setReportMessage("");

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/question-reports",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                questionId:
                  currentQuestion.id,

                context:
                  "practice",

                reason:
                  reportReason,

                comment:
                  reportComment.trim(),

                selectedOptionId:
                  selectedOptionId || "",
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          "Unable to submit the report."
        );
      }

      setReportMessage(
        "Thank you. Your correction suggestion has been submitted for review."
      );

      setReportReason("");
      setReportComment("");

    } catch (err: any) {

      console.error(
        "Question report submission error:",
        err
      );

      setReportMessage(
        err?.message ||
        "Unable to submit the report."
      );

    } finally {
      setReportSubmitting(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadRevisionQuestions() {
      if (!user) {
        setRevisionQuestionIds(new Set());
        return;
      }

      try {
        const snapshot = await getDocs(
          collection(
            db,
            "users",
            user.uid,
            "revisionQuestions"
          )
        );

        const ids = new Set<string>(
          snapshot.docs.map((item) => item.id)
        );

        setRevisionQuestionIds(ids);
      } catch (err) {
        console.error("Error loading revision questions:", err);
      }
    }

    loadRevisionQuestions();
  }, [user]);


  // =====================================================
  // LOAD PRACTICE BOOK CATALOGUE
  // =====================================================

  useEffect(() => {
    async function loadBooks() {
      try {
        setCatalogueLoading(true);
        setError("");

        const booksQuery = query(
          collection(db, "books"),
          where("active", "==", true)
        );

        const booksSnapshot = await getDocs(
          booksQuery
        );

        const loadedBooks: Book[] =
          booksSnapshot.docs
            .map((bookDoc) => {
              const data = bookDoc.data();

              return {
                id: bookDoc.id,
                BookID: String(
                  data.BookID ??
                  data.bookId ??
                  bookDoc.id
                ),
                BookName: String(
                  data.BookName ??
                  data.bookName ??
                  ""
                ),
                Active:
                  data.Active !== false &&
                  data.active !== false,
              };
            })
            .filter(
              (book) =>
                book.Active !== false &&
                Boolean(book.BookID) &&
                Boolean(book.BookName)
            )
            .sort((a, b) =>
              a.BookName.localeCompare(b.BookName)
            );

        setBooks(loadedBooks);
      } catch (err) {
        console.error(
          "Unable to load practice books:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load practice books."
        );
      } finally {
        setCatalogueLoading(false);
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  // =====================================================
  // LOAD CHAPTERS FOR SELECTED BOOK
  // =====================================================

  useEffect(() => {
    async function loadChapters() {
      if (!selectedBookId) {
        setChapters([]);
        return;
      }

      try {
        setError("");

        const chaptersQuery = query(
          collection(db, "chapters"),
          where("bookId", "==", selectedBookId),
          where("active", "==", true)
        );

        const snapshot =
          await getDocs(chaptersQuery);

        const loadedChapters: Chapter[] =
          snapshot.docs
            .map((chapterDoc) => {
              const data = chapterDoc.data();

              return {
                id: chapterDoc.id,
                ChapterID: String(
                  data.ChapterID ??
                  data.chapterId ??
                  chapterDoc.id
                ),
                BookID: String(
                  data.BookID ??
                  data.bookId ??
                  selectedBookId
                ),
                ChapterName: String(
                  data.ChapterName ??
                  data.chapterName ??
                  ""
                ),
                Active:
                  data.Active !== false &&
                  data.active !== false,
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

        setChapters(loadedChapters);
      } catch (err) {
        console.error(
          "Unable to load chapters:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load chapters."
        );
      }
    }

    loadChapters();
  }, [selectedBookId]);
  // =====================================================
  // START PRACTICE FOR SELECTED CHAPTER
  // =====================================================

  async function startChapterPractice(
    bookId: string,
    chapterId: string
  ) {
    try {
      setError("");
      setLoading(true);

      const questionsQuery = query(
        collection(db, "questions"),
        where("bookId", "==", bookId),
        where("chapterId", "==", chapterId),
        where("active", "==", true),
        where("status", "==", "published"),
        where("quizEligible", "==", true)
      );

      const snapshot =
        await getDocs(questionsQuery);

      const loadedQuestions: Question[] =
        snapshot.docs.map((questionDoc) => {
          const data = questionDoc.data();

          const loadedOptions =
            Array.isArray(data.options)
              ? data.options
                  .map((option: any) => ({
                    id: String(option.id || ""),
                    text: String(option.text || ""),
                  }))
                  .filter(
                    (option: {
                      id: string;
                      text: string;
                    }) =>
                      Boolean(option.id) &&
                      Boolean(option.text)
                  )
              : [];

          return {
            id:
              data.questionId ||
              questionDoc.id,

            questionText:
              data.questionText || "",

            book:
              data.book || "",

            chapter:
              data.chapter || "",

            options:
              loadedOptions,

            correctOptionId:
              data.correctOptionId || "",
          };
        });

      if (loadedQuestions.length === 0) {
        setQuestions([]);

        setError(
          "No practice questions are available for this chapter yet."
        );

        setLoading(false);
        return;
      }

      setSelectedBookId(bookId);
      setSelectedChapterId(chapterId);

      setQuestions(loadedQuestions);

      setSelectedAnswers({});
      setAnsweredQuestions(new Set());
      setCurrentQuestionIndex(0);
      setScore(0);
      setPracticeSubmitted(false);
      setReviewMode(false);

      setLoading(false);
    } catch (err) {
      console.error(
        "Unable to load chapter questions:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load questions for this chapter."
      );

      setLoading(false);
    }
  }
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="font-semibold text-gray-700">
          Loading questions...
        </p>
      </main>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion && selectedChapterId) {
    return null;
}

  const selectedOptionId = currentQuestion ? (selectedAnswers[currentQuestion.id] || "") : "";

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  function goToNextQuestion() {
    if (!selectedOptionId) return;
    if (!isLastQuestion) {
      setCurrentQuestionIndex((current) => current + 1);
    }
  }

  function submitPractice() {
    if (!isLastQuestion || !selectedOptionId) {
      return;
    }

    setPracticeSubmitted(true);
  }

  function startReview() {
    setPracticeSubmitted(false);
    setReviewMode(true);
    setCurrentQuestionIndex(0);
  }
  function changeChapter() {
    setQuestions([]);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setCurrentQuestionIndex(0);
    setScore(0);
    setPracticeSubmitted(false);
    setReviewMode(false);
    setSelectedChapterId("");
    setError("");
  }

  function restartPractice() {
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setCurrentQuestionIndex(0);
    setScore(0);
    setPracticeSubmitted(false);
    setError("");
  }
  // =====================================================
  // PRACTICE CATALOGUE
  // =====================================================

  if (!selectedChapterId) {
    return (
      <main className="min-h-screen bg-slate-100 text-[#10244a]">

        {/* TOP NAVIGATION */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-red-600 sm:text-xs">
                IndiaPostExam
              </p>

              <h1 className="truncate text-lg font-black sm:text-xl">
                Practice Quiz
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">

              <a
                href="/dashboard"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-[#123f82] transition hover:bg-slate-50 sm:px-4 sm:text-sm"
              >
                Dashboard
              </a>

              <button
                type="button"
                onClick={async () => {
                  await auth.signOut();
                  window.location.href = "/login";
                }}
                className="rounded-lg bg-[#123f82] px-3 py-2 text-xs font-extrabold text-white transition hover:bg-[#0d326a] sm:px-4 sm:text-sm"
              >
                Sign Out
              </button>

            </div>

          </div>
        </header>


        {/* CATALOGUE */}
        <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">

          <div className="mb-5 sm:mb-7">

            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-600">
              Practice Centre
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10244a] sm:text-3xl">
              Choose a Book & Chapter
            </h2>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Select a chapter to begin practice. You can practice all
              available questions from the selected chapter.
            </p>

          </div>


          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}


          <div className="grid gap-4 lg:grid-cols-[310px_1fr]">


            {/* BOOK CATALOGUE */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

              <div className="mb-3 border-b border-slate-100 pb-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Books
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Select a book to view chapters
                </p>
              </div>


              {catalogueLoading ? (

                <div className="py-8 text-center">
                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#123f82]" />

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Loading books...
                  </p>
                </div>

              ) : books.length === 0 ? (

                <div className="rounded-xl bg-slate-50 p-5 text-center">
                  <p className="text-sm font-bold text-slate-600">
                    No books available.
                  </p>
                </div>

              ) : (

                <div className="space-y-1.5">

                  {books.map((book) => {

                    const selected =
                      selectedBookId === book.BookID;

                    return (
                      <button
                        key={book.BookID}
                        type="button"
                        onClick={() => {
                          setSelectedBookId(book.BookID);
                          setSelectedChapterId("");
                          setChapters([]);
                          setQuestions([]);
                          setError("");
                        }}
                        className={`w-full rounded-xl px-3.5 py-3 text-left text-sm font-bold transition ${
                          selected
                            ? "bg-[#123f82] text-white shadow-sm"
                            : "bg-slate-50 text-[#10244a] hover:bg-blue-50 hover:text-[#123f82]"
                        }`}
                      >
                        {book.BookName}
                      </button>
                    );
                  })}

                </div>

              )}

            </aside>


            {/* CHAPTER AREA */}
            <section className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

              {!selectedBookId ? (

                <div className="flex min-h-[360px] items-center justify-center px-4 text-center">

                  <div className="max-w-md">

                    <h3 className="text-xl font-black text-[#10244a] sm:text-2xl">
                      Select a book
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose a book from the catalogue to see its chapters
                      and start practicing.
                    </p>

                  </div>

                </div>

              ) : (

                <>

                  <div className="mb-5 border-b border-slate-100 pb-4">

                    <p className="text-xs font-extrabold uppercase tracking-wide text-red-600">
                      Selected Book
                    </p>

                    <h3 className="mt-1 text-xl font-black text-[#10244a] sm:text-2xl">
                      {
                        books.find(
                          (book) =>
                            book.BookID ===
                            selectedBookId
                        )?.BookName
                      }
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Select a chapter below to begin practice.
                    </p>

                  </div>


                  {chapters.length === 0 ? (

                    <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-slate-50 px-5 text-center">

                      <div>

                        <p className="text-base font-bold text-slate-600">
                          No chapters available
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Chapters for this book are not available yet.
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="grid gap-3 sm:grid-cols-2">

                      {chapters.map((chapter, index) => (

                        <button
                          key={chapter.ChapterID}
                          type="button"
                          onClick={() =>
                            startChapterPractice(
                              selectedBookId,
                              chapter.ChapterID
                            )
                          }
                          className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm active:scale-[0.99]"
                        >

                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-600">
                            Chapter {index + 1}
                          </p>

                          <p className="mt-1.5 text-sm font-extrabold leading-5 text-[#10244a] sm:text-base">
                            {chapter.ChapterName}
                          </p>

                          <p className="mt-3 text-xs font-bold text-[#123f82]">
                            Start Practice →
                          </p>

                        </button>

                      ))}

                    </div>

                  )}

                </>

              )}

            </section>

          </div>

        </main>

      </main>
    );
  }
  if (practiceSubmitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-3xl items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                ✓
              </div>

              <h1 className="mt-4 text-2xl font-extrabold text-[#101a35] sm:text-3xl">
                Practice Completed
              </h1>

              <p className="mt-1 font-semibold text-slate-500">
                {currentQuestion.book}
              </p>

              <p className="text-sm font-semibold text-slate-500">
                {currentQuestion.chapter}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <p className="text-xs font-bold text-blue-600">Total</p>
                <p className="mt-1 text-2xl font-extrabold text-blue-900">
                  {questions.length}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-xs font-bold text-emerald-600">Correct</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-900">
                  {correctCount}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-xs font-bold text-red-600">Wrong</p>
                <p className="mt-1 text-2xl font-extrabold text-red-900">
                  {wrongCount}
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-4 text-center">
                <p className="text-xs font-bold text-purple-600">Attempted</p>
                <p className="mt-1 text-2xl font-extrabold text-purple-900">
                  {attemptedCount}
                </p>
              </div>

            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center">
              <p className="text-sm font-bold text-slate-500">
                Marks Obtained
              </p>

              <p className="mt-1 text-4xl font-extrabold text-[#123f82]">
                {score} / {maximumMarks}
              </p>

              <p className="mt-2 text-xl font-extrabold text-emerald-600">
                {percentage.toFixed(2)}%
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

              <button
                type="button"
                onClick={startReview}
                className="rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-extrabold text-[#123f82] transition hover:bg-blue-50"
              >
                Review Answers
              </button>

              <button
                type="button"
                onClick={changeChapter}
                className="rounded-xl bg-[#123f82] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#0d326a]"
              >
                Practice Another Chapter
              </button>

            </div>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100svh] overflow-hidden bg-slate-50 px-2 py-2 sm:px-4 sm:py-3">
      <div className="mx-auto flex h-full max-w-4xl flex-col">

        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 sm:mb-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight text-[#101a35] sm:text-2xl">
              Practice Quiz
            </h1>
            <p className="mt-0.5 text-sm font-bold text-slate-600 sm:text-base">
              Question {currentQuestionIndex + 1} / {questions.length}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">

  <button
    type="button"
    onClick={changeChapter}
    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-[#123f82] shadow-sm transition hover:border-blue-200 hover:bg-blue-50 sm:px-4 sm:text-sm"
  >
    Change Book / Chapter
  </button>

  <div className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-extrabold text-[#123f82] shadow-sm sm:px-4 sm:text-base">
    Score: {score}
  </div>

</div>
        </div>

        {error && (
          <div className="mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">

          <div className="flex shrink-0 flex-wrap gap-1.5">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              {currentQuestion.book}
            </span>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
              {currentQuestion.chapter}
            </span>
          </div>

          <h2 className="mt-3 shrink-0 text-lg font-extrabold leading-6 text-[#101a35] sm:mt-4 sm:text-xl sm:leading-7">
            {currentQuestion.questionText}
          </h2>

          {answeredQuestions.has(currentQuestion.id) && (
            <div
              className={`mt-3 shrink-0 rounded-lg border px-3 py-2 text-sm font-extrabold sm:text-base ${
                selectedOptionId === currentQuestion.correctOptionId
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {selectedOptionId === currentQuestion.correctOptionId
                ? "✓ Correct Answer — +2 Marks"
                : "✗ Wrong Answer — 0 Marks"}
            </div>
          )}

          <div className="mt-3 grid min-h-0 flex-1 grid-rows-4 gap-2 sm:mt-4 sm:gap-2.5">
            {currentQuestion.options.map((option, optionIndex) => {
              const isAnswered = answeredQuestions.has(currentQuestion.id);
              const isSelected = selectedOptionId === option.id;
              const isCorrect = currentQuestion.correctOptionId === option.id;

              let optionClass =
                "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50";
              let letterClass = "bg-white text-[#123f82]";

              if (isAnswered) {
                if (isCorrect) {
                  optionClass = "border-emerald-500 bg-emerald-50";
                  letterClass = "bg-emerald-600 text-white";
                } else {
                  optionClass = "border-red-300 bg-red-50";
                  letterClass = "bg-red-600 text-white";
                }
              } else if (isSelected) {
                optionClass =
                  "border-blue-500 bg-blue-50 ring-2 ring-blue-200";
                letterClass = "bg-blue-600 text-white";
              }

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    if (answeredQuestions.has(currentQuestion.id)) return;

                    const correct =
                      currentQuestion.correctOptionId === option.id;

                    setSelectedAnswers((current) => ({
                      ...current,
                      [currentQuestion.id]: option.id,
                    }));

                    setAnsweredQuestions((current) => {
                      const next = new Set(current);
                      next.add(currentQuestion.id);
                      return next;
                    });

                    if (correct) {
                      setScore((current) => current + 2);
                    }
                  }}
                  className={`flex min-h-0 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition sm:px-4 ${optionClass}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold shadow-sm sm:h-9 sm:w-9 ${letterClass}`}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="text-sm font-bold leading-5 text-slate-900 sm:text-base sm:leading-6">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:mt-4 sm:pt-4">
            <button
              type="button"
              onClick={() => toggleRevision(currentQuestion.id)}
              disabled={!user}
              className={`rounded-lg border px-3 py-2 text-xs font-extrabold transition sm:px-4 sm:text-sm ${
                revisionQuestionIds.has(currentQuestion.id)
                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800"
              }`}
            >
              {revisionQuestionIds.has(currentQuestion.id)
                ? "Marked for Revision"
                : "Mark for Revision"}
            </button>

            {answeredQuestions.has(currentQuestion.id) && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    setError("Please login to report a question.");
                    return;
                  }

                  setReportOpen(true);
                  setReportMessage("");
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 transition hover:border-red-300 hover:bg-red-100 sm:px-4 sm:text-sm"
              >
                Report / Suggest Correction
              </button>
            )}
            <button
              type="button"
              onClick={
                isLastQuestion
                  ? reviewMode
                    ? () => {
                        setReviewMode(false);
                        setPracticeSubmitted(true);
                        setCurrentQuestionIndex(questions.length - 1);
                      }
                    : submitPractice
                  : goToNextQuestion
              }
              disabled={!selectedOptionId}
              className={`rounded-lg px-5 py-2.5 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 ${
                isLastQuestion
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#123f82] hover:bg-[#0d326a]"
              }`}
            >
              {isLastQuestion
                ? reviewMode
                  ? "Back to Result"
                  : "Submit Practice"
                : "Next Question"}
            </button>
          </div>

          {!user && (
            <p className="mt-1 shrink-0 text-right text-[10px] font-semibold text-slate-500 sm:text-xs">
              Login to save questions for revision.
            </p>
          )}

        </div>
      </div>

        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">

            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h3 className="text-xl font-extrabold text-[#123f82]">
                    Report / Suggest Correction
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Help us improve this question by telling us what appears to be incorrect.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!reportSubmitting) {
                      setReportOpen(false);
                      setReportMessage("");
                    }
                  }}
                  disabled={reportSubmitting}
                  className="rounded-lg px-2 py-1 text-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                >
                  ×
                </button>

              </div>

              <div className="mt-5">
                <p className="mb-3 text-sm font-extrabold text-slate-700">
                  What appears to be wrong?
                </p>

                <div className="space-y-2">
                  {[
                    ["question_incorrect", "Question is incorrect"],
                    ["answer_incorrect", "Correct answer appears incorrect"],
                    ["option_incorrect", "One or more options are incorrect"],
                    ["explanation_incorrect", "Explanation or reference is incorrect"],
                    ["ambiguous", "Question is ambiguous"],
                    ["other", "Other"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        reportReason === value
                          ? "border-blue-400 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="question-report-reason"
                        value={value}
                        checked={reportReason === value}
                        onChange={(e) => setReportReason(e.target.value)}
                        disabled={reportSubmitting}
                        className="h-4 w-4"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-extrabold text-slate-700">
                  Your suggestion / explanation
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  disabled={reportSubmitting}
                  maxLength={2000}
                  rows={4}
                  placeholder="Please explain why you think this question or answer is incorrect..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {reportComment.length}/2000
                </p>
              </div>

              {reportMessage && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                    reportMessage.startsWith("Thank you")
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {reportMessage}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!reportSubmitting) {
                      setReportOpen(false);
                      setReportReason("");
                      setReportComment("");
                      setReportMessage("");
                    }
                  }}
                  disabled={reportSubmitting}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitQuestionReport}
                  disabled={reportSubmitting || !reportReason}
                  className="rounded-xl bg-[#123f82] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>

            </div>
          </div>
        )}

    </main>
  );
}
































