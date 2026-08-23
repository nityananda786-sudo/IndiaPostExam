"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type QuestionRow = {
  Question?: string;
  OptionA?: string;
  OptionB?: string;
  OptionC?: string;
  OptionD?: string;
  CorrectAnswer?: string;
};

type Book = {
  BookID: string;
  BookName: string;
  CourseAccess: string[];
  Active: boolean;
};

type Chapter = {
  ChapterID: string;
  BookID: string;
  ChapterName: string;
  CourseAccess: string[];
  Active: boolean;
};


type ExistingDuplicate = {
  rowNumber: number;
  questionId: string;
  questionText: string;
  fingerprint: string;
  existingQuestionId: string;
};

type InternalDuplicateQuestion = {
  rowNumber: number;
  questionId: string;
  questionText: string;
  fingerprint: string;
};

type InternalDuplicateGroup = {
  fingerprint: string;
  questions: InternalDuplicateQuestion[];
};

type ImportValidationResult = {
  total: number;
  newQuestions: number;
  existingDuplicates: number;
  internalDuplicateRows: number;
  readyToImport: number;
};
const REQUIRED_COLUMNS = [
  "Question",
  "OptionA",
  "OptionB",
  "OptionC",
  "OptionD",
  "CorrectAnswer",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeAnswer(value: unknown): string {
  return clean(value).toUpperCase();
}

function isValidAnswer(value: string): boolean {
  return ["A", "B", "C", "D"].includes(value);
}

function generateQuestionId(number: number): string {
  return `Q${String(number).padStart(6, "0")}`;
}

export default function QuizImportPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");

  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [validating, setValidating] =
    useState(false);

  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);

  const [existingDuplicates, setExistingDuplicates] =
    useState<ExistingDuplicate[]>([]);

  const [internalDuplicates, setInternalDuplicates] =
    useState<InternalDuplicateGroup[]>([]);

  const [readyRowNumbers, setReadyRowNumbers] =
    useState<number[]>([]);

  // =====================================================
  // LOAD BOOKS
  // =====================================================

  useEffect(() => {

    async function loadBooks() {

      try {

        setLoadingBooks(true);
        setError("");

        const user = auth.currentUser;

        if (!user) {
          throw new Error(
            "You are not logged in. Please login again."
          );
        }

        const token = await user.getIdToken();

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

        const loadedBooks: Book[] =
          Array.isArray(data.books)
            ? data.books
                .map(
                  (book: Record<string, unknown>) => ({
                    BookID: String(
                      book.BookID ?? ""
                    ),

                    BookName: String(
                      book.BookName ?? ""
                    ),

                    CourseAccess:
                      Array.isArray(
                        book.CourseAccess
                      )
                        ? book.CourseAccess
                            .map((item) =>
                              String(item).trim()
                            )
                            .filter(Boolean)
                        : [],

                    Active:
                      book.Active !== false,
                  })
                )
                .filter(
                  (book: Book) =>
                    book.Active !== false &&
                    book.BookID &&
                    book.BookName
                )
                .sort(
                  (a: Book, b: Book) =>
                    a.BookName.localeCompare(
                      b.BookName
                    )
                )
            : [];

        setBooks(loadedBooks);

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
  // LOAD CHAPTERS WHEN BOOK CHANGES
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
        setSelectedChapterId("");

        const user = auth.currentUser;

        if (!user) {
          throw new Error(
            "You are not logged in. Please login again."
          );
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `/api/admin/chapters?bookId=${encodeURIComponent(
            selectedBookId
          )}`,
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
            data.error || "Unable to load chapters."
          );
        }

        const loadedChapters: Chapter[] =
          Array.isArray(data.chapters)
            ? data.chapters
                .map(
                  (
                    chapter: Record<string, unknown>
                  ) => ({
                    ChapterID: String(
                      chapter.ChapterID ?? ""
                    ),

                    BookID: String(
                      chapter.BookID ?? ""
                    ),

                    ChapterName: String(
                      chapter.ChapterName ?? ""
                    ),

                    CourseAccess:
                      Array.isArray(
                        chapter.CourseAccess
                      )
                        ? chapter.CourseAccess
                            .map((item) =>
                              String(item).trim()
                            )
                            .filter(Boolean)
                        : [],

                    Active:
                      chapter.Active !== false,
                  })
                )
                .filter(
                  (chapter: Chapter) =>
                    chapter.Active !== false &&
                    chapter.ChapterID &&
                    chapter.ChapterName
                )
            : [];

        setChapters(loadedChapters);

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
  // SELECTED BOOK / CHAPTER
  // =====================================================

  const selectedBook = useMemo(
    () =>
      books.find(
        (book) =>
          book.BookID === selectedBookId
      ) || null,
    [books, selectedBookId]
  );

  const selectedChapter = useMemo(
    () =>
      chapters.find(
        (chapter) =>
          chapter.ChapterID === selectedChapterId
      ) || null,
    [chapters, selectedChapterId]
  );
  // =====================================================
  // EXCEL UPLOAD
  // =====================================================

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setValidationResult(null);
    setExistingDuplicates([]);
    setInternalDuplicates([]);
    setMessage("");
    setError("");
    const file = event.target.files?.[0];

    setError("");
    setMessage("");
    setRows([]);
    setColumns([]);
    setFileName("");

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".xlsx")
    ) {
      setError(
        "Please select an Excel .xlsx file."
      );
      return;
    }

    setFileName(file.name);
    setLoading(true);

    try {
      const buffer =
        await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      if (!workbook.SheetNames.length) {
        throw new Error(
          "The Excel file contains no worksheet."
        );
      }

      const firstSheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const data =
        XLSX.utils.sheet_to_json<QuestionRow>(
          firstSheet,
          {
            defval: "",
          }
        );

      if (data.length === 0) {
        throw new Error(
          "The Excel file contains no question rows."
        );
      }

      const detectedColumns =
        Object.keys(data[0]);

      setColumns(detectedColumns);

      const missingColumns =
        REQUIRED_COLUMNS.filter(
          (column) =>
            !detectedColumns.includes(
              column
            )
        );

      if (missingColumns.length > 0) {
        setError(
          `Missing required columns: ${missingColumns.join(
            ", "
          )}`
        );
        return;
      }

      // -----------------------------------------------
      // Validate every row
      // -----------------------------------------------

      const validationErrors: string[] = [];

      data.forEach((row, index) => {
        const rowNumber = index + 2;

        if (!clean(row.Question)) {
          validationErrors.push(
            `Row ${rowNumber}: Question is empty.`
          );
        }

        if (!clean(row.OptionA)) {
          validationErrors.push(
            `Row ${rowNumber}: Option A is empty.`
          );
        }

        if (!clean(row.OptionB)) {
          validationErrors.push(
            `Row ${rowNumber}: Option B is empty.`
          );
        }

        if (!clean(row.OptionC)) {
          validationErrors.push(
            `Row ${rowNumber}: Option C is empty.`
          );
        }

        if (!clean(row.OptionD)) {
          validationErrors.push(
            `Row ${rowNumber}: Option D is empty.`
          );
        }

        const answer =
          normalizeAnswer(
            row.CorrectAnswer
          );

        if (!isValidAnswer(answer)) {
          validationErrors.push(
            `Row ${rowNumber}: CorrectAnswer must be A, B, C or D.`
          );
        }
      });

      if (validationErrors.length > 0) {
        setError(
          validationErrors
            .slice(0, 20)
            .join(" ")
        );
        return;
      }

      setRows(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to read the Excel file."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // =====================================================
  // VALIDATE IMPORT
  // =====================================================

  async function handleValidateImport() {
    setError("");
    setMessage("");

    if (!rows.length) {
      setError("Please upload an Excel file containing questions.");
      return;
    }

    if (!selectedBookId || !selectedChapterId) {
      setError("Please select both Book and Chapter before validating.");
      return;
    }

    if (validating) return;

    setValidating(true);
    setValidationResult(null);
    setExistingDuplicates([]);
    setInternalDuplicates([]);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You are not logged in. Please login again.");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        "/api/admin/questions/validate-import",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questions: rows.map((row, index) => ({
              rowNumber: index + 2,
              questionText: clean(row.Question),
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to validate the Excel import."
        );
      }

      setValidationResult(data.summary);

      setReadyRowNumbers(
        Array.isArray(data.readyRowNumbers)
          ? data.readyRowNumbers
          : []
      );

      setExistingDuplicates(
        Array.isArray(data.existingDuplicates)
          ? data.existingDuplicates
          : []
      );
      setInternalDuplicates(
        Array.isArray(data.internalDuplicates)
          ? data.internalDuplicates
          : []
      );

      setMessage(
        `Validation completed. ${data.summary.readyToImport} question(s) are ready to import.`
      );

    } catch (err: any) {
      console.error("Excel import validation error:", err);
      setError(
        err?.message ||
        "Unable to validate the Excel import."
      );
    } finally {
      setValidating(false);
    }
  }
  // IMPORT QUESTIONS
  // =====================================================

  async function handleImport() {
    setError("");
    setMessage("");

    if (rows.length === 0) {
      setError(
        "Please upload an Excel file containing questions."
      );
      return;
    }

    if (!selectedBook) {
      setError(
        "Please select a Book before importing."
      );
      return;
    }

    if (!selectedChapter) {
      setError(
        "Please select a Chapter before importing."
      );
      return;
    }

    if (!validationResult) {
      setError(
        "Please validate the Excel import before importing."
      );
      return;
    }

    if (readyRowNumbers.length === 0) {
      setError(
        "No new questions are ready to import. All questions are duplicates or excluded."
      );
      return;
    }

    const rowsToImport =
      rows.filter(
        (
          _row: QuestionRow,
          index: number
        ) =>
          readyRowNumbers.includes(
            index + 2
          )
      );

    if (rowsToImport.length === 0) {
      setError(
        "No validated questions are available for import."
      );
      return;
    }
    if (importing) {
      return;
    }

    const confirmed =
      window.confirm(
        `Import ${rowsToImport.length} new question(s) into:\n\nBook: ${selectedBook.BookName}\nChapter: ${selectedChapter.ChapterName}\n\nQuestion IDs will be generated automatically.\n\nContinue?`
      );

    if (!confirmed) {
      return;
    }

    setImporting(true);

    try {
      // -------------------------------------------------
      // Find the latest QuestionID
      // -------------------------------------------------

      let nextNumber = 1;

      try {
        const latestQuery = query(
          collection(db, "questions"),
          orderBy("questionId", "desc"),
          limit(1)
        );

        const latestSnapshot =
          await getDocs(latestQuery);

        if (!latestSnapshot.empty) {
          const latestData =
            latestSnapshot.docs[0].data();

          const latestId =
            clean(
              latestData.questionId
            );

          const match =
            latestId.match(
              /^Q(\d+)$/
            );

          if (match) {
            nextNumber =
              Number(match[1]) + 1;
          }
        }
      } catch (latestError) {
        console.warn(
          "Unable to determine latest QuestionID. Starting from Q000001.",
          latestError
        );
      }

      // -------------------------------------------------
      // Prepare question documents
      // -------------------------------------------------

      const preparedQuestions =
        rowsToImport.map((row, index) => {
          const questionNumber =
            nextNumber + index;

          const questionId =
            generateQuestionId(
              questionNumber
            );

          return {
            questionId,

            bookId:
              selectedBook.BookID,

            book:
              selectedBook.BookName,

            chapterId:
              selectedChapter.ChapterID,

            chapter:
              selectedChapter.ChapterName,

            questionText:
              clean(row.Question),

            options: [
              {
                id: "A",
                text: clean(row.OptionA),
              },
              {
                id: "B",
                text: clean(row.OptionB),
              },
              {
                id: "C",
                text: clean(row.OptionC),
              },
              {
                id: "D",
                text: clean(row.OptionD),
              },
            ],

            correctOptionId:
              normalizeAnswer(
                row.CorrectAnswer
              ),

            explanation: "",

            sourceReference: "",

            amendmentReference: "",

            status: "draft",

            active: true,

            courseAccess:
              selectedBook.CourseAccess ||
              [],

            quizEligible: false,

            masterSource:
              "Excel Import",

            importSource:
              "excel_bulk_import",

            externalQuestionId:
              questionId,

            createdAt:
              new Date(),

            updatedAt:
              new Date(),
          };
        });

      // -------------------------------------------------
      // -------------------------------------------------
      // Send questions through Master Question API
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

      let importedCount = 0;

      for (
        const question of preparedQuestions
      ) {

        const response =
          await fetch(
            "/api/admin/questions",
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
                    question.questionId,

                  bookId:
                    question.bookId,

                  book:
                    question.book,

                  chapterId:
                    question.chapterId,

                  chapter:
                    question.chapter,

                  questionText:
                    question.questionText,

                  options:
                    question.options,

                  correctOptionId:
                    question.correctOptionId,

                  explanation:
                    question.explanation,

                  sourceReference:
                    question.sourceReference,

                  amendmentReference:
                    question.amendmentReference,

                  status:
                    question.status,

                  active:
                    question.active,

                  courseAccess:
                    question.courseAccess,

                  quizEligible:
                    question.quizEligible,

                  masterSource:
                    question.masterSource,

                  importSource:
                    question.importSource,

                  externalQuestionId:
                    question.externalQuestionId,
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
            `Unable to import ${question.questionId}.`
          );
        }

        importedCount++;
      }
      setMessage(
        `Successfully imported ${importedCount} question(s). Question IDs ${generateQuestionId(
          nextNumber
        )} to ${generateQuestionId(
          nextNumber +
            importedCount -
            1
        )} have been created.`
      );

      // -------------------------------------------------
      // Clear uploaded file/questions
      // -------------------------------------------------

      setRows([]);
      setColumns([]);
      setFileName("");

      // Keep Book and Chapter selected
    } catch (err: any) {
      console.error(
        "Bulk question import error:",
        err
      );

      setError(
        err?.message ||
          "Unable to import the questions."
      );
    } finally {
      setImporting(false);
    }
  }

  // =====================================================
  // UI
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
            className="text-sm font-semibold text-white/80 hover:text-white"
          >
            ← Back to Quiz Management
          </Link>

          <p className="mt-6 text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Bulk Question Import
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">
            Upload bulk MCQ questions from Excel,
            select the appropriate departmental
            Book and Chapter, and import them into
            the Master Question Bank.
          </p>

        </div>

      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* =================================================
            INFORMATION
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <h2 className="font-extrabold text-[#123f82]">
            Import Process
          </h2>

          <div className="mt-3 grid gap-3 text-sm text-blue-800 md:grid-cols-4">

            <div>
              <strong>1.</strong> Upload 6-column Excel
            </div>

            <div>
              <strong>2.</strong> Select Book
            </div>

            <div>
              <strong>3.</strong> Select Chapter
            </div>

            <div>
              <strong>4.</strong> Import Questions
            </div>

          </div>

        </div>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <h2 className="text-2xl font-extrabold text-[#123f82]">
            Select Excel Question Bank
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Excel must contain only:
            Question, OptionA, OptionB, OptionC,
            OptionD and CorrectAnswer.
          </p>

          {/* =================================================
              EXCEL UPLOAD
          ================================================= */}

          <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">

            <div className="text-4xl">
              📊
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-slate-700">
              {fileName ||
                "Excel Question Bank"}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Question, four options and
              correct answer only.
            </p>

            <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-[#123f82] px-6 py-3 font-bold text-white transition hover:bg-[#0d326a]">

              Select Excel File

              <input
                type="file"
                accept=".xlsx"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />

            </label>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="mt-6 rounded-xl bg-blue-50 p-5 text-sm font-semibold text-blue-700">
              Reading Excel file...
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          {message && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 text-sm font-semibold text-green-700">
              {message}
            </div>
          )}

          {/* =================================================
              EXCEL VALIDATED
          ================================================= */}

          {columns.length > 0 &&
            !error && (
              <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5">

                <h3 className="font-extrabold text-green-800">
                  Excel structure validated
                </h3>

                <p className="mt-2 text-sm text-green-700">
                  {rows.length} question
                  {rows.length === 1
                    ? ""
                    : "s"} detected.
                </p>

                <p className="mt-2 text-xs text-green-700">
                  QuestionID will be generated
                  automatically during import.
                </p>

              </div>
            )}

          {/* =================================================
              BOOK / CHAPTER ASSIGNMENT
          ================================================= */}

          {rows.length > 0 &&
            !error && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">

                <h3 className="text-xl font-extrabold text-[#123f82]">
                  Assign Book & Chapter
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  These values will be attached
                  automatically to every question
                  in this Excel import.
                </p>

                <div className="mt-6 grid gap-5 md:grid-cols-2">

                  {/* BOOK */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Book *
                    </label>

                    {loadingBooks ? (
                      <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                        Loading books...
                      </div>
                    ) : (
                      <select
                        value={
                          selectedBookId
                        }
                        onChange={(e) =>
                          setSelectedBookId(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >

                        <option value="">
                          Select Book
                        </option>

                        {books.map(
                          (book) => (
                            <option
                              key={
                                book.BookID
                              }
                              value={
                                book.BookID
                              }
                            >
                              {book.BookName}
                            </option>
                          )
                        )}

                      </select>
                    )}

                  </div>

                  {/* CHAPTER */}

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Chapter *
                    </label>

                    {!selectedBookId ? (
                      <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-400">
                        Select a Book first
                      </div>
                    ) : loadingChapters ? (
                      <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                        Loading chapters...
                      </div>
                    ) : (
                      <select
                        value={
                          selectedChapterId
                        }
                        onChange={(e) =>
                          setSelectedChapterId(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >

                        <option value="">
                          Select Chapter
                        </option>

                        {chapters.map(
                          (chapter) => (
                            <option
                              key={
                                chapter.ChapterID
                              }
                              value={
                                chapter.ChapterID
                              }
                            >
                              {chapter.ChapterName}
                            </option>
                          )
                        )}

                      </select>
                    )}

                  </div>

                </div>

                {/* SELECTED INFORMATION */}

                {selectedBook &&
                  selectedChapter && (
                    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">

                      <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                        Import Destination
                      </p>

                      <p className="mt-2 font-extrabold text-[#123f82]">
                        {selectedBook.BookName}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-700">
                        Chapter:{" "}
                        {
                          selectedChapter.ChapterName
                        }
                      </p>

                      <p className="mt-2 text-xs text-blue-600">
                        BookID:{" "}
                        {
                          selectedBook.BookID
                        }
                        {" • "}
                        ChapterID:{" "}
                        {
                          selectedChapter.ChapterID
                        }
                      </p>

                    </div>
                  )}

              </div>
            )}

          {/* =================================================
          {/* =================================================
              IMPORT VALIDATION
          ================================================= */}

          {rows.length > 0 &&
            selectedBookId &&
            selectedChapterId && (
              <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <h3 className="text-xl font-extrabold text-[#123f82]">
                      Import Validation
                    </h3>

                    <p className="mt-1 text-sm text-indigo-700">
                      Check the Excel questions for existing duplicates before importing.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateImport}
                    disabled={validating || importing}
                    className="rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {validating ? "Validating..." : "Validate Import"}
                  </button>

                </div>

                {validationResult && (
                  <div className="mt-5 rounded-xl bg-white p-5">

                    <p className="font-extrabold text-green-700">
                      Validation completed.
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {validationResult.readyToImport} question(s) are ready to import.
                    </p>

                  </div>
                )}

              </div>
            )}

          {/* =================================================
              QUESTION PREVIEW
          ================================================= */}
          {rows.length > 0 &&
            !error && (
              <div className="mt-8 overflow-x-auto">

                <h3 className="mb-4 text-xl font-extrabold text-[#123f82]">
                  Question Preview
                </h3>

                <table className="min-w-full border-collapse text-sm">

                  <thead>

                    <tr className="bg-slate-100 text-left">

                      <th className="border px-3 py-3">
                        #
                      </th>

                      <th className="border px-3 py-3">
                        Question
                      </th>

                      <th className="border px-3 py-3">
                        Option A
                      </th>

                      <th className="border px-3 py-3">
                        Option B
                      </th>

                      <th className="border px-3 py-3">
                        Option C
                      </th>

                      <th className="border px-3 py-3">
                        Option D
                      </th>

                      <th className="border px-3 py-3">
                        Correct
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {rows
                      .slice(0, 10)
                      .map(
                        (
                          row,
                          index
                        ) => (
                          <tr
                            key={
                              index
                            }
                          >

                            <td className="border px-3 py-3 font-semibold">
                              {index +
                                1}
                            </td>

                            <td className="border px-3 py-3">
                              {
                                row.Question
                              }
                            </td>

                            <td className="border px-3 py-3">
                              {
                                row.OptionA
                              }
                            </td>

                            <td className="border px-3 py-3">
                              {
                                row.OptionB
                              }
                            </td>

                            <td className="border px-3 py-3">
                              {
                                row.OptionC
                              }
                            </td>

                            <td className="border px-3 py-3">
                              {
                                row.OptionD
                              }
                            </td>

                            <td className="border px-3 py-3 font-bold">
                              {
                                row.CorrectAnswer
                              }
                            </td>

                          </tr>
                        )
                      )}

                  </tbody>

                </table>

                {rows.length >
                  10 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Showing first 10
                    questions of{" "}
                    {rows.length}.
                  </p>
                )}

              </div>
            )}

          {/* =================================================
              IMPORT BUTTON
          ================================================= */}

          {rows.length > 0 &&
            !error && (
              <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="font-extrabold text-[#123f82]">
                    Ready to Import
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {rows.length} question
                    {rows.length === 1
                      ? ""
                      : "s"} will be
                    imported under the
                    selected Book and
                    Chapter.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    handleImport
                  }
                  disabled={
                    importing ||
                    !selectedBookId ||
                    !selectedChapterId
                  }
                  className="rounded-xl bg-[#123f82] px-7 py-3 font-bold text-white shadow-sm transition hover:bg-[#0d326a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing
                    ? "Importing..."
                    : `Import ${rows.length} Question${
                        rows.length ===
                        1
                          ? ""
                          : "s"
                      }`}
                </button>

              </div>
            )}

        </div>

      </section>

    </main>
  );
}


















