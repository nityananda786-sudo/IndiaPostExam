import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, error: "Authentication required." };
  }

  const idToken = authorization.substring(7).trim();

  if (!idToken) {
    return { ok: false, error: "Authentication token missing." };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (
      decodedToken.admin === true ||
      decodedToken.role === "admin"
    ) {
      return { ok: true, uid: decodedToken.uid };
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
    console.error(
      "Course authentication error:",
      error
    );

    return {
      ok: false,
      error:
        "Invalid, expired, or unauthorized authentication token.",
    };
  }
}

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

    const scriptUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!scriptUrl) {
      throw new Error(
        "GOOGLE_APPS_SCRIPT_URL is not configured."
      );
    }

    const response = await fetch(
      `${scriptUrl}?action=courses`,
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

    const data = await response.json();

    if (!data?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Unable to load courses.",
        },
        { status: 502 }
      );
    }

    const courses =
      Array.isArray(data.courses)
        ? data.courses
            .map(
              (
                course: Record<string, unknown>
              ) => ({
                CourseID:
                  String(
                    course.CourseID || ""
                  ).trim(),

                CourseName:
                  String(
                    course.CourseName || ""
                  ).trim(),

                Active:
                  String(
                    course.Active ?? ""
                  )
                    .trim()
                    .toLowerCase() === "true",
              })
            )
            .filter(
              (
                course: {
                  CourseID: string;
                  CourseName: string;
                  Active: boolean;
                }
              ) =>
                course.CourseID &&
                course.CourseName
            )
        : [];

    return NextResponse.json({
      success: true,
      count: courses.length,
      courses,
    });

  } catch (error) {
    console.error(
      "Courses API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load courses.",
      },
      { status: 500 }
    );
  }
}
