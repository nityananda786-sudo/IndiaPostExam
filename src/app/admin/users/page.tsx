"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";

type AdminUser = {
  uid: string;
  email: string;
  role: string;
  subscription: string;
  active: boolean;
  createdAt: string | null;
};

type Subscriber = {
  name: string;
  email: string;
};

type SubscriberReport = {
  courseId: string;
  courseName: string;
  previousMonth: number;
  currentMonth: number;
  previousSubscribers: Subscriber[];
  currentSubscribers: Subscriber[];
};

function monthName(
  year: number,
  month: number
): string {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        1
      )
    )
  );
}

export default function UserManagementPage() {
  const [users, setUsers] =
    useState<AdminUser[]>([]);

  const [reports, setReports] =
    useState<SubscriberReport[]>([]);

  const [currentMonthLabel, setCurrentMonthLabel] =
    useState("Current Month");

  const [previousMonthLabel, setPreviousMonthLabel] =
    useState("Previous Month");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [reportLoading, setReportLoading] =
    useState(true);

  const [savingUid, setSavingUid] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [reportError, setReportError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [selectedSubscribers, setSelectedSubscribers] =
    useState<{
      courseName: string;
      monthLabel: string;
      subscribers: Subscriber[];
    } | null>(null);

  async function getToken() {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        "Administrator authentication required."
      );
    }

    return user.getIdToken();
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const token =
        await getToken();

      const response =
        await fetch(
          "/api/admin/users",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to load users."
        );
      }

      setUsers(
        Array.isArray(data.users)
          ? data.users
          : []
      );
    } catch (err: any) {
      console.error(
        "User loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadReports() {
    try {
      setReportLoading(true);
      setReportError("");

      const token =
        await getToken();

      const response =
        await fetch(
          "/api/admin/reports/subscribers",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to load subscriber report."
        );
      }

      setReports(
        Array.isArray(data.courses)
          ? data.courses
          : []
      );

      if (data.currentMonth) {
        setCurrentMonthLabel(
          monthName(
            data.currentMonth.year,
            data.currentMonth.month
          )
        );
      }

      if (data.previousMonth) {
        setPreviousMonthLabel(
          monthName(
            data.previousMonth.year,
            data.previousMonth.month
          )
        );
      }
    } catch (err: any) {
      console.error(
        "Subscriber report error:",
        err
      );

      setReportError(
        err?.message ||
          "Unable to load subscriber report."
      );
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            window.location.href =
              "/admin/login";
            return;
          }

          Promise.all([
            loadUsers(),
            loadReports(),
          ]);
        }
      );

    return () =>
      unsubscribe();
  }, []);

  async function changeStatus(
    uid: string,
    active: boolean
  ) {
    try {
      setSavingUid(uid);
      setError("");
      setMessage("");

      const token =
        await getToken();

      const response =
        await fetch(
          "/api/admin/users",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "setStatus",
              uid,
              active,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to update user status."
        );
      }

      setUsers(
        (current) =>
          current.map(
            (user) =>
              user.uid === uid
                ? {
                    ...user,
                    active,
                  }
                : user
          )
      );

      setMessage(
        active
          ? "User activated successfully."
          : "User deactivated successfully."
      );
    } catch (err: any) {
      console.error(
        "User status error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update user status."
      );
    } finally {
      setSavingUid(null);
    }
  }

  const filteredUsers =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return users;
      }

      return users.filter(
        (user) =>
          user.uid
            .toLowerCase()
            .includes(value) ||
          user.email
            .toLowerCase()
            .includes(value)
      );
    }, [users, search]);

  const activeUsers =
    users.filter(
      (user) => user.active
    ).length;

  const inactiveUsers =
    users.length -
    activeUsers;

  function showSubscribers(
    report: SubscriberReport,
    month: "previous" | "current"
  ) {
    const subscribers =
      month === "previous"
        ? report.previousSubscribers
        : report.currentSubscribers;

    const monthLabel =
      month === "previous"
        ? previousMonthLabel
        : currentMonthLabel;

    setSelectedSubscribers({
      courseName:
        report.courseName,
      monthLabel,
      subscribers,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="bg-[#123b78] text-white">
        <div className="mx-auto max-w-7xl px-6 py-7">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
                INDIAPOSTEXAM
              </p>

              <h1 className="mt-2 text-3xl font-extrabold">
                User Management & Reports
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                Manage aspirant accounts and view course-wise subscriber reports.
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-xl border border-white/30 bg-white px-5 py-3 text-center text-sm font-extrabold text-[#123b78] hover:bg-red-50"
            >
              ← Admin Dashboard
            </Link>

          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total Users
            </p>

            <p className="mt-2 text-3xl font-extrabold text-[#123b78]">
              {users.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">
              Active
            </p>

            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {activeUsers}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">
              Inactive
            </p>

            <p className="mt-2 text-3xl font-extrabold text-red-700">
              {inactiveUsers}
            </p>
          </div>

        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-extrabold text-[#123b78]">
                  User Management
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Activate or deactivate aspirant accounts.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search User ID or Email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-80"
              />

            </div>

          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px] text-left">

                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      User ID
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Email
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredUsers.map(
                    (user) => (
                      <tr
                        key={user.uid}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {user.uid}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {user.email || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                              user.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.active
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">

                          <button
                            type="button"
                            disabled={
                              savingUid ===
                              user.uid
                            }
                            onClick={() =>
                              changeStatus(
                                user.uid,
                                !user.active
                              )
                            }
                            className={`rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.active
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {savingUid ===
                            user.uid
                              ? "Saving..."
                              : user.active
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-5">

            <h2 className="text-xl font-extrabold text-[#123b78]">
              Subscriber Report
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Click any subscriber number to view the subscriber names and email addresses.
            </p>

          </div>

          {reportError && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {reportError}
            </div>
          )}

          {reportLoading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading subscriber report...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              No paid subscriptions found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[650px] text-left">

                <thead className="bg-slate-50">
                  <tr>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Course
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      {previousMonthLabel}
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      {currentMonthLabel}
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {reports.map(
                    (report) => (
                      <tr
                        key={report.courseId}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-4 text-sm font-bold text-slate-700">
                          {report.courseName}
                        </td>

                        <td className="px-5 py-4 text-center">

                          <button
                            type="button"
                            disabled={
                              report.previousMonth === 0
                            }
                            onClick={() =>
                              showSubscribers(
                                report,
                                "previous"
                              )
                            }
                            className={`min-w-12 rounded-lg px-3 py-2 text-lg font-extrabold transition ${
                              report.previousMonth > 0
                                ? "text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                : "cursor-default text-slate-400"
                            }`}
                          >
                            {report.previousMonth}
                          </button>

                        </td>

                        <td className="px-5 py-4 text-center">

                          <button
                            type="button"
                            disabled={
                              report.currentMonth === 0
                            }
                            onClick={() =>
                              showSubscribers(
                                report,
                                "current"
                              )
                            }
                            className={`min-w-12 rounded-lg px-3 py-2 text-lg font-extrabold transition ${
                              report.currentMonth > 0
                                ? "text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                : "cursor-default text-slate-400"
                            }`}
                          >
                            {report.currentMonth}
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </section>

      {selectedSubscribers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
          onClick={() =>
            setSelectedSubscribers(null)
          }
        >

          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">

              <div>
                <h2 className="text-xl font-extrabold text-[#123b78]">
                  {selectedSubscribers.courseName}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedSubscribers.monthLabel}
                  {" • "}
                  {selectedSubscribers.subscribers.length}
                  {" subscriber"}
                  {selectedSubscribers.subscribers.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSubscribers(null)
                }
                className="rounded-lg px-3 py-2 text-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <div className="max-h-[65vh] overflow-y-auto">

              {selectedSubscribers.subscribers.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                  No subscribers found.
                </div>
              ) : (
                <table className="w-full text-left">

                  <thead className="sticky top-0 bg-slate-50">
                    <tr>

                      <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Name
                      </th>

                      <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        Email
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {selectedSubscribers.subscribers.map(
                      (subscriber, index) => (
                        <tr
                          key={`${subscriber.email}-${index}`}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                            {subscriber.name}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {subscriber.email}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>
              )}

            </div>

            <div className="border-t border-slate-100 px-6 py-4 text-right">

              <button
                type="button"
                onClick={() =>
                  setSelectedSubscribers(null)
                }
                className="rounded-xl bg-[#123b78] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0e2f61]"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
