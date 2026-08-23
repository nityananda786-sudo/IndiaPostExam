import JourneyStep from "./JourneyStep";

const journey = [
  {
    title: "GDS",
    icon: "/icons/gds.svg",
  },
  {
    title: "MTS",
    icon: "/icons/mts.svg",
  },
  {
    title: "Postman\nMail Guard",
    icon: "/icons/postman.svg",
  },
  {
    title: "Postal Assistant\nSorting Assistant",
    icon: "/icons/pa.svg",
  },
  {
    title: "Inspector Posts\n(LDCE)",
    icon: "/icons/inspector.svg",
  },
  {
    title: "PSS Group 'B'",
    icon: "/icons/psb.svg",
  },
];

export default function CareerJourney() {
  return (
    <section className="py-24 bg-white">

      <div className="max-w-7xl mx-auto px-6">

        {/* Heading */}

        <div className="text-center mb-20">

          <div className="flex items-center justify-center gap-5">

            <div className="w-24 h-[2px] bg-red-600"></div>

            <p className="uppercase tracking-[0.25em] text-red-600 font-bold text-sm">
              Your Career Path
            </p>

            <div className="w-24 h-[2px] bg-red-600"></div>

          </div>

          <h2 className="text-5xl font-bold text-slate-900 mt-6">
            Promotion Journey
          </h2>

          <p className="text-gray-500 mt-5 text-lg">
            Every promotion starts with one step.
          </p>

        </div>

        {/* Timeline */}

        <div className="overflow-x-auto">

          <div className="flex justify-center min-w-max">

            {journey.map((item, index) => (

              <JourneyStep
                key={index}
                title={item.title}
                icon={item.icon}
                last={index === journey.length - 1}
              />

            ))}

          </div>

        </div>

      </div>

    </section>
  );
}