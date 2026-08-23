"use client";

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

type DuplicateGroup = {
  fingerprint: string;
  questionIds: string[];
  count: number;
};

type PreviewResult = {
  success: boolean;
  readOnly?: boolean;
  totalQuestions?: number;
  duplicateGroups?: DuplicateGroup[];
  error?: string;
};

export default function FingerprintMigrationPreviewPage() {
  const [result, setResult] =
    useState<PreviewResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [canonicalSelections, setCanonicalSelections] =
    useState<Record<string, string>>({});

  async function runMigration(
    group: DuplicateGroup
  ) {

    const confirmed =
      window.confirm(
        "This will permanently delete the duplicate question and keep the selected canonical question. No canonical question will be deleted.\n\nContinue?"
      );

    if (!confirmed) {
      return;
    }

    if (group.questionIds.length !== 2) {
      setError(
        "This migration currently expects exactly one canonical question and one duplicate question."
      );
      return;
    }

    const canonicalQuestionId =
      canonicalSelections[group.fingerprint] || "";

    if (!canonicalQuestionId) {
      setError(
        "Please select the canonical question for this duplicate group."
      );
      return;
    }

    const duplicateQuestionIds =
      group.questionIds.filter(
        (id) =>
          id !== canonicalQuestionId
      );

    if (duplicateQuestionIds.length === 0) {
      setError(
        "At least one duplicate question is required."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {

      const user =
        auth.currentUser;

      if (!user) {
        throw new Error(
          "You are not logged in. Please login again."
        );
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/questions/audit/migrate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                fingerprint:
                  group.fingerprint,

                canonicalQuestionId,

                duplicateQuestionIds,
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
          "Migration failed."
        );
      }

      alert(
        `Migration completed successfully.\n\nCanonical: ${canonicalQuestionId}\nDuplicate preserved and marked as superseded.\nFingerprint index created.`
      );

      await runPreview();

    } catch (err: any) {

      console.error(
        "Migration error:",
        err
      );

      setError(
        err?.message ||
        "Unable to migrate duplicate question."
      );

    } finally {
      setLoading(false);
    }
  }


  async function runPreview() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "You are not logged in. Please login again."
        );
      }

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/questions/audit/migrate",
          {
            method: "GET",
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
          "Unable to generate migration preview."
        );
      }

      setResult(data);

    } catch (err: any) {
      console.error(
        "Migration preview error:",
        err
      );

      setError(
        err?.message ||
        "Unable to generate migration preview."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-[#123f82] text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">

          <Link
            href="/admin/quiz/questions/audit"
            className="text-sm font-semibold text-white/80 hover:text-white"
          >
            ← Back to Question Audit
          </Link>

          <p className="mt-6 text-sm font-bold tracking-[0.25em] text-red-300">
            INDIAPOSTEXAM
          </p>

          <h1 className="mt-2 text-3xl font-extrabold">
            Fingerprint Migration Preview
          </h1>

          <p className="mt-3 max-w-3xl text-white/80">
            Preview existing Question Bank duplicates before
            creating the Firestore uniqueness indexes.
          </p>

        </div>
      </section>


      <section className="mx-auto max-w-6xl px-6 py-10">

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="font-extrabold text-amber-800">
            READ-ONLY PREVIEW
          </p>

          <p className="mt-2 text-sm text-amber-700">
            This page does not modify, delete, merge, or
            update any Firestore question.
          </p>

        </div>


        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}


        <div className="mt-6">

          <button
            type="button"
            onClick={runPreview}
            disabled={loading}
            className="rounded-xl bg-[#123f82] px-6 py-3 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Running Preview..."
              : "Run Migration Preview"}
          </button>

        </div>


        {result && (

          <div className="mt-8 space-y-6">

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Total Questions
                </p>

                <p className="mt-2 text-3xl font-extrabold text-[#123f82]">
                  {result.totalQuestions ?? 0}
                </p>
              </div>


              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Duplicate Groups
                </p>

                <p className="mt-2 text-3xl font-extrabold text-red-600">
                  {result.duplicateGroups?.length ?? 0}
                </p>
              </div>


              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Mode
                </p>

                <p className="mt-2 text-xl font-extrabold text-emerald-700">
                  READ ONLY
                </p>
              </div>

            </div>


            <section className="rounded-2xl border border-slate-200 bg-white p-6">

              <h2 className="text-xl font-extrabold text-[#123f82]">
                Duplicate Groups
              </h2>


              {!result.duplicateGroups?.length ? (

                <p className="mt-4 text-sm font-semibold text-emerald-700">
                  No duplicate groups detected.
                </p>

              ) : (

                <div className="mt-5 space-y-5">

                  {result.duplicateGroups.map(
                    (group, index) => (

                      <div
                        key={group.fingerprint}
                        className="rounded-xl border border-red-200 bg-red-50 p-5"
                      >

                        <h3 className="font-extrabold text-red-800">
                          Duplicate Group #{index + 1}
                        </h3>

                        <p className="mt-2 break-all font-mono text-xs text-slate-600">
                          Fingerprint:{" "}
                          {group.fingerprint}
                        </p>

                        <p className="mt-3 text-sm font-bold text-slate-700">
                          {group.count} question documents
                        </p>

                        <div className="mt-4 space-y-2">

                          {group.questionIds.map(
                            (questionId) => (

                              <div
                                key={questionId}
                                className="rounded-lg bg-white px-4 py-3 font-mono text-sm font-bold text-slate-700"
                              >
                                {questionId}
                              </div>

                            )
                          )}

                        </div>

                        {group.questionIds.length >= 2 && (
                          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

                            <p className="text-sm font-bold text-blue-800">
                              Proposed Migration
                            </p>

                            <p className="mt-1 text-xs text-blue-700">
                              Select the question that should remain canonical.
                              All other questions in this duplicate group will be
                              permanently deleted from the Question Bank.
                            </p>

                            <div className="mt-4 w-full">
                              {group.questionIds.map(
                                (questionId) => (
                                  <div
                                    key={questionId}
                                    className="mb-3 block w-full"
                                  >
                                    <label
                                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4"
                                    >
                                      <input
                                        type="radio"
                                        name={`canonical-${group.fingerprint}`}
                                        value={questionId}
                                        checked={
                                          canonicalSelections[group.fingerprint] ===
                                          questionId
                                        }
                                        onChange={() =>
                                          setCanonicalSelections(
                                            (current) => ({
                                              ...current,
                                              [group.fingerprint]:
                                                questionId,
                                            })
                                          )
                                        }
                                      />

                                      <span className="font-mono text-sm font-bold text-slate-700">
                                        Keep {questionId} as canonical
                                      </span>
                                    </label>
                                  </div>
                                )
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                runMigration(group)
                              }
                              disabled={
                                loading ||
                                !canonicalSelections[
                                  group.fingerprint
                                ]
                              }
                              className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {loading
                                ? "Migrating..."
                                : "Migrate This Duplicate Group"}
                            </button>

                          </div>
                        )}

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

          </div>

        )}

      </section>

    </main>
  );
}














