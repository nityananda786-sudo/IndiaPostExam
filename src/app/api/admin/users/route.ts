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

  if (userData.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return decoded;
}

function cleanUser(
  data: FirebaseFirestore.DocumentData,
  uid: string
) {
  return {
    uid,
    email: String(data.email ?? "").trim(),
    role: String(data.role ?? "aspirant"),
    subscription: String(
      data.subscription ?? "free"
    ),
    active:
      typeof data.active === "boolean"
        ? data.active
        : true,
    createdAt:
      data.createdAt?.toDate?.()?.toISOString?.() ??
      null,
  };
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const snapshot = await adminDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();

    const users = snapshot.docs
      .map((doc) =>
        cleanUser(doc.data(), doc.id)
      )
      .filter(
        (user) =>
          user.role !== "admin"
      );

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/users error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load users.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser =
      await verifyAdmin(request);

    const body = await request.json();

    const action = String(
      body.action ?? ""
    )
      .trim()
      .toLowerCase();

    if (action !== "setstatus") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action.",
        },
        { status: 400 }
      );
    }

    const uid = String(
      body.uid ?? ""
    ).trim();

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    if (uid === adminUser.uid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot deactivate your own administrator account.",
        },
        { status: 400 }
      );
    }

    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Active status must be true or false.",
        },
        { status: 400 }
      );
    }

    const userRef = adminDb
      .collection("users")
      .doc(uid);

    const userSnap =
      await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const userData =
      userSnap.data() || {};

    if (userData.role === "admin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator accounts cannot be changed from User Management.",
        },
        { status: 403 }
      );
    }

    const active = body.active;

    // Disable / enable the Firebase Authentication account.
    await adminAuth.updateUser(uid, {
      disabled: !active,
    });

    // Keep the application profile synchronized.
    await userRef.update({
      active,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid,
      active,
      message: active
        ? "User activated successfully."
        : "User deactivated successfully.",
    });
  } catch (error) {
    console.error(
      "POST /api/admin/users error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update user status.",
      },
      { status: 500 }
    );
  }
}
