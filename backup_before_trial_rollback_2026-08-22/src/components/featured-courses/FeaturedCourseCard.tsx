import Image from "next/image";
import {
  CheckCircle,
  ArrowRight,
  Star,
} from "lucide-react";

export default function FeaturedCourseCard({ course }: any) {
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
        shadow-xl
        hover:shadow-2xl
        transition-all
        duration-500
      "
    >
      {/* Background Glow */}
      <div
        className="
          absolute
          -top-24
          -right-24
          h-64
          w-64
          rounded-full
          bg-red-100/50
          blur-3xl
        "
      />

      <div className="relative grid lg:grid-cols-2 gap-10 p-10">

        {/* LEFT */}
        <div>

          <span
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-red-50
              px-4
              py-2
              text-sm
              font-semibold
              text-red-600
            "
          >
            <Star size={16} fill="currentColor" />
            {course.badge}
          </span>

          <h3 className="mt-6 text-4xl font-black text-slate-900 leading-tight">
            {course.title}
          </h3>

          <p className="mt-5 text-slate-600 leading-8">
            {course.description}
          </p>

          <div className="mt-8 space-y-4">

            {course.features.map((feature: string) => (
              <div
                key={feature}
                className="flex items-center gap-3"
              >
                <CheckCircle
                  size={20}
                  className="text-red-500"
                />

                <span className="text-slate-700">
                  {feature}
                </span>

              </div>
            ))}

          </div>

          <div className="mt-10 flex items-end gap-4">

            <span className="text-5xl font-black text-red-600">
              {course.price}
            </span>

            <span className="text-2xl line-through text-slate-400">
              {course.oldPrice}
            </span>

          </div>

          <div className="mt-10 flex gap-4">

            <button
              className="
                rounded-xl
                bg-red-600
                px-7
                py-4
                text-white
                font-semibold
                shadow-lg
                hover:bg-red-700
                hover:-translate-y-1
                transition-all
              "
            >
              Enroll Now
            </button>

            <button
              className="
                rounded-xl
                border
                border-slate-300
                px-7
                py-4
                font-semibold
                hover:bg-slate-50
                transition-all
              "
            >
              Preview

              <ArrowRight
                size={18}
                className="inline ml-2"
              />

            </button>

          </div>

        </div>

        {/* RIGHT */}

        <div className="flex items-center justify-center">

          <Image
            src={course.image}
            alt={course.title}
            width={700}
            height={500}
            className="
              w-full
              max-w-md
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />

        </div>

      </div>

    </div>
  );
}