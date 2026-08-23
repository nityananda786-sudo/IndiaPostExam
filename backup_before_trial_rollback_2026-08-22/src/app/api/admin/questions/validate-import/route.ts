import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";


type ImportQuestion = {
  questionId?: string;
  questionText?: string;
};


function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeQuestionText(
  value: unknown
): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}


function fingerprint(
  value: unknown
): string {
  return createHash("sha256")
    .update(
      normalizeQuestionText(value),
      "utf8"
    )
    .digest("hex");
}


async function verifyAdmin(
  request: NextRequest
) {

  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return {
      ok: false,
      error: "Authentication required.",
    };
  }

  const idToken =
    authorization
      .substring(7)
      .trim();

  if (!idToken) {
    return {
      ok: false,
      error: "Authentication token missing.",
    };
  }

  try {

    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken
      );

    if (
      decodedToken.admin === true ||
      decodedToken.role === "admin"
    ) {
      return {
        ok: true,
        uid: decodedToken.uid,
      };
    }

    const userSnapshot =
      await adminDb
        .collection("users")
        .doc(decodedToken.uid)
        .get();

    if (!userSnapshot.exists) {
      return {
        ok: false,
        error:
          "Admin user profile not found.",
      };
    }

    const userData =
      userSnapshot.data() || {};

    const role =
      String(
        userData.role ||
        userData.userRole ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      role !== "admin" &&
      role !== "administrator"
    ) {
      return {
        ok: false,
        error:
          "Administrator access required.",
      };
    }

    return {
      ok: true,
      uid: decodedToken.uid,
    };

  } catch (error) {

    console.error(
      "Import validation authentication error:",
      error
    );

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}


export async function POST(
  request: NextRequest
) {

  try {

    // -------------------------------------------------
    // 1. ADMIN AUTHENTICATION
    // -------------------------------------------------

    const auth =
      await verifyAdmin(request);

    if (!auth.ok) {

      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        {
          status: 401,
        }
      );
    }


    // -------------------------------------------------
    // 2. REQUEST BODY
    // -------------------------------------------------

    const body =
      await request.json();

    const questions =
      Array.isArray(body.questions)
        ? body.questions
        : [];

    if (questions.length === 0) {

      return NextResponse.json(
        {
          success: false,
          error:
            "No questions were supplied for validation.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 3. BUILD FINGERPRINTS
    // -------------------------------------------------

    const preparedQuestions =
      questions.map(
        (
          question: ImportQuestion,
          index: number
        ) => {

          const questionText =
            cleanText(
              question.questionText
            );

          return {
            rowNumber:
              index + 2,

            questionId:
              cleanText(
                question.questionId
              ),

            questionText,

            fingerprint:
              fingerprint(
                questionText
              ),
          };
        }
      );


    // -------------------------------------------------
    // 4. FIND DUPLICATES INSIDE THIS IMPORT
    // -------------------------------------------------

    const fingerprintGroups =
      new Map<
        string,
        typeof preparedQuestions
      >();

    for (
      const question of
      preparedQuestions
    ) {

      const existing =
        fingerprintGroups.get(
          question.fingerprint
        ) || [];

      existing.push(question);

      fingerprintGroups.set(
        question.fingerprint,
        existing
      );
    }


    const internalDuplicates =
      Array.from(
        fingerprintGroups.values()
      )
        .filter(
          (group) =>
            group.length > 1
        )
        .map(
          (group) => ({
            fingerprint:
              group[0].fingerprint,

            questions:
              group,
          })
        );


    // -------------------------------------------------
    // 5. CHECK EXISTING FINGERPRINT INDEXES
    // -------------------------------------------------

    const existingDuplicates = [];

    for (
      const question of
      preparedQuestions
    ) {

      const fingerprintRef =
        adminDb
          .collection(
            "questionFingerprints"
          )
          .doc(
            question.fingerprint
          );

      const fingerprintSnapshot =
        await fingerprintRef.get();

      if (
        fingerprintSnapshot.exists
      ) {

        const fingerprintData =
          fingerprintSnapshot.data() ||
          {};

        existingDuplicates.push({
          rowNumber:
            question.rowNumber,

          questionId:
            question.questionId,

          questionText:
            question.questionText,

          fingerprint:
            question.fingerprint,

          existingQuestionId:
            cleanText(
              fingerprintData.questionId
            ),
        });
      }
    }


    // -------------------------------------------------
    // 6. NEW QUESTIONS
    // -------------------------------------------------

    const duplicateRows =
      new Set<number>();

    for (
      const item of
      existingDuplicates
    ) {
      duplicateRows.add(
        item.rowNumber
      );
    }

    for (
      const group of
      internalDuplicates
    ) {

      for (
        const question of
        group.questions
      ) {
        duplicateRows.add(
          question.rowNumber
        );
      }
    }


    const newQuestions =
      preparedQuestions.filter(
        (
          question: (typeof preparedQuestions)[number]
        ) =>
          !duplicateRows.has(
            question.rowNumber
          )
      );


    const readyRowNumbers =
      newQuestions.map(
        (
          question: (typeof newQuestions)[number]
        ) =>
          question.rowNumber
      );

    // -------------------------------------------------
    // 7. RESULT
    // -------------------------------------------------

    return NextResponse.json({

      success: true,

      readOnly: true,

      summary: {

        total:
          preparedQuestions.length,

        newQuestions:
          newQuestions.length,

        existingDuplicates:
          existingDuplicates.length,

        internalDuplicateRows:
          internalDuplicates.reduce(
            (total, group) =>
              total +
              group.questions.length,
            0
          ),

        readyToImport:
          newQuestions.length,

      },

      readyRowNumbers,

      newQuestions,

      existingDuplicates,

      internalDuplicates,

    });

  } catch (error: any) {

    console.error(
      "Question import validation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to validate imported questions.",
      },
      {
        status: 500,
      }
    );
  }
}




