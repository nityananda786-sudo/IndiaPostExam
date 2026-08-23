import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type Option = {
  id: string;
  text: string;
};

type RequestBody = {
  questionId?: string;

  questionText?: string;

  options?: Option[];

  correctOptionId?: string;

  explanation?: string;

  sourceReference?: string;

  amendmentReference?: string;

  bookId?: string;

  book?: string;

  chapterId?: string;

  chapter?: string;

  status?: "draft" | "published";

  active?: boolean;

  courseAccess?: string[];

  quizEligible?: boolean;

  masterSource?: string;

  importSource?: string;

  externalQuestionId?: string;
};


/* =====================================================
   TEXT NORMALIZATION
===================================================== */

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
      "Master Question API authentication error:",
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
   VALIDATION
===================================================== */

function validateOptions(
  options: unknown
): Option[] {

  if (
    !Array.isArray(options) ||
    options.length !== 4
  ) {

    throw new Error(
      "Exactly four answer options are required."
    );
  }

  const cleaned =
    options.map(
      (option, index) => {

        const id =
          cleanText(
            option?.id
          );

        const text =
          cleanText(
            option?.text
          );

        if (!id) {

          throw new Error(
            `Option ${index + 1} has no ID.`
          );
        }

        if (!text) {

          throw new Error(
            `Option ${index + 1} is empty.`
          );
        }

        return {
          id,
          text,
        };
      }
    );

  const ids =
    new Set(
      cleaned.map(
        (option) => option.id
      )
    );

  if (
    ids.size !== cleaned.length
  ) {

    throw new Error(
      "Answer option IDs must be unique."
    );
  }

  return cleaned;
}


/* =====================================================
   POST
===================================================== */

export async function POST(
  request: NextRequest
) {

  try {

    // -------------------------------------------------
    // 1. ADMIN AUTHENTICATION
    // -------------------------------------------------

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
    // 2. REQUEST BODY
    // -------------------------------------------------

    const body =
      (await request.json()) as RequestBody;


    // -------------------------------------------------
    // 3. QUESTION TEXT
    // -------------------------------------------------

    const questionText =
      cleanText(
        body.questionText
      );

    if (!questionText) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Question text is required.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 4. OPTIONS
    // -------------------------------------------------

    let options: Option[];

    try {

      options =
        validateOptions(
          body.options
        );

    } catch (error: any) {

      return NextResponse.json(
        {
          success: false,
          error:
            error?.message ||
            "Invalid answer options.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 5. CORRECT ANSWER
    // -------------------------------------------------

    const correctOptionId =
      cleanText(
        body.correctOptionId
      );

    if (!correctOptionId) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Correct answer is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !options.some(
        (option) =>
          option.id ===
          correctOptionId
      )
    ) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Correct answer does not match any option.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 6. FINGERPRINT
    // -------------------------------------------------

    const normalizedText =
      normalizeQuestionText(
        questionText
      );

    const questionFingerprint =
      createHash("sha256")
        .update(
          normalizedText,
          "utf8"
        )
        .digest("hex");


    // -------------------------------------------------
    // 7. NORMALIZED MASTER DATA
    // -------------------------------------------------

    const explanation =
      cleanText(
        body.explanation
      );

    const sourceReference =
      cleanText(
        body.sourceReference
      );

    const amendmentReference =
      cleanText(
        body.amendmentReference
      );

    const bookId =
      cleanText(
        body.bookId
      );

    const book =
      cleanText(
        body.book
      );

    const chapterId =
      cleanText(
        body.chapterId
      );

    const chapter =
      cleanText(
        body.chapter
      );

    const status =
      body.status === "published"
        ? "published"
        : "draft";

    const active =
      typeof body.active ===
      "boolean"
        ? body.active
        : true;

    const courseAccess =
      Array.isArray(
        body.courseAccess
      )
        ? Array.from(
            new Set(
              body.courseAccess
                .map(cleanText)
                .filter(Boolean)
            )
          )
        : [];

    const quizEligible =
      typeof body.quizEligible ===
      "boolean"
        ? body.quizEligible
        : true;

    const masterSource =
      cleanText(
        body.masterSource
      ) || "admin";

    const importSource =
      cleanText(
        body.importSource
      ) || "admin";

    const externalQuestionId =
      cleanText(
        body.externalQuestionId
      );

    const requestedQuestionId =
      cleanText(
        body.questionId
      );


    // -------------------------------------------------
    // 8. FINGERPRINT INDEX
    // -------------------------------------------------

    const fingerprintRef =
      adminDb
        .collection(
          "questionFingerprints"
        )
        .doc(
          questionFingerprint
        );


    // -------------------------------------------------
    // 9. ATOMIC UNIQUE CREATION
    // -------------------------------------------------
    //
    // IMPORTANT:
    //
    // The fingerprint index and the master question
    // are created in the SAME Firestore transaction.
    //
    // Therefore two simultaneous requests cannot both
    // successfully claim the same new fingerprint.
    //
    // Existing Question Bank documents created before
    // this system are NOT modified here.
    //

    const result =
      await adminDb.runTransaction(
        async (
          transaction
        ) => {

          const fingerprintSnapshot =
            await transaction.get(
              fingerprintRef
            );

          if (
            fingerprintSnapshot.exists
          ) {

            const fingerprintData =
              fingerprintSnapshot.data() ||
              {};

            const existingQuestionId =
              cleanText(
                fingerprintData.questionId
              );

            if (
              existingQuestionId
            ) {

              return {
                duplicate: true,

                questionId:
                  existingQuestionId,
              };
            }

            throw new Error(
              "Question fingerprint index exists but does not contain a valid question ID."
            );
          }


          // -------------------------------------------
          // New master question
          // -------------------------------------------

          const questionRef =
            requestedQuestionId
              ? adminDb
                  .collection("questions")
                  .doc(requestedQuestionId)
              : adminDb
                  .collection("questions")
                  .doc();

          transaction.create(
            questionRef,
            {

              bookId,

              chapterId,

              book,

              chapter,

              questionText,

              options,

              correctOptionId,

              explanation,

              sourceReference,

              amendmentReference,

              status,

              active,

              courseAccess,

              quizEligible,

              masterSource,

              importSource,

              externalQuestionId,

              questionFingerprint,

              createdAt:
                FieldValue.serverTimestamp(),

              updatedAt:
                FieldValue.serverTimestamp(),
            }
          );


          // -------------------------------------------
          // Unique fingerprint index
          // -------------------------------------------

          transaction.create(
            fingerprintRef,
            {

              questionId:
                questionRef.id,

              questionFingerprint,

              normalizedText,

              createdAt:
                FieldValue.serverTimestamp(),

              updatedAt:
                FieldValue.serverTimestamp(),
            }
          );


          return {
            duplicate: false,

            questionId:
              questionRef.id,
          };
        }
      );


    // -------------------------------------------------
    // 10. RESPONSE
    // -------------------------------------------------

    if (
      result.duplicate
    ) {

      return NextResponse.json(
        {
          success: true,

          duplicate: true,

          reusedExistingQuestion:
            true,

          questionId:
            result.questionId,

          message:
            "This question already exists in the master Question Bank. The existing question has been reused; no duplicate question was created.",
        }
      );
    }


    return NextResponse.json(
      {
        success: true,

        duplicate: false,

        reusedExistingQuestion:
          false,

        questionId:
          result.questionId,

        message:
          "One master question and its uniqueness record were created successfully.",
      }
    );

  } catch (error: any) {

    console.error(
      "Master Question API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to create or reuse the master question.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   UPDATE MASTER QUESTION
===================================================== */

export async function PUT(
  request: NextRequest
) {

  try {

    // -------------------------------------------------
    // 1. ADMIN AUTHENTICATION
    // -------------------------------------------------

    const authResult =
      await verifyAdmin(request);

    if (!authResult.ok) {

      return NextResponse.json(
        {
          success: false,
          error:
            authResult.error ||
            "Administrator access required.",
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
      (await request.json()) as RequestBody;

    const questionId =
      cleanText(
        body.questionId
      );

    if (!questionId) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Question ID is required.",
        },
        {
          status: 400,
        }
      );
    }


    const questionText =
      cleanText(
        body.questionText
      );

    if (!questionText) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Question text is required.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 3. OPTIONS
    // -------------------------------------------------

    let options: Option[];

    try {

      options =
        validateOptions(
          body.options
        );

    } catch (error: any) {

      return NextResponse.json(
        {
          success: false,
          error:
            error?.message ||
            "Invalid answer options.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 4. CORRECT ANSWER
    // -------------------------------------------------

    const correctOptionId =
      cleanText(
        body.correctOptionId
      );

    if (!correctOptionId) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Correct answer is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !options.some(
        (option) =>
          option.id ===
          correctOptionId
      )
    ) {

      return NextResponse.json(
        {
          success: false,
          error:
            "Correct answer does not match any option.",
        },
        {
          status: 400,
        }
      );
    }


    // -------------------------------------------------
    // 5. NEW FINGERPRINT
    // -------------------------------------------------

    const normalizedText =
      normalizeQuestionText(
        questionText
      );

    const questionFingerprint =
      createHash("sha256")
        .update(
          normalizedText,
          "utf8"
        )
        .digest("hex");


    const questionRef =
      adminDb
        .collection("questions")
        .doc(questionId);


    const newFingerprintRef =
      adminDb
        .collection(
          "questionFingerprints"
        )
        .doc(
          questionFingerprint
        );


    // -------------------------------------------------
    // 6. ATOMIC UPDATE
    // -------------------------------------------------

    await adminDb.runTransaction(
      async (
        transaction
      ) => {

        const questionSnapshot =
          await transaction.get(
            questionRef
          );

        if (
          !questionSnapshot.exists
        ) {

          throw new Error(
            "Question not found."
          );
        }


        const existingQuestion =
          questionSnapshot.data() ||
          {};


        const oldFingerprint =
          cleanText(
            existingQuestion.questionFingerprint
          );


        // ---------------------------------------------
        // Check new fingerprint ownership
        // ---------------------------------------------

        const newFingerprintSnapshot =
          await transaction.get(
            newFingerprintRef
          );

        if (
          newFingerprintSnapshot.exists
        ) {

          const fingerprintData =
            newFingerprintSnapshot.data() ||
            {};

          const existingQuestionId =
            cleanText(
              fingerprintData.questionId
            );

          if (
            existingQuestionId &&
            existingQuestionId !==
              questionId
          ) {

            throw new Error(
              `This question already exists as ${existingQuestionId}. Please edit the existing question instead of creating a duplicate.`
            );
          }
        }


        // ---------------------------------------------
        // Remove old fingerprint
        // ---------------------------------------------

        if (
          oldFingerprint &&
          oldFingerprint !==
            questionFingerprint
        ) {

          const oldFingerprintRef =
            adminDb
              .collection(
                "questionFingerprints"
              )
              .doc(
                oldFingerprint
              );

          transaction.delete(
            oldFingerprintRef
          );
        }


        // ---------------------------------------------
        // Create/update new fingerprint
        // ---------------------------------------------

        transaction.set(
          newFingerprintRef,
          {

            questionId,

            questionFingerprint,

            normalizedText,

            updatedAt:
              FieldValue.serverTimestamp(),

          },
          {
            merge: true,
          }
        );


        // ---------------------------------------------
        // Update master question
        // ---------------------------------------------

        transaction.update(
          questionRef,
          {

            questionText,

            options,

            correctOptionId,

            explanation:
              cleanText(
                body.explanation
              ),

            sourceReference:
              cleanText(
                body.sourceReference
              ),

            amendmentReference:
              cleanText(
                body.amendmentReference
              ),

            status:
              body.status ===
                "published"
                ? "published"
                : "draft",

            active:
              body.active !== false,

            courseAccess:
              Array.isArray(
                body.courseAccess
              )
                ? body.courseAccess
                    .map(
                      (item) =>
                        cleanText(item)
                    )
                    .filter(Boolean)
                : [],

            quizEligible:
              body.quizEligible ===
              true,

            importSource:
              cleanText(
                body.importSource
              ),

            externalQuestionId:
              cleanText(
                body.externalQuestionId
              ),

            questionFingerprint,

            updatedAt:
              FieldValue.serverTimestamp(),

          }
        );

      }
    );


    // -------------------------------------------------
    // 7. SUCCESS
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        questionId,

        questionFingerprint,

        message:
          "Question and uniqueness record updated successfully.",
      }
    );

  } catch (error: any) {

    console.error(
      "Master Question UPDATE API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to update the master question.",
      },
      {
        status: 500,
      }
    );
  }
}

