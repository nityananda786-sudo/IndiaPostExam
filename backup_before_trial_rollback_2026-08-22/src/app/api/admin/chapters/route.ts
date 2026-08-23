import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

function normalizeCourseAccess(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeBoolean(
  value: unknown,
  fallback = true
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no"
    ) {
      return false;
    }
  }

  return fallback;
}

/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

async function verifyAdmin(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  const token =
    authorization.substring(7).trim();

  if (!token) {
    throw new Error("Unauthorized.");
  }

  const decoded =
    await adminAuth.verifyIdToken(token);

  const userSnap =
    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

  if (!userSnap.exists) {
    throw new Error(
      "User profile not found."
    );
  }

  const userData =
    userSnap.data() || {};

  const isAdmin =
    userData.role === "admin" ||
    userData.isAdmin === true;

  if (!isAdmin) {
    throw new Error(
      "Admin access required."
    );
  }

  return decoded;
}

/* =========================================================
   CLEAN CHAPTER
   ========================================================= */

function cleanChapter(
  data: FirebaseFirestore.DocumentData,
  id: string
) {
  return {
    ChapterID: id,

    BookID: String(
      data.bookId ??
      data.BookID ??
      ""
    ).trim(),

    ChapterName: String(
      data.chapterName ??
      data.ChapterName ??
      ""
    ).trim(),

    CourseAccess:
      normalizeCourseAccess(
        data.courseAccess ??
        data.CourseAccess
      ),

    Active: normalizeBoolean(
      data.active ??
      data.Active,
      true
    ),
  };
}

/* =========================================================
   GET CHAPTERS
   ========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    await verifyAdmin(request);

    const bookId =
      request.nextUrl.searchParams
        .get("bookId")
        ?.trim();

    let query:
      FirebaseFirestore.Query =
      adminDb
        .collection("chapters");

    /*
     * IMPORTANT:
     * If bookId is supplied, only chapters belonging
     * to that book are read from Firestore.
     *
     * We sort in JavaScript instead of using
     * where + orderBy so that a composite Firestore
     * index is not required.
     */
    if (bookId) {
      query = query.where(
        "bookId",
        "==",
        bookId
      );
    }

    const snapshot =
      await query.get();

    const chapters =
      snapshot.docs
        .map((doc) =>
          cleanChapter(
            doc.data(),
            doc.id
          )
        )
        .sort((a, b) =>
          a.ChapterName.localeCompare(
            b.ChapterName,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
        );

    return NextResponse.json({
      success: true,
      count: chapters.length,
      chapters,
    });

  } catch (error) {
    console.error(
      "GET /api/admin/chapters error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load chapters.";

    const status =
      message === "Unauthorized." ||
      message ===
        "Admin access required." ||
      message ===
        "User profile not found."
        ? 401
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/* =========================================================
   CREATE CHAPTER
   ========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    await verifyAdmin(request);

    const body =
      await request.json();

    const action =
      String(
        body.action ??
        "create"
      )
        .trim()
        .toLowerCase();

    /* -------------------------------------------------------
       CREATE
       ------------------------------------------------------- */

    if (action === "create") {

      const bookId =
        String(
          body.bookId ??
          body.BookID ??
          ""
        ).trim();

      const chapterName =
        String(
          body.chapterName ??
          body.ChapterName ??
          ""
        ).trim();

      const courseAccess =
        normalizeCourseAccess(
          body.courseAccess ??
          body.CourseAccess
        );

      const active =
        normalizeBoolean(
          body.active ??
          body.Active,
          true
        );

      if (!bookId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "BookID is required.",
          },
          { status: 400 }
        );
      }

      if (!chapterName) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ChapterName is required.",
          },
          { status: 400 }
        );
      }

      if (courseAccess.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "At least one course must be selected.",
          },
          { status: 400 }
        );
      }

      /* Verify Book */

      const bookRef =
        adminDb
          .collection("books")
          .doc(bookId);

      const bookSnap =
        await bookRef.get();

      if (!bookSnap.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "Book not found.",
          },
          { status: 404 }
        );
      }

      /*
       * Generate safe CHxxx ID.
       *
       * The transaction checks the actual document,
       * so existing CH001/CH002/CH003 cannot be
       * accidentally overwritten.
       */

      const counterRef =
        adminDb
          .collection("counters")
          .doc("chapters");

      const chapterId =
        await adminDb.runTransaction(
          async (transaction) => {

            const counterSnap =
              await transaction.get(
                counterRef
              );

            let nextNumber =
              counterSnap.exists
                ? Number(
                    counterSnap.data()
                      ?.lastNumber ?? 0
                  )
                : 0;

            let candidateRef;
            let candidateSnap;

            while (true) {
              nextNumber++;

              const candidateId =
                "CH" +
                String(nextNumber)
                  .padStart(3, "0");

              candidateRef =
                adminDb
                  .collection("chapters")
                  .doc(candidateId);

              candidateSnap =
                await transaction.get(
                  candidateRef
                );

              if (!candidateSnap.exists) {
                break;
              }
            }

            transaction.set(
              counterRef,
              {
                lastNumber: nextNumber,
                updatedAt:
                  new Date(),
              },
              {
                merge: true,
              }
            );

            return (
              "CH" +
              String(nextNumber)
                .padStart(3, "0")
            );
          }
        );

      const chapterRef =
        adminDb
          .collection("chapters")
          .doc(chapterId);

      await chapterRef.set({
        chapterId,
        bookId,
        chapterName,
        courseAccess,
        active,
        createdAt:
          new Date(),
        updatedAt:
          new Date(),
      });

      return NextResponse.json({
        success: true,
        message:
          "Chapter created successfully.",

        chapter: {
          ChapterID:
            chapterId,

          BookID:
            bookId,

          ChapterName:
            chapterName,

          CourseAccess:
            courseAccess,

          Active:
            active,
        },
      });
    }

    /* -------------------------------------------------------
       UPDATE
       ------------------------------------------------------- */

    if (
      action === "update"
    ) {

      const chapterId =
        String(
          body.chapterId ??
          body.ChapterID ??
          ""
        ).trim();

      const bookId =
        String(
          body.bookId ??
          body.BookID ??
          ""
        ).trim();

      const chapterName =
        String(
          body.chapterName ??
          body.ChapterName ??
          ""
        ).trim();

      const courseAccess =
        normalizeCourseAccess(
          body.courseAccess ??
          body.CourseAccess
        );

      const active =
        normalizeBoolean(
          body.active ??
          body.Active,
          true
        );

      if (!chapterId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ChapterID is required.",
          },
          { status: 400 }
        );
      }

      if (!bookId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "BookID is required.",
          },
          { status: 400 }
        );
      }

      if (!chapterName) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ChapterName is required.",
          },
          { status: 400 }
        );
      }

      if (courseAccess.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "At least one course must be selected.",
          },
          { status: 400 }
        );
      }

      const chapterRef =
        adminDb
          .collection("chapters")
          .doc(chapterId);

      const existing =
        await chapterRef.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Chapter not found.",
          },
          { status: 404 }
        );
      }

      const bookSnap =
        await adminDb
          .collection("books")
          .doc(bookId)
          .get();

      if (!bookSnap.exists) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Book not found.",
          },
          { status: 404 }
        );
      }

      await chapterRef.update({
        bookId,
        chapterName,
        courseAccess,
        active,
        updatedAt:
          new Date(),
      });

      return NextResponse.json({
        success: true,
        message:
          "Chapter updated successfully.",

        chapter: {
          ChapterID:
            chapterId,

          BookID:
            bookId,

          ChapterName:
            chapterName,

          CourseAccess:
            courseAccess,

          Active:
            active,
        },
      });
    }

    /* -------------------------------------------------------
       DELETE / DEACTIVATE
       ------------------------------------------------------- */

    if (
      action === "delete"
    ) {

      const chapterId =
        String(
          body.chapterId ??
          body.ChapterID ??
          ""
        ).trim();

      if (!chapterId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ChapterID is required.",
          },
          { status: 400 }
        );
      }

      const chapterRef =
        adminDb
          .collection("chapters")
          .doc(chapterId);

      const existing =
        await chapterRef.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Chapter not found.",
          },
          { status: 404 }
        );
      }

      /*
       * Soft delete.
       *
       * We intentionally do NOT physically delete
       * the document because questions may reference
       * this ChapterID.
       */

      await chapterRef.update({
        active: false,
        updatedAt:
          new Date(),
      });

      return NextResponse.json({
        success: true,
        message:
          "Chapter deactivated successfully.",
        chapterId,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Unsupported action.",
      },
      { status: 400 }
    );

  } catch (error) {
    console.error(
      "POST /api/admin/chapters error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to process chapter.";

    const status =
      message === "Unauthorized." ||
      message ===
        "Admin access required." ||
      message ===
        "User profile not found."
        ? 401
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

/* =========================================================
   PUT
   Compatibility endpoint
   ========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    await verifyAdmin(request);

    const body =
      await request.json();

    const chapterId =
      String(
        body.chapterId ??
        body.ChapterID ??
        ""
      ).trim();

    const bookId =
      String(
        body.bookId ??
        body.BookID ??
        ""
      ).trim();

    const chapterName =
      String(
        body.chapterName ??
        body.ChapterName ??
        ""
      ).trim();

    const courseAccess =
      normalizeCourseAccess(
        body.courseAccess ??
        body.CourseAccess
      );

    const active =
      normalizeBoolean(
        body.active ??
        body.Active,
        true
      );

    if (!chapterId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ChapterID is required.",
        },
        { status: 400 }
      );
    }

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "BookID is required.",
        },
        { status: 400 }
      );
    }

    if (!chapterName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ChapterName is required.",
        },
        { status: 400 }
      );
    }

    if (courseAccess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "At least one course must be selected.",
        },
        { status: 400 }
      );
    }

    const chapterRef =
      adminDb
        .collection("chapters")
        .doc(chapterId);

    const existing =
      await chapterRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chapter not found.",
        },
        { status: 404 }
      );
    }

    const bookSnap =
      await adminDb
        .collection("books")
        .doc(bookId)
        .get();

    if (!bookSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Book not found.",
        },
        { status: 404 }
      );
    }

    await chapterRef.update({
      bookId,
      chapterName,
      courseAccess,
      active,
      updatedAt:
        new Date(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Chapter updated successfully.",

      chapter: {
        ChapterID:
          chapterId,

        BookID:
          bookId,

        ChapterName:
          chapterName,

        CourseAccess:
          courseAccess,

        Active:
          active,
      },
    });

  } catch (error) {
    console.error(
      "PUT /api/admin/chapters error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update chapter.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE HTTP METHOD
   ========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    await verifyAdmin(request);

    const body =
      await request.json();

    const chapterId =
      String(
        body.chapterId ??
        body.ChapterID ??
        ""
      ).trim();

    if (!chapterId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ChapterID is required.",
        },
        { status: 400 }
      );
    }

    const chapterRef =
      adminDb
        .collection("chapters")
        .doc(chapterId);

    const existing =
      await chapterRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chapter not found.",
        },
        { status: 404 }
      );
    }

    await chapterRef.update({
      active: false,
      updatedAt:
        new Date(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Chapter deactivated successfully.",
      chapterId,
    });

  } catch (error) {
    console.error(
      "DELETE /api/admin/chapters error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete chapter.",
      },
      { status: 500 }
    );
  }
}
