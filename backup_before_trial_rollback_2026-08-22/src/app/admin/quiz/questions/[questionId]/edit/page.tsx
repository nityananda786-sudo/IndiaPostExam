"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type Option = {
  id: string;
  text: string;
};

type Question = {
  id: string;

  questionId?: string;

  bookId: string;
  chapterId: string;

  questionText: string;

  options: Option[];

  correctOptionId: string;

  explanation?: string;

  sourceReference?: string;

  amendmentReference?: string;

  status?: string;

  active?: boolean;

  courseAccess?: string[];

  quizEligible?: boolean;

  importSource?: string;

  externalQuestionId?: string;

  createdAt?: any;

  updatedAt?: any;
};

type Book = {
  id: string;
  title?: string;
  name?: string;
};

type Chapter = {
  id: string;
  bookId?: string;
  title?: string;
  name?: string;
};

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();

  const questionId =
    params?.questionId as string;

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [book, setBook] =
    useState<Book | null>(null);

  const [chapter, setChapter] =
    useState<Chapter | null>(null);

  const [masterQuestionId, setMasterQuestionId] =
    useState("");

  const [questionText, setQuestionText] =
    useState("");

  const [options, setOptions] =
    useState<Option[]>([]);

  const [correctOptionId, setCorrectOptionId] =
    useState("");

  const [explanation, setExplanation] =
    useState("");

  const [sourceReference, setSourceReference] =
    useState("");

  const [amendmentReference, setAmendmentReference] =
    useState("");

  const [courseAccess, setCourseAccess] =
    useState("");

  const [status, setStatus] =
    useState<"draft" | "published">("draft");

  const [active, setActive] =
    useState(true);

  const [quizEligible, setQuizEligible] =
    useState(false);

  const [importSource, setImportSource] =
    useState("");

  const [externalQuestionId, setExternalQuestionId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // =====================================================
  // LOAD QUESTION
  // =====================================================

  useEffect(() => {
    async function loadQuestion() {
      if (!questionId) {
        setError("Question ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const questionRef = doc(
          db,
          "questions",
          questionId
        );

        const snapshot =
          await getDoc(questionRef);

        if (!snapshot.exists()) {
          setError("Question not found.");
          setLoading(false);
          return;
        }

        const data =
          snapshot.data();

        const loadedQuestion: Question = {
          id: snapshot.id,
          ...(data as Omit<
            Question,
            "id"
          >),
        };

        setQuestion(
          loadedQuestion
        );

        // -----------------------------------------------
        // MASTER QUESTION ID
        // -----------------------------------------------

        setMasterQuestionId(
          loadedQuestion.questionId ||
            loadedQuestion.externalQuestionId ||
            ""
        );

        // -----------------------------------------------
        // BASIC DATA
        // -----------------------------------------------

        setQuestionText(
          loadedQuestion.questionText ||
            ""
        );

        setOptions(
          loadedQuestion.options ||
            []
        );

        setCorrectOptionId(
          loadedQuestion.correctOptionId ||
            ""
        );

        setExplanation(
          loadedQuestion.explanation ||
            ""
        );

        setSourceReference(
          loadedQuestion.sourceReference ||
            ""
        );

        setAmendmentReference(
          loadedQuestion.amendmentReference ||
            ""
        );

        // -----------------------------------------------
        // COURSE ACCESS
        // -----------------------------------------------

        const courses =
          loadedQuestion.courseAccess ||
          [];

        setCourseAccess(
          Array.isArray(courses)
            ? courses.join(", ")
            : String(courses || "")
        );

        // -----------------------------------------------
        // STATUS
        // -----------------------------------------------

        setStatus(
          loadedQuestion.status ===
            "published"
            ? "published"
            : "draft"
        );

        // -----------------------------------------------
        // ACTIVE
        // -----------------------------------------------

        setActive(
          loadedQuestion.active !== false
        );

        // -----------------------------------------------
        // QUIZ ELIGIBLE
        // -----------------------------------------------

        setQuizEligible(
          loadedQuestion.quizEligible ===
            true
        );

        // -----------------------------------------------
        // IMPORT INFORMATION
        // -----------------------------------------------

        setImportSource(
          loadedQuestion.importSource ||
            ""
        );

        setExternalQuestionId(
          loadedQuestion.externalQuestionId ||
            ""
        );

        // -----------------------------------------------
        // LOAD BOOK
        // -----------------------------------------------

        if (
          loadedQuestion.bookId
        ) {
          const bookSnapshot =
            await getDoc(
              doc(
                db,
                "books",
                loadedQuestion.bookId
              )
            );

          if (
            bookSnapshot.exists()
          ) {
            const bookData =
              bookSnapshot.data();

            setBook({
              id: bookSnapshot.id,
              ...(bookData as Omit<
                Book,
                "id"
              >),
            });
          }
        }

        // -----------------------------------------------
        // LOAD CHAPTER
        // -----------------------------------------------

        if (
          loadedQuestion.chapterId
        ) {
          const chapterSnapshot =
            await getDoc(
              doc(
                db,
                "chapters",
                loadedQuestion.chapterId
              )
            );

          if (
            chapterSnapshot.exists()
          ) {
            const chapterData =
              chapterSnapshot.data();

            setChapter({
              id: chapterSnapshot.id,
              ...(chapterData as Omit<
                Chapter,
                "id"
              >),
            });
          }
        }
      } catch (err: any) {
        console.error(
          "Error loading question:",
          err
        );

        setError(
          err?.message ||
            "Unable to load question."
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuestion();
  }, [questionId]);

  // =====================================================
  // UPDATE OPTION
  // =====================================================

  function updateOption(
    optionId: string,
    value: string
  ) {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              text: value,
            }
          : option
      )
    );
  }

  // =====================================================
  // VALIDATE
  // =====================================================

  function validateForm() {
    if (!questionText.trim()) {
      return "Question text is required.";
    }

    if (options.length !== 4) {
      return "Exactly four options are required.";
    }

    for (
      let i = 0;
      i < options.length;
      i++
    ) {
      if (
        !options[i].text.trim()
      ) {
        return `Option ${String.fromCharCode(
          65 + i
        )} is required.`;
      }
    }

    if (!correctOptionId) {
      return "Please select the correct answer.";
    }

    if (
      !options.some(
        (option) =>
          option.id ===
          correctOptionId
      )
    ) {
      return "The selected correct answer is invalid.";
    }

    return null;
  }

  // =====================================================
  // SAVE
  // =====================================================

  async function saveChanges() {
    setError("");
    setMessage("");

    const validation =
      validateForm();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);

      const courseList =
        courseAccess
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);

      // -------------------------------------------------
      // UPDATE THROUGH MASTER QUESTION API
      // -------------------------------------------------

      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "You are not logged in. Please login again."
        );
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/questions",
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
                questionId,

                questionText:
                  questionText.trim(),

                options:
                  options.map(
                    (option) => ({
                      id: option.id,
                      text:
                        option.text.trim(),
                    })
                  ),

                correctOptionId,

                explanation:
                  explanation.trim(),

                sourceReference:
                  sourceReference.trim(),

                amendmentReference:
                  amendmentReference.trim(),

                status,

                active,

                courseAccess:
                  courseList,

                quizEligible,

                importSource:
                  importSource.trim(),

                externalQuestionId:
                  externalQuestionId.trim(),
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
          "Unable to update the question."
        );
      }
      setMessage(
        "Question updated successfully."
      );

      setTimeout(() => {
        router.push(
          `/admin/quiz/questions?bookId=${encodeURIComponent(
            question!.bookId
          )}&chapterId=${encodeURIComponent(
            question!.chapterId
          )}`
        );
      }, 800);
    } catch (err: any) {
      console.error(
        "Error updating question:",
        err
      );

      setError(
        err?.message ||
          "Unable to update question."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-5xl px-6 py-16">

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <p className="text-sm font-semibold text-slate-500">
              Loading question...
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =====================================================
  // NOT FOUND
  // =====================================================

  if (!question) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-3xl px-6 py-16">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">

            <h1 className="text-xl font-extrabold text-red-700">
              Question not found
            </h1>

            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>

            <Link
              href="/admin/quiz/questions"
              className="mt-6 inline-flex rounded-xl bg-[#123f82] px-5 py-3 text-sm font-bold text-white"
            >
              Back to Question Bank
            </Link>

          </div>

        </div>

      </main>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="bg-[#123f82] text-white">

        <div className="mx-auto max-w-5xl px-6 py-10">

          <Link
            href={`/admin/quiz/questions?bookId=${encodeURIComponent(
              question.bookId
            )}&chapterId=${encodeURIComponent(
              question.chapterId
            )}`}
            className="mb-5 inline-flex text-sm font-semibold text-white/80 hover:text-white"
          >
            {"\u2190"} Back to Question Bank
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Edit Question
          </h1>

          <p className="mt-3 text-white/80">
            Complete question metadata and
            publication controls.
          </p>

        </div>

      </section>


      {/* =================================================
          CONTENT
      ================================================= */}

      <section className="mx-auto max-w-5xl px-6 py-10">

        {/* SUCCESS */}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}


        {/* =================================================
            IDENTIFICATION
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Question Identification
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {/* MASTER ID */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Master Question ID
              </label>

              <input
                type="text"
                value={masterQuestionId}
                onChange={(e) =>
                  setMasterQuestionId(
                    e.target.value
                  )
                }
                placeholder="e.g. Q000001"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                This will be the permanent ID
                used by the Google Sheet.
              </p>

            </div>


            {/* FIRESTORE ID */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Firestore Document ID
              </label>

              <input
                type="text"
                value={question.id}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                Internal Firestore ID. This cannot
                be changed.
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            BOOK / CHAPTER
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Book & Chapter
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {/* BOOK */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Book
              </label>

              <input
                type="text"
                value={
                  book?.title ||
                  book?.name ||
                  question.bookId
                }
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
              />

              <p className="mt-2 break-all text-xs text-slate-400">
                Book ID: {question.bookId}
              </p>

            </div>


            {/* CHAPTER */}

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Chapter
              </label>

              <input
                type="text"
                value={
                  chapter?.title ||
                  chapter?.name ||
                  question.chapterId
                }
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
              />

              <p className="mt-2 break-all text-xs text-slate-400">
                Chapter ID: {question.chapterId}
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            QUESTION
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <label className="mb-2 block text-sm font-bold text-slate-700">
            Question *
          </label>

          <textarea
            value={questionText}
            onChange={(e) =>
              setQuestionText(e.target.value)
            }
            rows={6}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold leading-7 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

        </div>


        {/* =================================================
            OPTIONS
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Answer Options
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            The internal option IDs are preserved
            for future A/B/C/D randomization.
          </p>

          <div className="mt-5 space-y-4">

            {options.map(
              (option, index) => {

                const letter =
                  String.fromCharCode(
                    65 + index
                  );

                return (
                  <div
                    key={option.id}
                    className="flex gap-3"
                  >

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-extrabold text-[#123f82]">
                      {letter}
                    </div>

                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) =>
                        updateOption(
                          option.id,
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                  </div>
                );
              }
            )}

          </div>

        </div>


        {/* =================================================
            CORRECT ANSWER
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Correct Answer *
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">

            {options.map(
              (option, index) => {

                const letter =
                  String.fromCharCode(
                    65 + index
                  );

                const selected =
                  correctOptionId ===
                  option.id;

                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                      selected
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200"
                    }`}
                  >

                    <input
                      type="radio"
                      name="correct"
                      checked={selected}
                      onChange={() =>
                        setCorrectOptionId(
                          option.id
                        )
                      }
                      className="h-4 w-4"
                    />

                    <div>

                      <p className="text-sm font-extrabold">
                        Option {letter}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {option.text}
                      </p>

                    </div>

                  </label>
                );
              }
            )}

          </div>

        </div>


        {/* =================================================
            EXPLANATION
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <label className="mb-2 block text-sm font-bold text-slate-700">
            Explanation
          </label>

          <textarea
            value={explanation}
            onChange={(e) =>
              setExplanation(
                e.target.value
              )
            }
            rows={5}
            placeholder="Explanation shown in Practice Mode."
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </div>


        {/* =================================================
            REFERENCES
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Source & Amendment
          </h2>

          <div className="mt-5 space-y-5">

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Source Reference
              </label>

              <input
                type="text"
                value={sourceReference}
                onChange={(e) =>
                  setSourceReference(
                    e.target.value
                  )
                }
                placeholder="e.g. PO Guide Part-I, Rule 5"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Amendment / Order Reference
              </label>

              <textarea
                value={amendmentReference}
                onChange={(e) =>
                  setAmendmentReference(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Subsequent departmental order, circular or amendment."
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

        </div>


        {/* =================================================
            COURSE ACCESS
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Course Access
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Enter Course IDs separated by commas.
            The same question can therefore be used
            for multiple examination courses.
          </p>

          <input
            type="text"
            value={courseAccess}
            onChange={(e) =>
              setCourseAccess(
                e.target.value
              )
            }
            placeholder="GDS-MTS, POSTMAN, PA, INSPECTOR"
            className="mt-5 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-3 rounded-xl bg-white px-4 py-3 text-xs text-slate-500">

            <strong>Example:</strong>{" "}
            If PO Guide Part-I is applicable
            to GDS-MTS, Postman, PA and Inspector:

            <div className="mt-1 font-bold text-[#123f82]">
              GDS-MTS, POSTMAN, PA, INSPECTOR
            </div>

          </div>

        </div>


        {/* =================================================
            QUIZ CONTROL
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Quiz Control
          </h2>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <input
              type="checkbox"
              checked={quizEligible}
              onChange={(e) =>
                setQuizEligible(
                  e.target.checked
                )
              }
              className="mt-1 h-4 w-4"
            />

            <div>

              <p className="text-sm font-bold text-slate-700">
                Include in Quiz Generation
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Only questions marked as Quiz
                Eligible will be considered when
                generating the 15-question quiz sets.
              </p>

            </div>

          </label>

        </div>


        {/* =================================================
            PUBLICATION
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Publication & Activity
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Publication Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as
                      | "draft"
                      | "published"
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="draft">
                  Draft
                </option>

                <option value="published">
                  Published
                </option>

              </select>

            </div>


            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Active Status
              </label>

              <label className="flex h-[46px] cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-4">

                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) =>
                    setActive(
                      e.target.checked
                    )
                  }
                  className="h-4 w-4"
                />

                <span className="text-sm font-semibold text-slate-700">
                  Question is Active
                </span>

              </label>

            </div>

          </div>

        </div>


        {/* =================================================
            IMPORT INFORMATION
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-extrabold text-[#123f82]">
            Import Information
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Import Source
              </label>

              <input
                type="text"
                value={importSource}
                onChange={(e) =>
                  setImportSource(
                    e.target.value
                  )
                }
                placeholder="admin / google_sheets / excel"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                External Question ID
              </label>

              <input
                type="text"
                value={externalQuestionId}
                onChange={(e) =>
                  setExternalQuestionId(
                    e.target.value
                  )
                }
                placeholder="Optional external/master ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

        </div>


        {/* =================================================
            SAVE
        ================================================= */}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

          <Link
            href={`/admin/quiz/questions?bookId=${encodeURIComponent(
              question.bookId
            )}&chapterId=${encodeURIComponent(
              question.chapterId
            )}`}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="rounded-xl bg-[#123f82] px-7 py-3 text-sm font-bold text-white hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving Changes..."
              : "Save Changes"}
          </button>

        </div>

      </section>

    </main>
  );
}

