"use client";

import { featuredCourse, otherCourses } from "./courseData";
import FeaturedCourseCard from "./FeaturedCourseCard";
import SmallCourseCard from "./SmallCourseCard";

export default function FeaturedCourses() {
  return (
    <section className="relative bg-gradient-to-b from-white via-[#fffdfa] to-[#fff8f0] py-24">
      <div className="mx-auto max-w-7xl px-6">

        {/* Section Heading */}
        <div className="mb-16 text-center">

          <span className="inline-block rounded-full bg-red-50 px-4 py-1 text-sm font-semibold uppercase tracking-widest text-red-600">
            Featured Courses
          </span>

          <h2 className="mt-6 text-5xl font-black tracking-tight text-slate-900">
            Choose Your Promotion Path
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Premium India Post promotion courses designed for every stage of
            your career—from GDS to PS Group 'B'.
          </p>

        </div>

        {/* Featured Course */}
        <FeaturedCourseCard course={featuredCourse} />

        {/* Other Courses */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">

          {otherCourses.map((course) => (
            <SmallCourseCard
              key={course.id}
              course={course}
            />
          ))}

        </div>

      </div>
    </section>
  );
}