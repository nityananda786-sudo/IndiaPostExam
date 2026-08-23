import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type QuizOption = {
  id: string;
  text: string;
};

type SyncQuestionPayload = {
  questionId: string;

  bookId: string;
  book: string;

  chapterId: string;
  chapter: string;

  question: string;

  options: QuizOption[];

  correctAnswer: string;

  explanation?: string;

  sourceReference?: string;

  amendmentReference?: string;

  status?: string;

  active?: boolean;

  courseAccess?: string[];

  quizEligible?: boolean;
};


// =====================================================
// SECURITY
// =====================================================

function isAuthorized(request: NextRequest) {
  const expectedSecret =
    process.env.FIREBASE_SYNC_SECRET;

  const suppliedSecret =
    request.headers.get(
      "x-india-post-exam-sync-secret"
    );

  if (
    !expectedSecret ||
    !suppliedSecret
  ) {
    return false;
  }

  return suppliedSecret === expectedSecret;
}


// =====================================================
// VALIDATE QUESTION
// =====================================================

function validateQuestion(
  data: SyncQuestionPayload
) {
  if (
    !data.questionId ||
    !data.questionId.trim()
  ) {
    return "QuestionID is required.";
  }

  if (
    !data.bookId ||
    !data.bookId.trim()
  ) {
    return "BookID is required.";
  }

  if (
    !data.chapterId ||
    !data.chapterId.trim()
  ) {
    return "ChapterID is required.";
  }

  if (
    !data.question ||
    !data.question.trim()
  ) {
    return "Question text is required.";
  }

  if (
    !Array.isArray(data.options) ||
    data.options.length !== 4
  ) {
    return "Exactly four options are required.";
  }

  const optionIds = [
    "A",
    "B",
    "C",
    "D",
  ];

  for (const id of optionIds) {
    const option =
      data.options.find(
        (item) => item.id === id
      );

    if (
      !option ||
      !option.text ||
      !option.text.trim()
    ) {
      return `Option ${id} is required.`;
    }
  }

  const correctAnswer =
    String(
      data.correctAnswer || ""
    )
      .trim()
      .toUpperCase();

  if (
    !["A", "B", "C", "D"].includes(
      correctAnswer
    )
  ) {
    return "CorrectAnswer must be A, B, C or D.";
  }

  return null;
}


// =====================================================
// POST
// =====================================================

export async function POST(
  request: NextRequest
) {
  try {

    // -------------------------------------------------
    // AUTHORIZATION
    // -------------------------------------------------

    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized synchronization request.",
        },
        {
          status: 401,
        }
      );
    }


    // -------------------------------------------------
    // READ BODY
    // -------------------------------------------------

    const data =
      (await request.json()) as SyncQuestionPayload;


    // -------------------------------------------------
    // VALIDATE
    // -------------------------------------------------

    const validation =
      validateQuestion(data);

    if (validation) {
      return NextResponse.json(
        {
          success: false,
          error: validation,
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

    const questionId =
      data.questionId.trim();

    const status =
      String(
        data.status || "draft"
      )
        .trim()
        .toLowerCase();

    const active =
      data.active !== false;

    const quizEligible =
      data.quizEligible === true;

    const courseAccess =
      Array.isArray(
        data.courseAccess
      )
        ? data.courseAccess
            .map((item) =>
              String(item).trim()
            )
            .filter(Boolean)
        : [];


    const options =
      data.options.map(
        (option) => ({
          id:
            String(option.id)
              .trim()
              .toUpperCase(),

          text:
            String(option.text)
              .trim(),
        })
      );


    // -------------------------------------------------
    // FIRESTORE DOCUMENT
    // -------------------------------------------------

    const questionRef =
      adminDb
        .collection("questions")
        .doc(questionId);


    await questionRef.set(
      {
        // Master identity
        questionId,

        // Book
        bookId:
          data.bookId.trim(),

        book:
          data.book.trim(),

        // Chapter
        chapterId:
          data.chapterId.trim(),

        chapter:
          data.chapter.trim(),

        // Question
        questionText:
          data.question.trim(),

        // Options
        options,

        // Correct answer
        correctOptionId:
          String(
            data.correctAnswer
          )
            .trim()
            .toUpperCase(),

        // Explanation
        explanation:
          String(
            data.explanation || ""
          ).trim(),

        // References
        sourceReference:
          String(
            data.sourceReference || ""
          ).trim(),

        amendmentReference:
          String(
            data.amendmentReference || ""
          ).trim(),

        // Publication
        status,

        active,

        // Course assignment
        courseAccess,

        // Quiz control
        quizEligible,

        // Master source
        masterSource:
          "Google Sheets",

        importSource:
          "google_sheets",

        externalQuestionId:
          questionId,

        // Synchronization
        syncedAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      },

      {
        merge: true,
      }
    );


    // -------------------------------------------------
    // SUCCESS
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Question synchronized successfully.",

        questionId,

        firestorePath:
          `questions/${questionId}`,

        status,

        quizEligible,
      },
      {
        status: 200,
      }
    );

  } catch (error: any) {

    console.error(
      "Question synchronization error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Internal synchronization error.",
      },
      {
        status: 500,
      }
    );
  }
}