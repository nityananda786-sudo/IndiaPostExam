import {
  BookOpen,
  ClipboardCheck,
  FileText,
  Clock3,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Expert Study Materials",
    desc: "Syllabus based quality content",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: ClipboardCheck,
    title: "Mock Tests",
    desc: "Real exam pattern practice",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: FileText,
    title: "Previous Year Papers",
    desc: "With detailed explanations",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    icon: Clock3,
    title: "Learn Anytime Anywhere",
    desc: "Study on any device",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export default function Features() {
  return (
    <section className="relative -mt-28 z-30">
      <div className="max-w-7xl mx-auto px-6 relative">

        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

            {features.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className={`p-8 hover:bg-gray-50 transition-all duration-300 ${
                    index !== features.length - 1
                      ? "border-b md:border-b lg:border-b-0 lg:border-r border-gray-100"
                      : ""
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl ${item.bg} flex items-center justify-center mb-6`}
                  >
                    <Icon className={`w-8 h-8 ${item.color}`} />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-gray-600 leading-7">
                    {item.desc}
                  </p>

                </div>
              );
            })}

          </div>

        </div>

      </div>
    </section>
  );
}