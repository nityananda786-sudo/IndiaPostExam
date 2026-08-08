import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";

export default function HeroLeft() {
  return (
    <div className="max-w-xl">

      {/* Badge */}
      <div className="inline-block rounded-full bg-red-50 px-5 py-2 mb-6">
        <p className="text-red-600 font-semibold uppercase tracking-[0.18em] text-sm">
          BUILD YOUR CAREER IN INDIA POST
        </p>
      </div>

      {/* Heading */}
      <h1 className="text-6xl font-extrabold leading-tight text-slate-900">
        One Platform.
        <span className="block text-red-600">
          Every Promotion.
        </span>
      </h1>

      {/* Description */}
      <p className="mt-8 text-xl leading-10 text-slate-600">
        From GDS to Group 'B' – Premium courses, mock tests,
        previous year papers and complete study materials for
        every stage of your India Post career.
      </p>

      {/* Buttons */}
      <div className="flex gap-6 mt-10">

        <Link
          href="/courses"
          className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-8 py-5 shadow-xl flex items-center gap-4 transition"
        >
          <BookOpen size={32} />
          <div>
            <div className="font-bold text-lg">
              Explore Courses
            </div>
            <div className="text-sm opacity-90">
              Premium Content
            </div>
          </div>
        </Link>

        <Link
          href="/free"
          className="border-2 border-slate-300 hover:border-red-600 rounded-2xl px-8 py-5 flex items-center gap-4 transition"
        >
          <GraduationCap
            size={34}
            className="text-slate-700"
          />

          <div>
            <div className="font-bold text-lg text-slate-800">
              Start Learning Free
            </div>

            <div className="text-sm text-slate-500">
              Free Study Materials
            </div>
          </div>
        </Link>

      </div>

    </div>
  );
}