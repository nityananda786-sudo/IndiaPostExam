import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type SubmitBody = {
  mockTestId?: string;
  answers?: Record<string, string>;
};

type QuestionRecord = {
  questionText?: string;
  options?: {
    id: string;
    text: string;
  }[];
  correctOptionId?: string;
  active?: boolean;
  status?: string;
};

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    // ==================================================
    // 1. FIREBASE AUTHENTICATION
    // ==================================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return jsonError(
        "Authentication required.",
        401
      );
    }

    const idToken =
      authorization
        .substring("Bearer ".length)
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

    const uid = decodedToken.uid;

    // ==================================================
    // 2. READ REQUEST BODY
    // ==================================================

    const body =
      (await request.json()) as SubmitBody;

    const mockTestId =
      typeof body?.mockTestId === "string"
        ? body.mockTestId.trim()
        : "";

    const answers =
      body?.answers &&
      typeof body.answers === "object" &&
      !Array.isArray(body.answers)
        ? body.answers
        : null;

    if (!mockTestId) {
      return jsonError(
        "Mock Test ID is required.",
        400
      );
    }

    if (!answers) {
      return jsonError(
        "Answers are required.",
        400
      );
    }

    // ==================================================
    // 3. READ MOCK TEST
    // ==================================================

    const mockTestSnap =
      await adminDb
        .collection("mockTests")
        .doc(mockTestId)
        .get();

    if (!mockTestSnap.exists) {
      return jsonError(
        "Mock Test not found.",
        404
      );
    }

    const mockTest =
      mockTestSnap.data() || {};

    if (mockTest.active !== true) {
      return jsonError(
        "This Mock Test is not active.",
        403
      );
    }

    if (mockTest.status !== "published") {
      return jsonError(
        "This Mock Test is not published.",
        403
      );
    }

    // ==================================================
    // 4. READ QUESTION IDS
    // ==================================================

    const rawQuestionIds =
      Array.isArray(mockTest.questionIds)
        ? mockTest.questionIds
        : [];

    const questionIds =
      rawQuestionIds
        .map((id: unknown) =>
          String(id).trim()
        )
        .filter(Boolean);

    if (questionIds.length !== 25) {
      return jsonError(
        "This Mock Test does not contain exactly 25 valid questions.",
        500
      );
    }

    // ==================================================
    // 5. DUPLICATE QUESTION PROTECTION
    // ==================================================

    const uniqueQuestionIds =
      Array.from(
        new Set(questionIds)
      );

    if (
      uniqueQuestionIds.length !==
      questionIds.length
    ) {
      return jsonError(
        "This Mock Test contains duplicate question IDs.",
        500
      );
    }

    // ==================================================
    // 6. READ MASTER QUESTIONS
    // ==================================================

    const questionRefs =
      uniqueQuestionIds.map((id) =>
        adminDb
          .collection("questions")
          .doc(id)
      );

    const questionSnapshots =
      await adminDb.getAll(
        ...questionRefs
      );

    const questionMap =
      new Map<string, QuestionRecord>();

    questionSnapshots.forEach(
      (snap) => {
        if (snap.exists) {
          questionMap.set(
            snap.id,
            snap.data() as QuestionRecord
          );
        }
      }
    );

    if (
      questionMap.size !==
      uniqueQuestionIds.length
    ) {
      return jsonError(
        "One or more Mock Test questions could not be found.",
        500
      );
    }

    // ==================================================
    // 7. VALIDATE QUESTIONS
    // ==================================================

    for (const questionId of uniqueQuestionIds) {
      const question =
        questionMap.get(questionId);

      if (!question) {
        return jsonError(
          `Question ${questionId} not found.`,
          500
        );
      }

      if (
        question.active !== true ||
        question.status !== "published"
      ) {
        return jsonError(
          `Question ${questionId} is no longer published and active.`,
          409
        );
      }

      if (
        !question.correctOptionId ||
        !Array.isArray(question.options) ||
        question.options.length === 0
      ) {
        return jsonError(
          `Question ${questionId} is not properly configured.`,
          500
        );
      }
    }

    // ==================================================
    // 8. VALIDATE ANSWER IDS
    // ==================================================

    for (const answerQuestionId of Object.keys(
      answers
    )) {
      if (
        !uniqueQuestionIds.includes(
          answerQuestionId
        )
      ) {
        return jsonError(
          "The submitted answers contain a question that does not belong to this Mock Test.",
          400
        );
      }

      const answer =
        answers[answerQuestionId];

      if (
        typeof answer !== "string"
      ) {
        return jsonError(
          "Invalid answer format.",
          400
        );
      }

      const question =
        questionMap.get(
          answerQuestionId
        );

      const validOption =
        question?.options?.some(
          (option) =>
            option.id === answer
        );

      if (!validOption) {
        return jsonError(
          `Invalid option submitted for question ${answerQuestionId}.`,
          400
        );
      }
    }

    // ==================================================
    // 9. CALCULATE SCORE ON SERVER
    // ==================================================

    let correctCount = 0;
    let attemptedCount = 0;

    for (const questionId of uniqueQuestionIds) {
      const selectedAnswer =
        answers[questionId];

      if (
        typeof selectedAnswer === "string" &&
        selectedAnswer.trim()
      ) {
        attemptedCount += 1;
      }

      const question =
        questionMap.get(questionId);

      if (
        selectedAnswer &&
        selectedAnswer ===
          question?.correctOptionId
      ) {
        correctCount += 1;
      }
    }

    const wrongCount =
      attemptedCount - correctCount;

    const unansweredCount =
      uniqueQuestionIds.length -
      attemptedCount;

    const marksPerQuestion =
      Number(
        mockTest.marksPerQuestion ?? 2
      );

    const negativeMarks =
      Number(
        mockTest.negativeMarks ?? 0
      );

    const score =
      correctCount * marksPerQuestion -
      wrongCount * negativeMarks;

    const maximumMarks =
      uniqueQuestionIds.length *
      marksPerQuestion;

    // ==================================================
    // 10. CREATE ATTEMPT
    // ==================================================

    const attemptRef =
      adminDb
        .collection("mockAttempts")
        .doc();

    await attemptRef.set({
      mockTestId,
      userId: uid,

      answers,

      questionIds:
        uniqueQuestionIds,

      correctCount,
      wrongCount,
      attemptedCount,
      unansweredCount,

      score,
      maximumMarks,

      marksPerQuestion,
      negativeMarks,

      submittedAt:
        FieldValue.serverTimestamp(),

      createdAt:
        FieldValue.serverTimestamp(),
    });

    // ==================================================
    // 11. OFFICIAL MERIT
    // ==================================================
    //
    // IMPORTANT:
    //
    // The official merit record is created ONLY on
    // the aspirant's first official submission.
    //
    // Retakes remain in mockAttempts and do not
    // replace this score.
    //

    const meritId =
      `${mockTestId}_${uid}`;

    const meritRef =
      adminDb
        .collection("mockMerits")
        .doc(meritId);

    const meritSnap =
      await meritRef.get();

    let officialScore = score;
    let officialSubmittedAt =
      new Date().toISOString();

    if (!meritSnap.exists) {

      await meritRef.create({
        mockTestId,
        userId: uid,

        score,
        maximumMarks,

        correctCount,
        wrongCount,
        attemptedCount,

        submittedAt:
          FieldValue.serverTimestamp(),

        createdAt:
          FieldValue.serverTimestamp(),
      });

    } else {

      const existingMerit =
        meritSnap.data() || {};

      officialScore =
        Number(
          existingMerit.score ?? 0
        );

      officialSubmittedAt =
        existingMerit.submittedAt
          ?.toDate?.()
          ?.toISOString?.() ||
        officialSubmittedAt;
    }

    // ==================================================
    // 12. RETURN RESULT
    // ==================================================

    return NextResponse.json({
      success: true,

      attempt: {
        attemptId: attemptRef.id,

        score,
        maximumMarks,

        correctCount,
        wrongCount,
        attemptedCount,
        unansweredCount,
      },

      officialMerit: {
        score: officialScore,
        submittedAt:
          officialSubmittedAt,
      },

      message:
        meritSnap.exists
          ? "Mock Test submitted. Your official merit score remains unchanged."
          : "Mock Test submitted. Your official merit score has been recorded.",
    });

  } catch (error) {

    console.error(
      "Mock Test submission error:",
      error
    );

    return jsonError(
      "Unable to submit Mock Test.",
      500
    );
  }
}
