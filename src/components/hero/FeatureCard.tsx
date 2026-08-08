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
    desc: "Real Exam Pattern Practice",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: FileText,
    title: "Previous Year Papers",
    desc: "Detailed Solutions",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Clock3,
    title: "Learn Anytime",
    desc: "Study Anywhere",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export default function FeatureCard() {
  return (
    <section className="relative -mt-16 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-3xl shadow-2xl overflow-hidden">
          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="flex items-center gap-4 p-8 border-r last:border-r-0"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center`}
                >
                  <Icon className={`w-7 h-7 ${item.color}`} />
                </div>

                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}