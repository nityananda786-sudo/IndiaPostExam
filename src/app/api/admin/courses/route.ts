import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  const token = authorization.substring("Bearer ".length).trim();

  if (!token) {
    throw new Error("Unauthorized.");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  const userSnap = await adminDb
    .collection("users")
    .doc(decoded.uid)
    .get();

  if (!userSnap.exists) {
    throw new Error("User profile not found.");
  }

  const userData = userSnap.data() || {};

  const isAdmin = userData.role === "admin";

  if (!isAdmin) {
    throw new Error("Admin access required.");
  }

  return decoded;
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }

    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  return fallback;
}

function cleanCourseData(data: FirebaseFirestore.DocumentData, id: string) {
  return {
    id: id,
    CourseID: id,
    CourseName: String(data.courseName ?? data.CourseName ?? "").trim(),
    Active: normalizeBoolean(
      data.active ?? data.Active,
      true
    ),
    Published: normalizeBoolean(
      data.published ?? data.Published,
      false
    ),
    EnrollmentOpen: normalizeBoolean(
      data.enrollmentOpen ?? data.EnrollmentOpen,
      false
    ),
    fee:
      typeof data.fee === "number"
        ? data.fee
        : Number(data.fee ?? 0),
  };
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const snapshot = await adminDb
      .collection("courses")
      .orderBy("courseName")
      .get();

    const courses = snapshot.docs.map((doc) =>
      cleanCourseData(doc.data(), doc.id)
    );

    return NextResponse.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("GET /api/admin/courses error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load courses.";

    const status =
      message === "Unauthorized." ||
      message === "Admin access required."
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

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const body = await request.json();

    const action = String(body.action || "create").trim().toLowerCase();

    if (action === "create") {
      const courseName = String(
        body.courseName ?? body.CourseName ?? ""
      ).trim();

      const courseId = String(
        body.courseId ?? body.CourseID ?? ""
      ).trim();

      if (!courseName) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseName is required.",
          },
          { status: 400 }
        );
      }

      if (!courseId) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID is required.",
          },
          { status: 400 }
        );
      }

      const ref = adminDb.collection("courses").doc(courseId);

      const existing = await ref.get();

      if (existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID already exists.",
          },
          { status: 409 }
        );
      }

      const active = normalizeBoolean(
        body.active ?? body.Active,
        true
      );

      const published = normalizeBoolean(
        body.published ?? body.Published,
        false
      );

      const enrollmentOpen = normalizeBoolean(
        body.enrollmentOpen ?? body.EnrollmentOpen,
        false
      );

      await ref.set({
        courseId,
        courseName,
        active,
        published,
        enrollmentOpen,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Course created successfully.",
        course: {
          CourseID: courseId,
          CourseName: courseName,
          Active: active,
        },
      });
    }

    if (action === "update") {
      const courseId = String(
        body.courseId ?? body.CourseID ?? ""
      ).trim();

      const courseName = String(
        body.courseName ?? body.CourseName ?? ""
      ).trim();

      if (!courseId) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID is required.",
          },
          { status: 400 }
        );
      }

      if (!courseName) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseName is required.",
          },
          { status: 400 }
        );
      }

      const ref = adminDb.collection("courses").doc(courseId);

      const existing = await ref.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "Course not found.",
          },
          { status: 404 }
        );
      }

      const active = normalizeBoolean(
        body.active ?? body.Active,
        true
      );

      const published = normalizeBoolean(
        body.published ?? body.Published,
        false
      );

      const enrollmentOpen = normalizeBoolean(
        body.enrollmentOpen ?? body.EnrollmentOpen,
        false
      );

      await ref.update({
        courseName,
        active,
        published,
        enrollmentOpen,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Course updated successfully.",
        course: {
          CourseID: courseId,
          CourseName: courseName,
          Active: active,
          Published: published,
          EnrollmentOpen: enrollmentOpen,
        },
      });
    }


    if (action === "updatecontrols") {
      const courseId = String(
        body.courseId ?? body.CourseID ?? ""
      ).trim();

      if (!courseId) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID is required.",
          },
          { status: 400 }
        );
      }

      const ref = adminDb.collection("courses").doc(courseId);
      const existing = await ref.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "Course not found.",
          },
          { status: 404 }
        );
      }

      const published = normalizeBoolean(
        body.published ?? body.Published,
        false
      );

      const enrollmentOpen = normalizeBoolean(
        body.enrollmentOpen ?? body.EnrollmentOpen,
        false
      );

      const rawFee = body.fee ?? body.Fee;

      const fee =
        typeof rawFee === "number"
          ? rawFee
          : Number(String(rawFee ?? "").trim());

      if (
        !Number.isFinite(fee) ||
        fee <= 0 ||
        fee > 1000000
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Course fee must be a valid amount greater than ₹0.",
          },
          { status: 400 }
        );
      }

      const normalizedFee = Math.round(fee);

      await ref.update({
        published,
        enrollmentOpen,
        fee: normalizedFee,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Course controls and fee updated successfully.",
        courseId,
        published,
        enrollmentOpen,
        fee: normalizedFee,
      });
    }
    if (action === "setpublished") {
      const courseId = String(
        body.courseId ?? body.CourseID ?? ""
      ).trim();

      if (!courseId) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID is required.",
          },
          { status: 400 }
        );
      }

      const ref = adminDb.collection("courses").doc(courseId);
      const existing = await ref.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "Course not found.",
          },
          { status: 404 }
        );
      }

      const published = normalizeBoolean(
        body.published ?? body.Published,
        false
      );

      const enrollmentOpen = published
        ? normalizeBoolean(
            (existing.data() || {}).enrollmentOpen ??
            (existing.data() || {}).EnrollmentOpen,
            false
          )
        : false;

      await ref.update({
        published,
        enrollmentOpen,
        updatedAt: new Date(),
      });
      return NextResponse.json({
        success: true,
        message: "Course publication status updated.",
        courseId,
        enrollmentOpen,
        published,
      });
    }

    if (action === "setenrollmentopen") {
      const courseId = String(
        body.courseId ?? body.CourseID ?? ""
      ).trim();

      if (!courseId) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID is required.",
          },
          { status: 400 }
        );
      }

      const ref = adminDb.collection("courses").doc(courseId);
      const existing = await ref.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "Course not found.",
          },
          { status: 404 }
        );
      }

      const enrollmentOpen = normalizeBoolean(
        body.enrollmentOpen ?? body.EnrollmentOpen,
        false
      );

      if (enrollmentOpen) {
        const courseData = existing.data() || {};
        const published = normalizeBoolean(
          courseData.published ?? courseData.Published,
          false
        );

        if (!published) {
          return NextResponse.json(
            {
              success: false,
              error: "Course must be published before enrollment can be opened.",
            },
            { status: 400 }
          );
        }
      }

      await ref.update({
        enrollmentOpen,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Course enrollment status updated.",
        courseId,
        enrollmentOpen,
      });
    }

    if (action === "delete") {
      const courseId = String(
        body.courseId ?? body.CourseID ?? ""
      ).trim();

      if (!courseId) {
        return NextResponse.json(
          {
            success: false,
            error: "CourseID is required.",
          },
          { status: 400 }
        );
      }

      const ref = adminDb.collection("courses").doc(courseId);

      const existing = await ref.get();

      if (!existing.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "Course not found.",
          },
          { status: 404 }
        );
      }

      /*
       * Soft delete is intentional.
       * Existing books, chapters and questions may reference
       * this course, so we do not physically delete the course.
       */
      await ref.update({
        active: false,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Course deactivated successfully.",
        courseId,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unsupported action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/admin/courses error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to process course.";

    const status =
      message === "Unauthorized." ||
      message === "Admin access required."
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






