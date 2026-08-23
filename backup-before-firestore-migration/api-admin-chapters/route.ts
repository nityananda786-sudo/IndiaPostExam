import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
      "Chapter authentication error:",
      error
    );

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}

async function callAppsScript(
  action: string,
  body?: Record<string, unknown>
) {
  const scriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!scriptUrl) {
    throw new Error(
      "GOOGLE_APPS_SCRIPT_URL is not configured."
    );
  }

  if (body) {
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

  const response =
    await fetch(
      `${scriptUrl}?action=${encodeURIComponent(action)}`,
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

    const bookId =
      request.nextUrl.searchParams.get(
        "bookId"
      );

    const data =
      await callAppsScript(
        "chapters"
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to load chapters.",
        },
        {
          status: 502,
        }
      );
    }

    let chapters =
      Array.isArray(data.chapters)
        ? data.chapters
        : [];

    if (bookId) {
      chapters =
        chapters.filter(
          (
            chapter: Record<
              string,
              unknown
            >
          ) =>
            String(
              chapter.BookID || ""
            ).trim() ===
            bookId.trim()
        );
    }

    return NextResponse.json({
      success: true,
      count: chapters.length,
      chapters,
    });

  } catch (error) {
    console.error(
      "Chapters GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load chapters.",
      },
      {
        status: 500,
      }
    );
  }
}

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
      await request.json();

    const data =
      await callAppsScript(
        "createChapter",
        body
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to create chapter.",
        },
        {
          status: 400,
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
      "Chapters POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create chapter.",
      },
      {
        status: 500,
      }
    );
  }
}

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
      await request.json();

    const data =
      await callAppsScript(
        "updateChapter",
        body
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to update chapter.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      data
    );

  } catch (error) {
    console.error(
      "Chapters PUT error:",
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
      {
        status: 500,
      }
    );
  }
}

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
      await request.json();

    const data =
      await callAppsScript(
        "deleteChapter",
        body
      );

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to delete chapter.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      data
    );

  } catch (error) {
    console.error(
      "Chapters DELETE error:",
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
      {
        status: 500,
      }
    );
  }
}
