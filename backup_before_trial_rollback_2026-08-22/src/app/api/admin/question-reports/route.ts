import { NextRequest, NextResponse } from "next/server";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  FieldValue,
} from "firebase-admin/firestore";

function cleanText(
  value: unknown
): string {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
      error: "Authentication required.",
    };
  }

  const token =
    authorization
      .substring(7)
      .trim();

  if (!token) {
    return {
      ok: false,
      error: "Authentication token missing.",
    };
  }

  try {
    const decoded =
      await adminAuth.verifyIdToken(
        token
      );

    if (
      decoded.admin === true ||
      decoded.role === "admin"
    ) {
      return {
        ok: true,
        uid: decoded.uid,
      };
    }

    const userSnapshot =
      await adminDb
        .collection("users")
        .doc(decoded.uid)
        .get();

    if (!userSnapshot.exists) {
      return {
        ok: false,
        error:
          "Administrator profile not found.",
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
      uid: decoded.uid,
    };

  } catch (error) {
    console.error(
      "Admin authentication error:",
      error
    );

    return {
      ok: false,
      error: "Invalid authentication token.",
    };
  }
}


// =====================================================
// GET REPORTS
// =====================================================

export async function GET(
  request: NextRequest
) {
  try {

    const admin =
      await verifyAdmin(request);

    if (!admin.ok) {
      return NextResponse.json(
        {
          success: false,
          error: admin.error,
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } =
      new URL(
        request.url
      );

    const status =
      cleanText(
        searchParams.get("status")
      ) || "pending";

    const snapshot =
      await adminDb
        .collection(
          "questionReports"
        )
        .orderBy(
          "createdAt",
          "desc"
        )
        .get();

    const reports =
      snapshot.docs
        .map((item) => {

          const data:
            Record<string, any> =
            item.data();

          return {
            id: item.id,

            ...data,

            createdAt:
              data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : null,

            updatedAt:
              data.updatedAt?.toDate
                ? data.updatedAt.toDate().toISOString()
                : null,

            resolvedAt:
              data.resolvedAt?.toDate
                ? data.resolvedAt.toDate().toISOString()
                : null,
          };
        })
        .filter(
          (report: Record<string, any>) =>
            report.status === status
        );

    return NextResponse.json({
      success: true,
      reports,
    });

  } catch (error: any) {

    console.error(
      "Admin question reports GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to load question reports.",
      },
      {
        status: 500,
      }
    );
  }
}


// =====================================================
// UPDATE REPORT
// =====================================================

export async function PATCH(
  request: NextRequest
) {
  try {

    const admin =
      await verifyAdmin(request);

    if (!admin.ok) {
      return NextResponse.json(
        {
          success: false,
          error: admin.error,
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const reportId =
      cleanText(
        body.reportId
      );

    const status =
      cleanText(
        body.status
      );

    const adminNote =
      cleanText(
        body.adminNote
      );

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Report ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStatuses = [
      "pending",
      "reviewed",
      "resolved",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid report status.",
        },
        {
          status: 400,
        }
      );
    }

    const reportRef =
      adminDb
        .collection(
          "questionReports"
        )
        .doc(reportId);

    const reportSnapshot =
      await reportRef.get();

    if (
      !reportSnapshot.exists
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Question report not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {
      status,

      adminNote,

      reviewedBy:
        admin.uid,

      updatedAt:
        FieldValue.serverTimestamp(),
    };

    if (
      status === "resolved"
    ) {
      updateData.resolvedBy =
        admin.uid;

      updateData.resolvedAt =
        FieldValue.serverTimestamp();
    }

    await reportRef.update(
      updateData
    );

    return NextResponse.json({
      success: true,
      message:
        "Question report updated successfully.",
    });

  } catch (error: any) {

    console.error(
      "Admin question reports PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to update question report.",
      },
      {
        status: 500,
      }
    );
  }
}

