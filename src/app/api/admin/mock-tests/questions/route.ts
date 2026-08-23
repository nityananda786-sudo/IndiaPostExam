import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type Option = {
  id: string;
  text: string;
};

type RequestBody = {
  questionText?: string;
  options?: Option[];
  correctOptionId?: string;
  explanation?: string;
  sourceReference?: string;
  amendmentReference?: string;
};

function normalizeQuestionText(
  value: string
): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
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
      .substring("Bearer ".length)
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

    const userSnap =
      await adminDb
        .collection("users")
        .doc(decodedToken.uid)
        .get();

    if (!userSnap.exists) {
      return {
        ok: false,
        error:
          "Administrator profile not found.",
      };
    }

    const userData =
      userSnap.data() || {};

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
      "Mock-only question admin authentication error:",
      error
    );

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}

function validateOptions(
  options: unknown
): {
  ok: boolean;
  options?: Option[];
  error?: string;
} {

  if (!Array.isArray(options)) {
    return {
      ok: false,
      error:
        "Exactly four answer options are required.",
    };
  }

  if (options.length !== 4) {
    return {
      ok: false,
      error:
        "Exactly four answer options are required.",
    };
  }

  const cleaned =
    options.map((option, index) => ({
      id:
        cleanText(option?.id) ||
        `option_${index + 1}`,

      text:
        cleanText(option?.text),
    }));

  const ids =
    cleaned.map(
      (option) => option.id
    );

  if (
    new Set(ids).size !==
    ids.length
  ) {
    return {
      ok: false,
      error:
        "Duplicate option IDs are not allowed.",
    };
  }

  for (
    let index = 0;
    index < cleaned.length;
    index++
  ) {
    if (!cleaned[index].text) {
      return {
        ok: false,
        error:
          `Option ${String.fromCharCode(
            65 + index
          )} cannot be empty.`,
      };
    }
  }

  return {
    ok: true,
    options: cleaned,
  };
}

export async function POST(
  request: NextRequest
) {

  try {

    // ==================================================
    // 1. ADMIN AUTHENTICATION
    // ==================================================

    const auth =
      await verifyAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: 401 }
      );
    }

    // ==================================================
    // 2. READ REQUEST
    // ==================================================

    const body =
      (await request.json()) as RequestBody;

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
        { status: 400 }
      );
    }

    const optionValidation =
      validateOptions(
        body.options
      );

    if (!optionValidation.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            optionValidation.error,
        },
        { status: 400 }
      );
    }

    const options =
      optionValidation.options!;

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
        { status: 400 }
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
        { status: 400 }
      );
    }

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

    // ==================================================
    // 3. NORMALIZED DUPLICATE CHECK
    // ==================================================
    //
    // IMPORTANT:
    //
    // We never create a second master question if
    // the same normalized question text already exists.
    //
    // Existing questions from the Question Bank are
    // therefore reused automatically.
    //

    const normalizedText =
      normalizeQuestionText(
        questionText
      );

    const questionSnapshot =
      await adminDb
        .collection("questions")
        .get();

    for (
      const questionDoc of
      questionSnapshot.docs
    ) {

      const existingData =
        questionDoc.data();

      const existingText =
        cleanText(
          existingData.questionText
        );

      if (!existingText) {
        continue;
      }

      const existingNormalized =
        normalizeQuestionText(
          existingText
        );

      if (
        existingNormalized ===
        normalizedText
      ) {

        return NextResponse.json({
          success: true,

          duplicate: true,

          reusedExistingQuestion:
            true,

          questionId:
            questionDoc.id,

          message:
            "This question already exists in the master Question Bank. The existing question has been reused; no duplicate question was created.",
        });
      }
    }

    // ==================================================
    // 4. CREATE ONE MASTER QUESTION
    // ==================================================
    //
    // Mock-Test-only questions still live in the
    // MASTER questions collection.
    //
    // They simply have empty Book/Chapter fields and
    // are identified by importSource/masterSource.
    //

    const questionRef =
      adminDb
        .collection("questions")
        .doc();

    await questionRef.create({

      bookId: "",
      chapterId: "",

      book: "",
      chapter: "",

      questionText,

      options,

      correctOptionId,

      explanation,

      sourceReference,

      amendmentReference,

      status: "published",

      active: true,

      quizEligible: false,

      masterSource:
        "mock-test",

      importSource:
        "mock-test",

      externalQuestionId: "",

      createdAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    });

    // ==================================================
    // 5. RETURN NEW MASTER QUESTION ID
    // ==================================================

    return NextResponse.json({
      success: true,

      duplicate: false,

      reusedExistingQuestion:
        false,

      questionId:
        questionRef.id,

      message:
        "Mock-Test-only question created successfully in the master Question Bank.",
    });

  } catch (error) {

    console.error(
      "Mock-Test-only question API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create Mock-Test-only question.",
      },
      { status: 500 }
    );
  }
}
