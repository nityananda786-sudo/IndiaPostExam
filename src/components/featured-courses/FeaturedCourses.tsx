import { featuredCourse, otherCourses } from "./courseData";
import FeaturedCourseCard from "./FeaturedCourseCard";
import SmallCourseCard from "./SmallCourseCard";

export default function FeaturedCourses() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-white via-[#fffdfa] to-[#fff8f0]">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section Heading */}
        <div className="text-center mb-16">

          <span className="inline-block px-4 py-1 rounded-full bg-red-50 text-red-600 text-sm font-semibold tracking-widest uppercase">
            Featured Courses
          </span>

          <h2 className="mt-6 text-5xl font-black tracking-tight text-slate-900">
            Choose Your Promotion Path
          </h2>

          <p className="mt-5 text-lg text-slate-600 max-w-3xl mx-auto leading-8">
            Premium India Post promotion courses designed for every stage of
            your career—from GDS to PS Group 'B'.
          </p>

        </div>

        {/* Featured Course */}
        <FeaturedCourseCard course={featuredCourse} />

        {/* Other Courses */}
        <div className="grid lg:grid-cols-3 gap-8 mt-10">

          {otherCourses.map((course) => (
            <SmallCourseCard
              key={course.title}
              course={course}
            />
          ))}

        </div>

      </div>
    </section>
  );
}