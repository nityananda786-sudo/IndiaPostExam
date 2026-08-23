import { NextRequest, NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  FieldValue,
} from "firebase-admin/firestore";

type ReportReason =
  | "question_incorrect"
  | "answer_incorrect"
  | "option_incorrect"
  | "explanation_incorrect"
  | "ambiguous"
  | "other";

type ReportContext =
  | "practice"
  | "quiz"
  | "mock-test";

type RequestBody = {
  questionId?: string;

  context?: ReportContext;

  reason?: ReportReason;

  comment?: string;

  selectedOptionId?: string;
};

function cleanText(
  value: unknown
): string {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {

    // =================================================
    // 1. AUTHENTICATION
    // =================================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return jsonError(
        "Authentication required.",
        401
      );
    }

    const idToken =
      authorization
        .substring(7)
        .trim();

    if (!idToken) {
      return jsonError(
        "Authentication token missing.",
        401
      );
    }

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    const uid =
      decodedToken.uid;

    // =================================================
    // 2. REQUEST
    // =================================================

    const body =
      (await request.json()) as RequestBody;

    const questionId =
      cleanText(
        body.questionId
      );

    const context =
      cleanText(
        body.context
      ) as ReportContext;

    const reason =
      cleanText(
        body.reason
      ) as ReportReason;

    const comment =
      cleanText(
        body.comment
      );

    const selectedOptionId =
      cleanText(
        body.selectedOptionId
      );

    const validContexts:
      ReportContext[] = [
        "practice",
        "quiz",
        "mock-test",
      ];

    const validReasons:
      ReportReason[] = [
        "question_incorrect",
        "answer_incorrect",
        "option_incorrect",
        "explanation_incorrect",
        "ambiguous",
        "other",
      ];

    if (!questionId) {
      return jsonError(
        "Question ID is required.",
        400
      );
    }

    if (
      !validContexts.includes(
        context
      )
    ) {
      return jsonError(
        "Invalid report context.",
        400
      );
    }

    if (
      !validReasons.includes(
        reason
      )
    ) {
      return jsonError(
        "Invalid report reason.",
        400
      );
    }

    if (comment.length > 2000) {
      return jsonError(
        "Comment cannot exceed 2000 characters.",
        400
      );
    }

    // =================================================
    // 3. READ CURRENT QUESTION
    // =================================================

    const questionRef =
      adminDb
        .collection("questions")
        .doc(questionId);

    const questionSnapshot =
      await questionRef.get();

    if (
      !questionSnapshot.exists
    ) {
      return jsonError(
        "Question not found.",
        404
      );
    }

    const question =
      questionSnapshot.data() || {};

    // =================================================
    // 4. CREATE REPORT
    // =================================================

    const reportRef =
      adminDb
        .collection("questionReports")
        .doc();

    await reportRef.set({

      reportId:
        reportRef.id,

      questionId,

      questionNumber:
        cleanText(
          question.questionId
        ),

      aspirantId:
        uid,

      context,

      reason,

      comment,

      selectedOptionId,

      status:
        "pending",

      // Snapshot of the question
      // exactly as it appeared when reported.
      questionSnapshot: {
        questionText:
          cleanText(
            question.questionText
          ),

        options:
          Array.isArray(
            question.options
          )
            ? question.options.map(
                (option: any) => ({
                  id:
                    cleanText(
                      option?.id
                    ),
                  text:
                    cleanText(
                      option?.text
                    ),
                })
              )
            : [],

        correctOptionId:
          cleanText(
            question.correctOptionId
          ),

        explanation:
          cleanText(
            question.explanation
          ),

        bookId:
          cleanText(
            question.bookId
          ),

        chapterId:
          cleanText(
            question.chapterId
          ),

        sourceReference:
          cleanText(
            question.sourceReference
          ),

        amendmentReference:
          cleanText(
            question.amendmentReference
          ),
      },

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),

    });

    // =================================================
    // 5. RESPONSE
    // =================================================

    return NextResponse.json(
      {
        success: true,

        reportId:
          reportRef.id,

        message:
          "Thank you. Your correction suggestion has been submitted for review.",
      }
    );

  } catch (error: any) {

    console.error(
      "Question report error:",
      error
    );

    return jsonError(
      error?.message ||
        "Unable to submit question report.",
      500
    );
  }
}
