import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { adminAuth, adminDb } from "@/lib/firebase-admin";


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


/* =====================================================
   ADMIN AUTHENTICATION
===================================================== */

async function verifyAdmin(
  request: NextRequest
) {

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

    return {
      ok: false,
      error:
        "Authentication required.",
    };
  }

  const idToken =
    authorization
      .substring(7)
      .trim();

  if (!idToken) {

    return {
      ok: false,
      error:
        "Authentication token missing.",
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

    if (
      !userSnapshot.exists
    ) {

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
      "Question audit authentication error:",
      error
    );

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}


/* =====================================================
   GET — READ-ONLY AUDIT
===================================================== */

export async function GET(
  request: NextRequest
) {

  try {

    const auth =
      await verifyAdmin(
        request
      );

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
    // LOAD ALL MASTER QUESTIONS
    // -------------------------------------------------

    const questionSnapshot =
      await adminDb
        .collection("questions")
        .get();


    // -------------------------------------------------
    // LOAD ALL EXISTING FINGERPRINT INDEXES
    // -------------------------------------------------

    const fingerprintSnapshot =
      await adminDb
        .collection(
          "questionFingerprints"
        )
        .get();


    const fingerprintMap =
      new Map<
        string,
        string
      >();

    for (
      const document of
      fingerprintSnapshot.docs
    ) {

      const data =
        document.data();

      const questionId =
        cleanText(
          data.questionId
        );

      if (questionId) {

        fingerprintMap.set(
          document.id,
          questionId
        );
      }
    }


    // -------------------------------------------------
    // ANALYSE QUESTIONS
    // -------------------------------------------------

    const fingerprintGroups =
      new Map<
        string,
        string[]
      >();

    const missingFingerprint: string[] =
      [];

    const indexedQuestions: string[] =
      [];

    const emptyQuestions: string[] =
      [];


    for (
      const document of
      questionSnapshot.docs
    ) {

      const data =
        document.data();

      const duplicateStatus =
        cleanText(
          data.duplicateStatus
        ).toLowerCase();

      /*
       * Superseded questions are preserved in Firestore
       * for historical/audit purposes, but they must not
       * participate in the ACTIVE uniqueness calculation.
       */
      if (
        duplicateStatus ===
        "superseded"
      ) {
        continue;
      }

      const questionText =
        cleanText(
          data.questionText
        );

      if (!questionText) {

        emptyQuestions.push(
          document.id
        );

        continue;
      }


      const hash =
        fingerprint(
          questionText
        );


      const group =
        fingerprintGroups.get(
          hash
        ) || [];

      group.push(
        document.id
      );

      fingerprintGroups.set(
        hash,
        group
      );


      if (
        fingerprintMap.has(
          hash
        )
      ) {

        indexedQuestions.push(
          document.id
        );

      } else {

        missingFingerprint.push(
          document.id
        );
      }
    }


    // -------------------------------------------------
    // FIND DUPLICATE GROUPS
    // -------------------------------------------------

    const duplicateGroups =
      Array.from(
        fingerprintGroups.entries()
      )
        .filter(
          ([, ids]) =>
            ids.length > 1
        )
        .map(
          ([hash, ids]) => ({
            fingerprint: hash,
            questionIds: ids,
            count: ids.length,
            questions: ids.map((id) => {
              const questionDoc =
                questionSnapshot.docs.find(
                  (doc) => doc.id === id
                );

              const questionData =
                questionDoc?.data() || {};

              return {
                questionId: id,
                questionText:
                  cleanText(
                    questionData.questionText
                  ),
                bookId:
                  cleanText(
                    questionData.bookId
                  ),
                chapterId:
                  cleanText(
                    questionData.chapterId
                  ),
                masterSource:
                  cleanText(
                    questionData.masterSource
                  ),
                importSource:
                  cleanText(
                    questionData.importSource
                  ),
              };
            }),
          })
        );


    // -------------------------------------------------
    // FIND CONFLICTING INDEXES
    // -------------------------------------------------

    const conflictingIndexes: Array<{
      fingerprint: string;
      indexedQuestionId: string;
      actualQuestionIds: string[];
    }> = [];


    for (
      const [
        hash,
        indexedQuestionId,
      ] of fingerprintMap.entries()
    ) {

      const actual =
        fingerprintGroups.get(
          hash
        ) || [];

      if (
        actual.length === 0
      ) {

        conflictingIndexes.push({
          fingerprint: hash,

          indexedQuestionId,

          actualQuestionIds: [],
        });

        continue;
      }

      if (
        !actual.includes(
          indexedQuestionId
        )
      ) {

        conflictingIndexes.push({
          fingerprint: hash,

          indexedQuestionId,

          actualQuestionIds:
            actual,
        });
      }
    }


    // -------------------------------------------------
    // FIRESTORE QUESTION REFERENCE AUDIT
    // -------------------------------------------------
    //
    // Read-only check of questionIds stored in:
    //   quizSets
    //   mockTests
    //
    // This does NOT modify any Firestore document.
    //

    const referenceQuestionIds = [
      ...new Set(
        Array.from(
          fingerprintGroups.values()
        )
          .flat()
          .filter(Boolean)
      ),
    ];

    const referenceSet = new Set(
      referenceQuestionIds
    );

    const questionReferences: Record<
      string,
      {
        quizSets: string[];
        mockTests: string[];
      }
    > = {};

    for (
      const questionId of referenceQuestionIds
    ) {
      questionReferences[questionId] = {
        quizSets: [],
        mockTests: [],
      };
    }

    // -------------------------------------------------
    // QUIZ SET REFERENCES
    // -------------------------------------------------

    const quizSetSnapshot =
      await adminDb
        .collection("quizSets")
        .get();

    for (
      const quizSetDoc of
      quizSetSnapshot.docs
    ) {

      const data =
        quizSetDoc.data();

      const ids =
        Array.isArray(
          data.questionIds
        )
          ? data.questionIds
          : [];

      for (
        const value of ids
      ) {

        const questionId =
          cleanText(value);

        if (
          referenceSet.has(
            questionId
          )
        ) {

          questionReferences[
            questionId
          ].quizSets.push(
            quizSetDoc.id
          );
        }
      }
    }

    // -------------------------------------------------
    // MOCK TEST REFERENCES
    // -------------------------------------------------

    const mockTestSnapshot =
      await adminDb
        .collection("mockTests")
        .get();

    for (
      const mockTestDoc of
      mockTestSnapshot.docs
    ) {

      const data =
        mockTestDoc.data();

      const ids =
        Array.isArray(
          data.questionIds
        )
          ? data.questionIds
          : [];

      for (
        const value of ids
      ) {

        const questionId =
          cleanText(value);

        if (
          referenceSet.has(
            questionId
          )
        ) {

          questionReferences[
            questionId
          ].mockTests.push(
            mockTestDoc.id
          );
        }
      }
    }
    // -------------------------------------------------
    // SUMMARY
    // -------------------------------------------------

    return NextResponse.json({
      success: true,

      readOnly: true,

      summary: {

        totalQuestions:
          questionSnapshot.size,

        totalFingerprintIndexes:
          fingerprintSnapshot.size,

        indexedQuestions:
          indexedQuestions.length,

        missingFingerprint:
          missingFingerprint.length,

        duplicateGroups:
        duplicateGroups.length,

      questionReferences,

      conflictingIndexes:
          conflictingIndexes.length,

        emptyQuestions:
          emptyQuestions.length,
      },

      duplicateGroups,

      missingFingerprint,

      conflictingIndexes,

      emptyQuestions,

      message:
        "Read-only Question Bank uniqueness audit completed. No Firestore data was modified.",
    });

  } catch (error: any) {

    console.error(
      "Question uniqueness audit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to complete Question Bank uniqueness audit.",
      },
      {
        status: 500,
      }
    );
  }
}




