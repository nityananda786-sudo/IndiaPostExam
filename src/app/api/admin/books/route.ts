import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type RequestBody = {
  bookId?: string;
  bookName?: string;
  active?: boolean;
  courseAccess?: string[];
};

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false,
      error: "Authentication required.",
    };
  }

  const idToken = authorization.substring(7).trim();

  if (!idToken) {
    return {
      ok: false,
      error: "Authentication token missing.",
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (
      decodedToken.admin === true ||
      decodedToken.role === "admin"
    ) {
      return {
        ok: true,
        uid: decodedToken.uid,
      };
    }

    const userSnap = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userSnap.exists) {
      return {
        ok: false,
        error: "Admin user profile not found.",
      };
    }

    const userData = userSnap.data() || {};

    const role = String(
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
        error: "Administrator access required.",
      };
    }

    return {
      ok: true,
      uid: decodedToken.uid,
    };
  } catch (error) {
    console.error("Admin authentication error:", error);

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}

function normalizeCourseAccess(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((id) => String(id).trim())
        .filter(Boolean)
    )
  );
}

function normalizeActive(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (
      v === "false" ||
      v === "0" ||
      v === "no"
    ) {
      return false;
    }
  }

  return true;
}

function cleanBookData(
  data: FirebaseFirestore.DocumentData,
  id: string
) {
  return {
    BookID: id,
    BookName: String(
      data.bookName ??
      data.BookName ??
      ""
    ).trim(),

    CourseAccess:
      normalizeCourseAccess(
        data.courseAccess ??
        data.CourseAccess
      ),

    Active: normalizeActive(
      data.active ??
      data.Active
    ),
  };
}

/* =====================================================
   GET BOOKS
   ===================================================== */

export async function GET(
  request: NextRequest
) {
  try {
    const auth = await verifyAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: 401 }
      );
    }

    const snapshot = await adminDb
      .collection("books")
      .orderBy("bookName")
      .get();

    const books = snapshot.docs.map((doc) =>
      cleanBookData(
        doc.data(),
        doc.id
      )
    );

    return NextResponse.json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    console.error(
      "Books GET API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load books.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   CREATE / UPDATE
   ===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    const auth = await verifyAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const bookName = String(
      body.bookName || ""
    ).trim();

    const courseAccess =
      normalizeCourseAccess(
        body.courseAccess
      );

    if (!bookName) {
      return NextResponse.json(
        {
          success: false,
          error: "Book name is required.",
        },
        { status: 400 }
      );
    }

    if (courseAccess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select at least one course.",
        },
        { status: 400 }
      );
    }

    /*
     * Create Book ID using a Firestore counter.
     *
     * Counter document:
     * system/counters
     *
     * Field:
     * books
     */

    const counterRef = adminDb
      .collection("system")
      .doc("counters");

    const bookId =
      await adminDb.runTransaction(
        async (transaction) => {
          const counterSnap =
            await transaction.get(
              counterRef
            );

          let nextNumber = 1;

          if (counterSnap.exists) {
            const current =
              Number(
                counterSnap.data()?.books || 0
              );

            nextNumber =
              current + 1;
          }

          const newBookId =
            "BOOK" +
            String(nextNumber)
              .padStart(3, "0");

          transaction.set(
            counterRef,
            {
              books: nextNumber,
              updatedAt:
                FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          const bookRef =
            adminDb
              .collection("books")
              .doc(newBookId);

          transaction.set(
            bookRef,
            {
              bookId: newBookId,
              bookName,
              courseAccess,
              active:
                body.active !== false,
              createdAt:
                FieldValue.serverTimestamp(),
              updatedAt:
                FieldValue.serverTimestamp(),
            }
          );

          return newBookId;
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Book created successfully.",
        book: {
          BookID: bookId,
          BookName: bookName,
          CourseAccess: courseAccess,
          Active:
            body.active !== false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Books POST API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create book.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   UPDATE BOOK
   ===================================================== */

export async function PUT(
  request: NextRequest
) {
  try {
    const auth = await verifyAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const bookId = String(
      body.bookId || ""
    ).trim();

    const bookName = String(
      body.bookName || ""
    ).trim();

    const courseAccess =
      normalizeCourseAccess(
        body.courseAccess
      );

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "BookID is required.",
        },
        { status: 400 }
      );
    }

    if (!bookName) {
      return NextResponse.json(
        {
          success: false,
          error: "Book name is required.",
        },
        { status: 400 }
      );
    }

    if (courseAccess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select at least one course.",
        },
        { status: 400 }
      );
    }

    const bookRef = adminDb
      .collection("books")
      .doc(bookId);

    const existing =
      await bookRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Book not found.",
        },
        { status: 404 }
      );
    }

    await bookRef.update({
      bookName,
      courseAccess,
      active:
        body.active !== false,
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Book updated successfully.",
      book: {
        BookID: bookId,
        BookName: bookName,
        CourseAccess: courseAccess,
        Active:
          body.active !== false,
      },
    });
  } catch (error) {
    console.error(
      "Books PUT API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update book.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   DELETE BOOK
   ===================================================== */

export async function DELETE(
  request: NextRequest
) {
  try {
    const auth = await verifyAdmin(request);

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const bookId = String(
      body.bookId || ""
    ).trim();

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error: "BookID is required.",
        },
        { status: 400 }
      );
    }

    const bookRef = adminDb
      .collection("books")
      .doc(bookId);

    const existing =
      await bookRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Book not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Soft delete.
     *
     * We intentionally do not physically remove
     * the document because chapters and questions
     * may reference this BookID.
     */

    await bookRef.update({
      active: false,
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Book deactivated successfully.",
      bookId,
    });
  } catch (error) {
    console.error(
      "Books DELETE API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete book.",
      },
      { status: 500 }
    );
  }
}
