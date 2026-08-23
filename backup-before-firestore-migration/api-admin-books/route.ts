import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type RequestBody = {
  bookId?: string;
  bookName?: string;
  active?: boolean;
  courseAccess?: string[];
};

async function verifyAdmin(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false,
      error: "Authentication required.",
    };
  }

  const idToken =
    authorization.substring(7).trim();

  if (!idToken) {
    return {
      ok: false,
      error: "Authentication token missing.",
    };
  }

  try {
    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

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
        error: "Admin user profile not found.",
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
      "Admin authentication error:",
      error
    );

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}

function getScriptUrl() {
  const url =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!url) {
    throw new Error(
      "GOOGLE_APPS_SCRIPT_URL is not configured."
    );
  }

  return url;
}

function normalizeCourseAccess(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((id) =>
      String(id).trim()
    )
    .filter(Boolean);
}

async function callGoogleScript(
  action: string,
  body?: Record<string, unknown>
) {
  const scriptUrl =
    getScriptUrl();

  if (action === "books") {
    const response =
      await fetch(
        `${scriptUrl}?action=books`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Google Apps Script returned HTTP ${response.status}.`
      );
    }

    return await response.json();
  }

  const response =
    await fetch(
      scriptUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...body,
          action,
        }),

        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Google Apps Script returned HTTP ${response.status}.`
    );
  }

  return await response.json();
}


/* =====================================================
   GET BOOKS
   ===================================================== */

export async function GET(
  request: NextRequest
) {
  try {
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

    const data =
      await callGoogleScript(
        "books"
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to load books.",
        },
        {
          status: 502,
        }
      );
    }

    const books =
      Array.isArray(data.books)
        ? data.books.map(
            (book: Record<string, unknown>) => ({
              BookID:
                String(
                  book.BookID || ""
                ).trim(),

              BookName:
                String(
                  book.BookName || ""
                ).trim(),

              CourseAccess:
                normalizeCourseAccess(
                  typeof book.CourseAccess ===
                    "string"
                    ? String(
                        book.CourseAccess
                      )
                        .split(",")
                        .map((x) =>
                          x.trim()
                        )
                    : book.CourseAccess
                ),

              Active:
                String(
                  book.Active ?? ""
                )
                  .trim()
                  .toLowerCase() ===
                "true",

              _rowNumber:
                book._rowNumber,
            })
          )
        : [];

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
      {
        status: 500,
      }
    );
  }
}


/* =====================================================
   CREATE BOOK
   ===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
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

    const body =
      (await request.json()) as RequestBody;

    const bookName =
      String(
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
          error:
            "Book name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (courseAccess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select at least one course.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await callGoogleScript(
        "createBook",
        {
          bookName,

          courseAccess,

          active:
            body.active !== false,
        }
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to create book.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(
      data,
      {
        status: 201,
      }
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
      {
        status: 500,
      }
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

    const body =
      (await request.json()) as RequestBody;

    const bookId =
      String(
        body.bookId || ""
      ).trim();

    const bookName =
      String(
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
          error:
            "BookID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!bookName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Book name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (courseAccess.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please select at least one course.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await callGoogleScript(
        "updateBook",
        {
          bookId,

          bookName,

          courseAccess,

          active:
            body.active !== false,
        }
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to update book.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(
      data
    );

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
      {
        status: 500,
      }
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

    const body =
      (await request.json()) as RequestBody;

    const bookId =
      String(
        body.bookId || ""
      ).trim();

    if (!bookId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "BookID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await callGoogleScript(
        "deleteBook",
        {
          bookId,
        }
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to delete book.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(
      data
    );

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
      {
        status: 500,
      }
    );
  }
}
