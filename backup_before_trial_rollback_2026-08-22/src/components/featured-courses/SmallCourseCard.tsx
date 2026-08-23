import Image from "next/image";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function SmallCourseCard({ course }: any) {
  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        bg-white
        border
        border-slate-200
        shadow-md
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
        duration-300
      "
    >
      {/* Soft Accent */}
      <div
        className="
          absolute
          -top-20
          -right-20
          w-40
          h-40
          rounded-full
          bg-red-50
          blur-3xl
        "
      />

      {/* Course Image */}
      <div className="relative h-48 overflow-hidden bg-slate-50">
        <Image
          src={course.image}
          alt={course.title}
          fill
          className="
            object-cover
            transition-transform
            duration-500
            group-hover:scale-105
          "
        />

        {/* Badge */}
        <div
          className="
            absolute
            top-4
            left-4
            rounded-full
            bg-white/90
            backdrop-blur-sm
            px-3
            py-1
            text-xs
            font-bold
            text-red-600
            shadow-sm
          "
        >
          PROMOTION COURSE
        </div>
      </div>

      {/* Content */}
      <div className="relative p-6">

        <h3 className="text-xl font-bold leading-snug text-slate-900">
          {course.title}
        </h3>

        <div className="mt-5 space-y-2">

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle
              size={16}
              className="text-red-500 shrink-0"
            />
            Complete Syllabus
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle
              size={16}
              className="text-red-500 shrink-0"
            />
            Previous Year Questions
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle
              size={16}
              className="text-red-500 shrink-0"
            />
            Mock Tests
          </div>

        </div>

        {/* Bottom */}
        <div className="mt-7 flex items-center justify-between">

          <div>
            <p className="text-xs text-slate-400">
              Starting from
            </p>

            <p className="text-2xl font-black text-slate-900">
              ₹499
            </p>
          </div>

          <button
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-red-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              shadow-md
              hover:bg-red-700
              hover:shadow-lg
              transition-all
            "
          >
            Explore
            <ArrowRight size={16} />
          </button>

        </div>

      </div>
    </div>
  );
}