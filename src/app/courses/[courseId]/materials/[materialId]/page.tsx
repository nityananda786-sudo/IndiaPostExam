"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import { courses } from "@/components/featured-courses/courseData";
import {
  getCourseMaterials,
} from "@/components/course-content/courseMaterials";


type Material = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  url?: string;
};


type Subject = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  materials?: Material[];
};


type CourseMaterials = {
  courseId: string;
  subjects: Subject[];
};


export default function ProtectedMaterialPage() {

  const params = useParams();
  const router = useRouter();

  const courseId =
    params.courseId as string;

  const materialId =
    params.materialId as string;


  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [hasAccess, setHasAccess] =
    useState(false);

  const [material, setMaterial] =
    useState<Material | null>(null);

  const [subject, setSubject] =
    useState<Subject | null>(null);

  const [allMaterials, setAllMaterials] =
    useState<Material[]>([]);

  const [error, setError] =
    useState("");


  const course =
    courses[courseId];


  // =====================================================
  // VERIFY ACCESS + LOAD MATERIAL
  // =====================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {

          if (!currentUser) {

            router.replace("/login");

            return;
          }

          setUser(currentUser);


          try {

            if (!course) {

              setError(
                "The requested course does not exist."
              );

              setLoading(false);

              return;
            }


            // =================================================
            // CHECK PURCHASE
            // =================================================

            const purchasesQuery =
              query(
                collection(db, "purchases"),

                where(
                  "uid",
                  "==",
                  currentUser.uid
                ),

                where(
                  "courseId",
                  "==",
                  courseId
                )
              );


            const purchasesSnapshot =
              await getDocs(
                purchasesQuery
              );


            const now =
              new Date();


            const activePurchase =
              purchasesSnapshot.docs.some(
                (purchaseDoc) => {

                  const data =
                    purchaseDoc.data();


                  if (
                    data.status !== "paid"
                  ) {
                    return false;
                  }


                  if (!data.expiresAt) {
                    return true;
                  }


                  const expiry =
                    data.expiresAt?.toDate
                      ? data.expiresAt.toDate()
                      : new Date(
                          data.expiresAt
                        );


                  return expiry > now;

                }
              );


            if (!activePurchase) {

              setHasAccess(false);

              setError(
                "You do not have active access to this course."
              );

              setLoading(false);

              return;
            }


            setHasAccess(true);


            // =================================================
            // LOAD COURSE MATERIALS
            // =================================================

            const courseMaterials =
              getCourseMaterials(
                courseId
              ) as CourseMaterials | null;


            if (!courseMaterials) {

              setError(
                "Course materials are not available."
              );

              setLoading(false);

              return;
            }


            // =================================================
            // FIND SUBJECT + MATERIAL
            // =================================================

            let foundMaterial:
              Material | null = null;

            let foundSubject:
              Subject | null = null;


            let flattenedMaterials:
              Material[] = [];


            for (
              const currentSubject
              of courseMaterials.subjects || []
            ) {

              const materials =
                currentSubject.materials || [];


              flattenedMaterials = [
                ...flattenedMaterials,
                ...materials,
              ];


              const currentMaterial =
                materials.find(
                  (item) =>
                    item.id === materialId
                );


              if (currentMaterial) {

                foundMaterial =
                  currentMaterial;

                foundSubject =
                  currentSubject;

              }

            }


            setAllMaterials(
              flattenedMaterials
            );


            if (!foundMaterial) {

              setError(
                "The requested study material was not found."
              );

              setLoading(false);

              return;
            }


            setMaterial(
              foundMaterial
            );

            setSubject(
              foundSubject
            );


          } catch (err) {

            console.error(
              "Unable to load protected material:",
              err
            );

            setError(
              "Unable to load this study material."
            );

          } finally {

            setLoading(false);

          }

        }
      );


    return () =>
      unsubscribe();

  }, [
    courseId,
    materialId,
    router,
  ]);


  // =====================================================
  // INVALID COURSE
  // =====================================================

  if (!course) {

    return (

      <main className="min-h-screen bg-slate-50 px-4 py-16">

        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#102f63]">
            Course Not Found
          </h1>

          <p className="mt-3 text-slate-500">
            The requested course does not exist.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/courses")
            }
            className="mt-6 rounded-xl bg-[#123b78] px-6 py-3 font-bold text-white"
          >
            ← Back to Courses
          </button>

        </div>

      </main>

    );

  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#123b78]" />

          <p className="mt-4 text-sm font-semibold text-slate-600">
            Opening study material...
          </p>

        </div>

      </main>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (
    error ||
    !hasAccess ||
    !material
  ) {

    return (

      <main className="min-h-screen bg-slate-50 px-4 py-16">

        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#102f63]">
            Material Unavailable
          </h1>

          <p className="mt-3 text-slate-600">
            {error ||
              "This study material is not available."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/courses/${courseId}`
              )
            }
            className="mt-6 rounded-xl bg-[#123b78] px-6 py-3 font-bold text-white"
          >
            ← Back to Course
          </button>

        </div>

      </main>

    );

  }


  // =====================================================
  // PREVIOUS / NEXT MATERIAL
  // =====================================================

  const currentIndex =
    allMaterials.findIndex(
      (item) =>
        item.id === materialId
    );


  const previousMaterial =
    currentIndex > 0
      ? allMaterials[
          currentIndex - 1
        ]
      : null;


  const nextMaterial =
    currentIndex >= 0 &&
    currentIndex <
      allMaterials.length - 1
      ? allMaterials[
          currentIndex + 1
        ]
      : null;


  // =====================================================
  // MAIN VIEW
  // =====================================================

  return (

    <main className="min-h-screen bg-[#f7f9fc]">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="bg-[#102f63] text-white">

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/courses/${courseId}`
              )
            }
            className="text-sm font-semibold text-blue-100 hover:text-white"
          >
            ← Back to Course
          </button>


          <div className="mt-5">

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
              {course.title}
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {material.title}
            </h1>

            {subject && (

              <p className="mt-2 text-sm text-blue-100">
                {subject.title}
              </p>

            )}

          </div>

        </div>

      </header>


      {/* =================================================
          MATERIAL CONTENT
      ================================================= */}

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* MATERIAL HEADER */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                📖
              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Study Material
                </p>

                <h2 className="mt-1 text-xl font-black text-[#102f63]">
                  {material.title}
                </h2>

                {material.description && (

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {material.description}
                  </p>

                )}

              </div>

            </div>


            <span className="inline-flex w-fit shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              ✓ Protected
            </span>

          </div>


          {/* =================================================
              VIEW MATERIAL
          ================================================= */}

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
              📄
            </div>

            <h3 className="mt-4 text-lg font-black text-[#102f63]">
              Ready to Study?
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              Open this study material in a new tab.
              Your course access has already been verified.
            </p>


            {material.url ? (

              <a
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#123b78] px-7 py-3 font-bold text-white transition hover:bg-[#092b61]"
              >
                Open Material →
              </a>

            ) : (

              <div className="mt-5 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-slate-500">
                This material has not been uploaded yet.
              </div>

            )}

          </div>


          {/* =================================================
              NAVIGATION
          ================================================= */}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            {previousMaterial ? (

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/courses/${courseId}/materials/${previousMaterial.id}`
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-[#123b78] hover:text-[#123b78]"
              >
                ← Previous
              </button>

            ) : (

              <div />

            )}


            <span className="text-center text-xs font-semibold text-slate-400">
              Material{" "}
              {currentIndex + 1}{" "}
              of{" "}
              {allMaterials.length}
            </span>


            {nextMaterial ? (

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/courses/${courseId}/materials/${nextMaterial.id}`
                  )
                }
                className="rounded-xl bg-[#123b78] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#092b61]"
              >
                Next →
              </button>

            ) : (

              <div />

            )}

          </div>


          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">

            <span className="font-bold">
              🛡️ Protected Course Material
            </span>

            <p className="mt-1 text-xs leading-5">
              This material is available only to students
              with active access to this course.
            </p>

          </div>

        </div>

      </section>

    </main>

  );
}