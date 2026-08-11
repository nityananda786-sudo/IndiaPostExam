"use client";

import { useState } from "react";

import type {
  CourseMaterials,
  CourseSubject,
  CourseMaterial,
} from "./courseMaterials";


// ============================================================
// PROPS
// ============================================================

type StudyMaterialsProps = {
  course: CourseMaterials;
};


// ============================================================
// STUDY MATERIALS COMPONENT
// ============================================================

export default function StudyMaterials({
  course,
}: StudyMaterialsProps) {

  const [selectedSubject, setSelectedSubject] =
    useState<CourseSubject | null>(null);


  // ==========================================================
  // MATERIAL VIEW
  // ==========================================================

  if (selectedSubject) {
    return (
      <section className="mt-8">

        {/* Back */}
        <button
          type="button"
          onClick={() => setSelectedSubject(null)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#12366f] transition hover:text-red-600"
        >
          ← Back to Subjects
        </button>


        {/* Subject Header */}
        <div className="rounded-3xl bg-gradient-to-r from-[#123b78] to-[#092b61] p-6 text-white shadow-lg sm:p-7">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl backdrop-blur-sm">
              {selectedSubject.icon}
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
                Study Materials
              </p>

              <h3 className="mt-1 text-2xl font-black">
                {selectedSubject.title}
              </h3>

              <p className="mt-1 text-sm leading-6 text-blue-100">
                {selectedSubject.description}
              </p>

            </div>

          </div>

        </div>


        {/* Materials */}
        <div className="mt-6 space-y-3">

          {selectedSubject.materials.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">

              <div className="text-3xl">
                📚
              </div>

              <h4 className="mt-3 font-extrabold text-[#12366f]">
                No materials available yet
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Study materials for this subject will be added soon.
              </p>

            </div>

          ) : (

            selectedSubject.materials.map(
              (material) => (
                <MaterialRow
                  key={material.id}
                  material={material}
                />
              )
            )

          )}

        </div>

      </section>
    );
  }


  // ==========================================================
  // SUBJECT LIST
  // ==========================================================

  return (
    <section className="mt-8">

      {/* Section Heading */}
      <div className="mb-6">

        <div className="flex items-center gap-3">

          <span className="h-8 w-1.5 rounded-full bg-red-600" />

          <div>

            <h3 className="text-2xl font-black text-[#102f63]">
              Study Materials
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select a subject to access your preparation materials.
            </p>

          </div>

        </div>

      </div>


      {/* Subject Grid */}
      {course.subjects.length === 0 ? (

        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

          <div className="text-4xl">
            📚
          </div>

          <h3 className="mt-4 text-lg font-extrabold text-[#12366f]">
            Study materials coming soon
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Course materials are being prepared and will be
            available here shortly.
          </p>

        </div>

      ) : (

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {course.subjects.map(
            (subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onOpen={() =>
                  setSelectedSubject(subject)
                }
              />
            )
          )}

        </div>

      )}

    </section>
  );
}


// ============================================================
// SUBJECT CARD
// ============================================================

function SubjectCard({
  subject,
  onOpen,
}: {
  subject: CourseSubject;
  onOpen: () => void;
}) {

  const materialCount =
    subject.materials.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
    >

      <div className="flex items-start justify-between gap-4">

        {/* Icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl transition group-hover:bg-blue-100">
          {subject.icon}
        </div>


        {/* Arrow */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-red-50 group-hover:text-red-600">
          →
        </div>

      </div>


      {/* Subject */}
      <h4 className="mt-5 text-lg font-black text-[#102f63]">
        {subject.title}
      </h4>


      {/* Description */}
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
        {subject.description}
      </p>


      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

        <span className="text-xs font-bold text-slate-500">
          {materialCount}{" "}
          {materialCount === 1
            ? "Material"
            : "Materials"}
        </span>

        <span className="text-xs font-extrabold text-red-600">
          Open →
        </span>

      </div>

    </button>
  );
}


// ============================================================
// MATERIAL ROW
// ============================================================

function MaterialRow({
  material,
}: {
  material: CourseMaterial;
}) {

  const isLocked =
    material.locked === true;

  const typeLabel =
    material.type === "pdf"
      ? "PDF"
      : material.type === "video"
      ? "VIDEO"
      : "DOCUMENT";

  const typeIcon =
    material.type === "pdf"
      ? "📄"
      : material.type === "video"
      ? "▶️"
      : "📝";


  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">

      {/* Left */}
      <div className="flex min-w-0 items-center gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">
          {typeIcon}
        </div>


        <div className="min-w-0">

          <h4 className="truncate font-extrabold text-[#102f63]">
            {material.title}
          </h4>

          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {material.description}
          </p>

          <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            {typeLabel}
          </span>

        </div>

      </div>


      {/* Action */}
      {isLocked ? (

        <button
          type="button"
          disabled
          className="shrink-0 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-400"
        >
          🔒 Locked
        </button>

      ) : (

        <a
          href={
            material.url === "#"
              ? undefined
              : material.url
          }
          target={
            material.url === "#"
              ? undefined
              : "_blank"
          }
          rel={
            material.url === "#"
              ? undefined
              : "noopener noreferrer"
          }
          onClick={(event) => {

            if (material.url === "#") {
              event.preventDefault();
            }

          }}
          className={`shrink-0 rounded-xl px-5 py-3 text-center text-sm font-extrabold transition ${
            material.url === "#"
              ? "cursor-not-allowed bg-slate-100 text-slate-400"
              : "bg-red-600 text-white shadow-sm hover:bg-red-700"
          }`}
        >
          {material.url === "#"
            ? "Coming Soon"
            : "Open →"}
        </a>

      )}

    </div>
  );
}