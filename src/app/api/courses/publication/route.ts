import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COURSE_MAP: Record<string, string> = {
  "GDS-MTS": "gds-mts",
  "POSTMAN": "gds-postman",
  "PA": "postal-assistant",
  "INSPECTOR": "inspector-posts",
  "PSS-GROUP-B": "pss-group-b",
};

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("courses")
      .get();

    const publication: Record<
      string,
      {
        published: boolean;
        enrollmentOpen: boolean;
      }
    > = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      const adminCourseId = doc.id;
      const publicCourseId =
        COURSE_MAP[adminCourseId];

      if (!publicCourseId) {
        return;
      }

      publication[publicCourseId] = {
        published:
          data.published ??
          data.Published ??
          false,

        enrollmentOpen:
          data.enrollmentOpen ??
          data.EnrollmentOpen ??
          false,
      };
    });

    return NextResponse.json({
      success: true,
      publication,
    });
  } catch (error) {
    console.error(
      "GET /api/courses/publication error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load course publication status.",
      },
      { status: 500 }
    );
  }
}
