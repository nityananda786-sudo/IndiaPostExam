"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

type Report = {
  id: string;
  questionId?: string;
  questionText?: string;
  questionSnapshot?: {
    questionText?: string;
    options?: {
      id: string;
      text: string;
    }[];
    correctOptionId?: string;
    book?: string;
    chapter?: string;
  };
  reason?: string;
  comment?: string;
  selectedOptionId?: string;
  status?: string;
  context?: string;
  aspirantId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  adminNote?: string;
};

const reasonLabels: Record<string, string> = {
  question_incorrect:
    "Question is incorrect",
  answer_incorrect:
    "Correct answer appears incorrect",
  option_incorrect:
    "One or more options are incorrect",
  explanation_incorrect:
    "Explanation or reference is incorrect",
  ambiguous:
    "Question is ambiguous",
  other:
    "Other",
};

export default function QuestionReportsPage() {

  const [reports, setReports] =
    useState<Report[]>([]);

  const [status, setStatus] =
    useState<
      "pending" |
      "reviewed" |
      "resolved"
    >("pending");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [adminNotes, setAdminNotes] =
    useState<Record<string, string>>({});

  async function loadReports() {

    try {

      setLoading(true);
      setError("");

      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "Please login as administrator."
        );
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          `/api/admin/question-reports?status=${status}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
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
          "Unable to load question reports."
        );
      }

      setReports(
        Array.isArray(data.reports)
          ? data.reports
          : []
      );

    } catch (err: any) {

      console.error(
        "Question reports load error:",
        err
      );

      setError(
        err?.message ||
        "Unable to load question reports."
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [status]);

  const groupedReports =
    useMemo(() => {

      const groups =
        new Map<
          string,
          Report[]
        >();

      reports.forEach(
        (report) => {

          const key =
            report.questionId ||
            report.id;

          const existing =
            groups.get(key) ||
            [];

          existing.push(
            report
          );

          groups.set(
            key,
            existing
          );
        }
      );

      return Array.from(
        groups.entries()
      );

    }, [reports]);

  async function updateReport(
    reportId: string,
    newStatus: string
  ) {

    try {

      setUpdatingId(
        reportId
      );

      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "Please login again."
        );
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/question-reports",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                reportId,

                status:
                  newStatus,

                adminNote:
                  adminNotes[
                    reportId
                  ] || "",
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
          "Unable to update report."
        );
      }

      await loadReports();

    } catch (err: any) {

      console.error(
        "Question report update error:",
        err
      );

      setError(
        err?.message ||
        "Unable to update report."
      );

    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(
    value?: string | null
  ) {

    if (!value) {
      return "—";
    }

    try {
      return new Date(
        value
      ).toLocaleString();
    } catch {
      return "—";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-[#123f82] text-white">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <Link
            href="/admin/quiz"
            className="mb-5 inline-flex items-center text-sm font-semibold text-white/80 hover:text-white"
          >
            {"\u2190"} Back to Quiz Management
          </Link>

          <p className="text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Question Reports
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">
            Review aspirant feedback and correction
            suggestions submitted against questions.
          </p>

        </div>

      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3">

          {[
            ["pending", "Pending"],
            ["reviewed", "Reviewed"],
            ["resolved", "Resolved"],
          ].map(
            ([value, label]) => (

              <button
                key={value}
                type="button"
                onClick={() =>
                  setStatus(
                    value as
                      | "pending"
                      | "reviewed"
                      | "resolved"
                  )
                }
                className={`rounded-xl px-5 py-3 text-sm font-extrabold transition ${
                  status === value
                    ? "bg-[#123f82] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {label}
              </button>

            )
          )}

        </div>

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Loading question reports...
            </p>
          </div>

        ) : groupedReports.length === 0 ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">

            <h2 className="text-xl font-extrabold text-[#123f82]">
              No {status} reports
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              There are currently no question reports
              in this category.
            </p>

          </div>

        ) : (

          <div className="space-y-6">

            {groupedReports.map(
              ([questionId, questionReports]) => {

                const first =
                  questionReports[0];

                const snapshot =
                  first.questionSnapshot;

                const isExpanded =
                  expandedId ===
                  questionId;

                return (

                  <div
                    key={questionId}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >

                    <div className="p-6">

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                              {questionId}
                            </span>

                            <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
                              {questionReports.length}
                              {" "}
                              {questionReports.length === 1
                                ? "Report"
                                : "Reports"}
                            </span>

                          </div>

                          <h2 className="mt-4 text-lg font-extrabold text-[#123f82]">
                            {snapshot?.questionText ||
                              first.questionText ||
                              "Question text unavailable"}
                          </h2>

                          <div className="mt-3 flex flex-wrap gap-2">

                            {Array.from(
                              new Set(
                                questionReports.map(
                                  (report) =>
                                    reasonLabels[
                                      report.reason ||
                                      "other"
                                    ] ||
                                    "Other"
                                )
                              )
                            ).map(
                              (reason) => (
                                <span
                                  key={reason}
                                  className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                                >
                                  {reason}
                                </span>
                              )
                            )}

                          </div>

                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">

                          <Link
                            href={`/admin/quiz/questions/${encodeURIComponent(
                              questionId
                            )}/edit`}
                            className="rounded-xl bg-[#123f82] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#0d326a]"
                          >
                            Open Question & Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(
                                isExpanded
                                  ? null
                                  : questionId
                              )
                            }
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                          >
                            {isExpanded
                              ? "Hide Reports"
                              : "View Reports"}
                          </button>

                        </div>

                      </div>

                    </div>

                    {isExpanded && (

                      <div className="border-t border-slate-200 bg-slate-50 p-6">

                        <div className="space-y-4">

                          {questionReports.map(
                            (report) => (

                              <div
                                key={report.id}
                                className="rounded-xl border border-slate-200 bg-white p-5"
                              >

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                  <div>

                                    <p className="text-sm font-extrabold text-red-700">
                                      {reasonLabels[
                                        report.reason ||
                                        "other"
                                      ] ||
                                        "Other"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Submitted:
                                      {" "}
                                      {formatDate(
                                        report.createdAt
                                      )}
                                    </p>

                                  </div>

                                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                    {report.context ||
                                      "practice"}
                                  </span>

                                </div>

                                {report.comment && (
                                  <div className="mt-4 rounded-lg bg-slate-50 p-4">

                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                      Aspirant Comment
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                      {report.comment}
                                    </p>

                                  </div>
                                )}

                                {report.selectedOptionId && (
                                  <p className="mt-3 text-xs font-semibold text-slate-500">
                                    Selected option:
                                    {" "}
                                    {report.selectedOptionId}
                                  </p>
                                )}

                                <div className="mt-4">

                                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                                    Admin Note
                                  </label>

                                  <textarea
                                    value={
                                      adminNotes[
                                        report.id
                                      ] ??
                                      report.adminNote ??
                                      ""
                                    }
                                    onChange={(e) =>
                                      setAdminNotes(
                                        (current) => ({
                                          ...current,
                                          [report.id]:
                                            e.target.value,
                                        })
                                      )
                                    }
                                    rows={2}
                                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Optional note about your review..."
                                  />

                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">

                                  {status ===
                                    "pending" && (
                                    <button
                                      type="button"
                                      disabled={
                                        updatingId ===
                                        report.id
                                      }
                                      onClick={() =>
                                        updateReport(
                                          report.id,
                                          "reviewed"
                                        )
                                      }
                                      className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-700 disabled:opacity-50"
                                    >
                                      {updatingId ===
                                      report.id
                                        ? "Updating..."
                                        : "Mark Reviewed"}
                                    </button>
                                  )}

                                  {status !==
                                    "resolved" && (
                                    <button
                                      type="button"
                                      disabled={
                                        updatingId ===
                                        report.id
                                      }
                                      onClick={() =>
                                        updateReport(
                                          report.id,
                                          "resolved"
                                        )
                                      }
                                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      {updatingId ===
                                      report.id
                                        ? "Updating..."
                                        : "Resolve Report"}
                                    </button>
                                  )}

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

    </main>
  );
}
