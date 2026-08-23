"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type SelectionMode = "automatic" | "manual";

type MockTestDraft = {
  testNumber?: number;
  durationMinutes?: number;
  questionCount?: number;
  publishedDate?: string;
  selectionMode?: SelectionMode;
  useQuestionBank?: boolean;
  useMockOnlyQuestions?: boolean;
  courseIds?: string[];
  active?: boolean;
};

type Question = {
  id: string;
  questionId?: string;

  bookId?: string;
  book?: string;

  chapterId?: string;
  chapter?: string;

  questionText: string;

  options?: {
    id: string;
    text: string;
  }[];

  correctOptionId?: string;

  status?: string;
  active?: boolean;

  quizEligible?: boolean;

  createdAt?: {
    seconds?: number;
  };
};

export default function MockTestQuestionsPage() {

  const [draft, setDraft] =
    useState<MockTestDraft | null>(null);

  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>("automatic");

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [selectedQuestionIds, setSelectedQuestionIds] =
    useState<string[]>([]);

  const [searchText, setSearchText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [automaticGenerated, setAutomaticGenerated] =
    useState(false);

  // =====================================================
  // MOCK-TEST-ONLY QUESTION FORM
  // =====================================================

  const [showMockOnlyForm, setShowMockOnlyForm] =
    useState(false);

  const [mockOnlyQuestionText, setMockOnlyQuestionText] =
    useState("");

  const [mockOnlyOptions, setMockOnlyOptions] =
    useState([
      { id: "option_1", text: "" },
      { id: "option_2", text: "" },
      { id: "option_3", text: "" },
      { id: "option_4", text: "" },
    ]);

  const [mockOnlyCorrectOptionId, setMockOnlyCorrectOptionId] =
    useState("");

  const [mockOnlyExplanation, setMockOnlyExplanation] =
    useState("");

  const [mockOnlySourceReference, setMockOnlySourceReference] =
    useState("");

  const [mockOnlyAmendmentReference, setMockOnlyAmendmentReference] =
    useState("");

  const [savingMockOnlyQuestion, setSavingMockOnlyQuestion] =
    useState(false);


  // =====================================================
  // LOAD MOCK TEST DRAFT
  // =====================================================

  useEffect(() => {

    try {

      const raw =
        sessionStorage.getItem(
          "indiaPostExam_mockTestDraft"
        );

      if (!raw) {
        setError(
          "Mock Test configuration was not found. Please return to the Mock Test details page."
        );
        setLoading(false);
        return;
      }

      const parsed =
        JSON.parse(raw) as MockTestDraft;

      setDraft(parsed);

      setSelectionMode(
        parsed.selectionMode === "manual"
          ? "manual"
          : "automatic"
      );

    } catch (err) {

      console.error(
        "Unable to read Mock Test draft:",
        err
      );

      setError(
        "Unable to read the Mock Test configuration."
      );

    }

  }, []);


  // =====================================================
  // LOAD MASTER QUESTION BANK
  // =====================================================

  useEffect(() => {

    async function loadQuestionBank() {

      try {

        setLoading(true);
        setError("");

        /*
         * IMPORTANT:
         *
         * This is the separate Mock Test builder.
         *
         * It reads the MASTER questions collection.
         *
         * It does NOT create, update, delete or copy
         * any question.
         *
         * quizEligible is deliberately NOT required here.
         * A published + active question may be used
         * in a Mock Test even if it was not selected
         * for Practice Quiz use.
         */

        const snapshot =
          await getDocs(
            query(
              collection(db, "questions"),
              where(
                "status",
                "==",
                "published"
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
            .filter(
              (question) =>
                question.active !== false
            )
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
          "Error loading Mock Test question bank:",
          err
        );

        setError(
          err?.message ||
            "Unable to load the Question Bank."
        );

      } finally {

        setLoading(false);

      }

    }

    loadQuestionBank();

  }, []);


  // =====================================================
  // SEARCH
  // =====================================================

  const filteredQuestions =
    useMemo(() => {

      const search =
        searchText
          .trim()
          .toLowerCase();

      if (!search) {
        return questions;
      }

      return questions.filter(
        (question) => {

          const text = [
            question.questionText,
            question.book,
            question.chapter,
            question.questionId,
            question.bookId,
            question.chapterId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(search);
        }
      );

    }, [
      questions,
      searchText,
    ]);


  // =====================================================
  // MANUAL SELECTION
  // =====================================================

  function toggleQuestion(
    questionId: string
  ) {

    setSelectedQuestionIds(
      (current) => {

        if (
          current.includes(
            questionId
          )
        ) {
          return current.filter(
            (id) =>
              id !== questionId
          );
        }

        if (
          current.length >= 25
        ) {
          return current;
        }

        return [
          ...current,
          questionId,
        ];

      }
    );

  }


  // =====================================================
  // AUTOMATIC SELECTION
  // =====================================================

  function generateAutomaticQuestions() {

    if (
      questions.length < 25
    ) {
      setError(
        `Only ${questions.length} eligible Question Bank questions are available. At least 25 are required.`
      );
      return;
    }

    setError("");

    const shuffled =
      [...questions]
        .sort(
          () =>
            Math.random() - 0.5
        )
        .slice(0, 25);

    const ids =
      Array.from(
        new Set(
          shuffled.map(
            (question) =>
              question.id
          )
        )
      );

    if (
      ids.length !== 25
    ) {
      setError(
        "Unable to generate 25 unique questions. Please try again."
      );
      return;
    }

    setSelectedQuestionIds(
      ids
    );

    setAutomaticGenerated(
      true
    );

  }


  // =====================================================
  // SAVE MOCK-TEST-ONLY QUESTION
  // =====================================================

  async function saveMockOnlyQuestion() {

    setError("");

    const questionText =
      mockOnlyQuestionText.trim();

    if (!questionText) {
      setError(
        "Please enter the Mock-Test-only question."
      );
      return;
    }

    for (
      let index = 0;
      index < mockOnlyOptions.length;
      index++
    ) {
      if (
        !mockOnlyOptions[index].text.trim()
      ) {
        setError(
          `Please enter Option ${String.fromCharCode(
            65 + index
          )}.`
        );
        return;
      }
    }

    if (!mockOnlyCorrectOptionId) {
      setError(
        "Please select the correct answer."
      );
      return;
    }

    if (
      selectedQuestionIds.length >= 25
    ) {
      setError(
        "The Mock Test already contains 25 questions."
      );
      return;
    }

    try {

      setSavingMockOnlyQuestion(true);

      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You are not logged in. Please login again."
        );
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/mock-tests/questions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              questionText,

              options:
                mockOnlyOptions.map(
                  (option) => ({
                    id: option.id,
                    text:
                      option.text.trim(),
                  })
                ),

              correctOptionId:
                mockOnlyCorrectOptionId,

              explanation:
                mockOnlyExplanation.trim(),

              sourceReference:
                mockOnlySourceReference.trim(),

              amendmentReference:
                mockOnlyAmendmentReference.trim(),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok ||
          !result.success) {
        throw new Error(
          result.error ||
            "Unable to save Mock-Test-only question."
        );
      }

      const questionId =
        String(
          result.questionId || ""
        ).trim();

      if (!questionId) {
        throw new Error(
          "The server did not return a question ID."
        );
      }

      setSelectedQuestionIds(
        (current) => {

          if (
            current.includes(
              questionId
            )
          ) {
            return current;
          }

          if (
            current.length >= 25
          ) {
            return current;
          }

          return [
            ...current,
            questionId,
          ];

        }
      );

      setMockOnlyQuestionText("");

      setMockOnlyOptions([
        {
          id: "option_1",
          text: "",
        },
        {
          id: "option_2",
          text: "",
        },
        {
          id: "option_3",
          text: "",
        },
        {
          id: "option_4",
          text: "",
        },
      ]);

      setMockOnlyCorrectOptionId("");

      setMockOnlyExplanation("");

      setMockOnlySourceReference("");

      setMockOnlyAmendmentReference("");

      setShowMockOnlyForm(false);

      setSearchText("");

      setError("");

    } catch (err: any) {

      console.error(
        "Error saving Mock-Test-only question:",
        err
      );

      setError(
        err?.message ||
          "Unable to save Mock-Test-only question."
      );

    } finally {

      setSavingMockOnlyQuestion(
        false
      );

    }
  }


  {/* =====================================================
      MOCK-TEST-ONLY QUESTION
  ===================================================== */}

  <section className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">

    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

      <div>
        <h2 className="text-lg font-extrabold text-[#123b78]">
          Mock-Test-only Question
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Add a new question specifically for this Mock Test.
          It will be stored once in the master Question Bank.
        </p>
      </div>

      {!showMockOnlyForm && (
        <button
          type="button"
          disabled={selectedQuestionIds.length >= 25}
          onClick={() => {
            setShowMockOnlyForm(true);
            setError("");
          }}
          className="
            inline-flex
            items-center
            justify-center
            rounded-xl
            bg-indigo-600
            px-5
            py-3
            text-sm
            font-extrabold
            text-white
            shadow-sm
            transition
            hover:bg-indigo-700
            disabled:cursor-not-allowed
            disabled:bg-slate-300
          "
        >
          + Add Mock-Test-only Question
        </button>
      )}

    </div>


    {showMockOnlyForm && (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex items-start justify-between gap-4">

          <div>
            <h3 className="text-base font-extrabold text-[#123b78]">
              Create Mock-Test-only Question
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              If the same question already exists, the existing
              master question will be reused automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowMockOnlyForm(false);
              setError("");
            }}
            className="
              rounded-lg
              border
              border-slate-200
              px-3
              py-2
              text-sm
              font-bold
              text-slate-600
              hover:bg-slate-50
            "
          >
            Cancel
          </button>

        </div>


        {/* QUESTION */}

        <div>
          <label className="block text-sm font-bold text-slate-700">
            Question
          </label>

          <textarea
            value={mockOnlyQuestionText}
            onChange={(event) =>
              setMockOnlyQuestionText(
                event.target.value
              )
            }
            rows={4}
            placeholder="Enter the complete question..."
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-slate-300
              px-4
              py-3
              text-sm
              outline-none
              focus:border-indigo-500
              focus:ring-2
              focus:ring-indigo-100
            "
          />
        </div>


        {/* OPTIONS */}

        <div className="mt-6">

          <label className="block text-sm font-bold text-slate-700">
            Answer Options
          </label>

          <div className="mt-3 grid gap-4 md:grid-cols-2">

            {mockOnlyOptions.map(
              (option, index) => (
                <div key={option.id}>

                  <label className="block text-xs font-bold text-slate-500">
                    Option{" "}
                    {String.fromCharCode(
                      65 + index
                    )}
                  </label>

                  <input
                    type="text"
                    value={option.text}
                    onChange={(event) => {

                      const value =
                        event.target.value;

                      setMockOnlyOptions(
                        (current) =>
                          current.map(
                            (item) =>
                              item.id ===
                              option.id
                                ? {
                                    ...item,
                                    text: value,
                                  }
                                : item
                          )
                      );

                    }}
                    placeholder={`Enter Option ${String.fromCharCode(
                      65 + index
                    )}`}
                    className="
                      mt-1
                      w-full
                      rounded-xl
                      border
                      border-slate-300
                      px-4
                      py-3
                      text-sm
                      outline-none
                      focus:border-indigo-500
                      focus:ring-2
                      focus:ring-indigo-100
                    "
                  />

                </div>
              )
            )}

          </div>
        </div>


        {/* CORRECT ANSWER */}

        <div className="mt-6">

          <label className="block text-sm font-bold text-slate-700">
            Correct Answer
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">

            {mockOnlyOptions.map(
              (option, index) => (
                <label
                  key={option.id}
                  className={`
                    flex
                    cursor-pointer
                    items-center
                    gap-2
                    rounded-xl
                    border
                    px-4
                    py-3
                    text-sm
                    font-bold
                    transition
                    ${
                      mockOnlyCorrectOptionId ===
                      option.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }
                  `}
                >

                  <input
                    type="radio"
                    name="mockOnlyCorrectOption"
                    value={option.id}
                    checked={
                      mockOnlyCorrectOptionId ===
                      option.id
                    }
                    onChange={() =>
                      setMockOnlyCorrectOptionId(
                        option.id
                      )
                    }
                  />

                  Option{" "}
                  {String.fromCharCode(
                    65 + index
                  )}

                </label>
              )
            )}

          </div>
        </div>


        {/* EXPLANATION */}

        <div className="mt-6">

          <label className="block text-sm font-bold text-slate-700">
            Explanation
            <span className="ml-2 font-normal text-slate-400">
              Optional
            </span>
          </label>

          <textarea
            value={mockOnlyExplanation}
            onChange={(event) =>
              setMockOnlyExplanation(
                event.target.value
              )
            }
            rows={3}
            placeholder="Enter explanation if required..."
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-slate-300
              px-4
              py-3
              text-sm
              outline-none
              focus:border-indigo-500
              focus:ring-2
              focus:ring-indigo-100
            "
          />

        </div>


        {/* SOURCE */}

        <div className="mt-6 grid gap-4 md:grid-cols-2">

          <div>

            <label className="block text-sm font-bold text-slate-700">
              Source Reference
              <span className="ml-2 font-normal text-slate-400">
                Optional
              </span>
            </label>

            <input
              type="text"
              value={mockOnlySourceReference}
              onChange={(event) =>
                setMockOnlySourceReference(
                  event.target.value
                )
              }
              placeholder="Source / reference"
              className="
                mt-2
                w-full
                rounded-xl
                border
                border-slate-300
                px-4
                py-3
                text-sm
                outline-none
                focus:border-indigo-500
                focus:ring-2
                focus:ring-indigo-100
              "
            />

          </div>


          <div>

            <label className="block text-sm font-bold text-slate-700">
              Amendment Reference
              <span className="ml-2 font-normal text-slate-400">
                Optional
              </span>
            </label>

            <input
              type="text"
              value={mockOnlyAmendmentReference}
              onChange={(event) =>
                setMockOnlyAmendmentReference(
                  event.target.value
                )
              }
              placeholder="Amendment / order reference"
              className="
                mt-2
                w-full
                rounded-xl
                border
                border-slate-300
                px-4
                py-3
                text-sm
                outline-none
                focus:border-indigo-500
                focus:ring-2
                focus:ring-indigo-100
              "
            />

          </div>

        </div>


        {/* SAVE */}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

          <button
            type="button"
            disabled={savingMockOnlyQuestion}
            onClick={() => {
              setShowMockOnlyForm(false);
              setError("");
            }}
            className="
              rounded-xl
              border
              border-slate-300
              px-5
              py-3
              text-sm
              font-bold
              text-slate-700
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              savingMockOnlyQuestion ||
              selectedQuestionIds.length >= 25
            }
            onClick={saveMockOnlyQuestion}
            className="
              rounded-xl
              bg-indigo-600
              px-6
              py-3
              text-sm
              font-extrabold
              text-white
              shadow-sm
              transition
              hover:bg-indigo-700
              disabled:cursor-not-allowed
              disabled:bg-slate-300
            "
          >
            {savingMockOnlyQuestion
              ? "Saving..."
              : "Save & Add to Mock Test"}
          </button>

        </div>

      </div>
    )}

  </section>

  // =====================================================
  // CHANGE MODE
  // =====================================================

  function changeSelectionMode(
    mode: SelectionMode
  ) {

    setSelectionMode(mode);

    setSelectedQuestionIds([]);

    setAutomaticGenerated(false);

    setError("");

  }


  // =====================================================
  // CONTINUE
  // =====================================================

  function continueBuilder() {

    if (
      selectedQuestionIds.length !== 25
    ) {
      setError(
        `Please select exactly 25 questions. Currently selected: ${selectedQuestionIds.length}.`
      );
      return;
    }

    /*
     * IMPORTANT:
     *
     * We only keep the EXISTING Firestore document IDs.
     *
     * No question text, options or question document
     * is copied anywhere.
     */

    const updatedDraft = {
      ...(draft || {}),
      questionCount: 25,
      selectionMode,
      questionIds:
        Array.from(
          new Set(
            selectedQuestionIds
          )
        ),
    };

    sessionStorage.setItem(
      "indiaPostExam_mockTestDraft",
      JSON.stringify(
        updatedDraft
      )
    );

    window.location.href =
      "/admin/mock-tests/new";

  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />

          <p className="mt-4 text-sm font-bold text-slate-600">
            Loading Question Bank...
          </p>

        </div>

      </main>
    );

  }


  const testNumber =
    draft?.testNumber || 1;


  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">

          <div className="min-w-0">

            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600">
              Mock Test Builder
            </p>

            <h1 className="mt-1 text-2xl font-black text-[#123b78] sm:text-3xl">
              Mock Test {testNumber}
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Select exactly 25 questions
            </p>

          </div>


          <Link
            href="/admin/mock-tests/new"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            ← Back
          </Link>

        </div>

      </header>


      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8">


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600">
                Question Selection
              </p>

              <h2 className="mt-1 text-xl font-black text-[#123b78]">
                Mock Test {testNumber}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-600">
                25 questions required
              </p>

            </div>


            <div className="rounded-xl bg-white px-6 py-3 text-center shadow-sm">

              <p className="text-xs font-bold text-slate-500">
                Selected
              </p>

              <p
                className={`mt-1 text-2xl font-black ${
                  selectedQuestionIds.length === 25
                    ? "text-emerald-600"
                    : "text-indigo-700"
                }`}
              >
                {selectedQuestionIds.length} / 25
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            MODE
        ================================================= */}

        <div className="mt-5 grid gap-4 md:grid-cols-2">

          <button
            type="button"
            onClick={() =>
              changeSelectionMode(
                "automatic"
              )
            }
            className={`rounded-2xl border p-5 text-left transition ${
              selectionMode === "automatic"
                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                : "border-slate-200 bg-white hover:border-indigo-200"
            }`}
          >

            <div className="flex items-center justify-between">

              <span className="text-lg font-black text-indigo-800">
                Automatic Selection
              </span>

              {selectionMode ===
                "automatic" && (
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
                  Selected
                </span>
              )}

            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Randomly select exactly 25 unique
              published and active questions.
            </p>

          </button>


          <button
            type="button"
            onClick={() =>
              changeSelectionMode(
                "manual"
              )
            }
            className={`rounded-2xl border p-5 text-left transition ${
              selectionMode === "manual"
                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                : "border-slate-200 bg-white hover:border-indigo-200"
            }`}
          >

            <div className="flex items-center justify-between">

              <span className="text-lg font-black text-indigo-800">
                Manual Selection
              </span>

              {selectionMode ===
                "manual" && (
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
                  Selected
                </span>
              )}

            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select exactly 25 questions yourself
              from the master Question Bank.
            </p>

          </button>

        </div>


        {/* =================================================
            AUTOMATIC CONTROLS
        ================================================= */}

        {selectionMode ===
          "automatic" && (

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-black text-[#123b78]">
                  Automatic Question Generator
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Available eligible questions:{" "}
                  <strong>
                    {questions.length}
                  </strong>
                </p>

              </div>


              <button
                type="button"
                onClick={
                  generateAutomaticQuestions
                }
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-700"
              >
                {automaticGenerated
                  ? "Generate Another Set"
                  : "Generate 25 Questions"}
              </button>

            </div>

          </div>

        )}


        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-black text-[#123b78]">
                Question Bank
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Published and active questions only
              </p>

            </div>


            <div className="w-full sm:max-w-md">

              <input
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="Search question, book, chapter or ID..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

            </div>

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>

        )}


        {/* =================================================
            QUESTION LIST
        ================================================= */}

        <div className="mt-5 space-y-3">

          {filteredQuestions.length === 0 ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">

              <p className="font-bold text-slate-600">
                No eligible questions found.
              </p>

            </div>

          ) : (

            filteredQuestions.map(
              (question, index) => {

                const selected =
                  selectedQuestionIds.includes(
                    question.id
                  );

                const selectionNumber =
                  selected
                    ? selectedQuestionIds.indexOf(
                        question.id
                      ) + 1
                    : null;

                return (

                  <button
                    key={question.id}
                    type="button"
                    onClick={() =>
                      toggleQuestion(
                        question.id
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition sm:p-5 ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200"
                        : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >

                    <div className="flex gap-4">

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                          selected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {selectionNumber ||
                          index + 1}
                      </div>


                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap gap-2">

                          {question.book && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                              {question.book}
                            </span>
                          )}

                          {question.chapter && (
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
                              {question.chapter}
                            </span>
                          )}

                          {question.questionId && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                              {question.questionId}
                            </span>
                          )}

                        </div>


                        <p className="mt-2 text-sm font-bold leading-6 text-[#17233f] sm:text-base">
                          {question.questionText}
                        </p>


                        <p className="mt-2 text-xs font-medium text-slate-400">
                          Firestore ID: {question.id}
                        </p>

                      </div>


                      <div className="shrink-0">

                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-black ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>

                      </div>

                    </div>

                  </button>

                );

              }
            )

          )}

        </div>


        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

          <Link
            href="/admin/mock-tests/new"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Details
          </Link>


          <button
            type="button"
            onClick={
              continueBuilder
            }
            disabled={
              selectedQuestionIds.length !==
              25
            }
            className={`rounded-xl px-6 py-3 text-sm font-extrabold text-white transition ${
              selectedQuestionIds.length ===
              25
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            Continue with 25 Questions →
          </button>

        </div>

      </section>

    </main>
  );
}




